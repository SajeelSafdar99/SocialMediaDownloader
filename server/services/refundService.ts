import { db } from "../db";
import { refunds, payments, users } from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertRefund } from "../../shared/schema";
import { refundTransaction as refundSafePayTransaction } from "./safepayTransactionsService";
import { sendRefundCompletedEmail } from "./emailService";

/**
 * Process SafePay refund using SafePay Transactions API
 */
async function processSafePayRefund(
  transactionId: string,
  amount: number,
  currency: string,
  reason?: string
): Promise<{ ok: boolean; refundId?: string; reason?: string }> {
  try {
    console.log("💰 Processing SafePay refund:", { transactionId, amount, currency, reason });

    // Call SafePay Transactions API to refund
    const result = await refundSafePayTransaction(transactionId);

    if (!result.ok) {
      console.error("❌ SafePay refund failed:", result.error);
      return { ok: false, reason: result.error };
    }

    console.log("✅ SafePay refund successful:", result.transaction?.token);

    return {
      ok: true,
      refundId: result.transaction?.token || `safepay_refund_${Date.now()}`,
    };
  } catch (error: any) {
    console.error("❌ Error processing SafePay refund:", error);
    return { ok: false, reason: error.message };
  }
}

/**
 * Create a refund request
 */
export async function createRefund(opts: {
  paymentId: number;
  userId: number;
  amount: number;
  currency: string;
  reason?: string;
  processedByAdminId?: number;
}): Promise<{ ok: boolean; refundId?: number; reason?: string }> {
  try {
    // Get payment details
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, opts.paymentId))
      .limit(1);

    if (!payment) {
      return { ok: false, reason: "Payment not found" };
    }

    if (payment.status !== "completed") {
      return { ok: false, reason: "Payment is not completed" };
    }

    if (payment.refundedAt) {
      return { ok: false, reason: "Payment already refunded" };
    }

    // Check if refund already exists
    const existingRefund = await db
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.paymentId, opts.paymentId),
          eq(refunds.status, "completed")
        )
      )
      .limit(1);

    if (existingRefund.length > 0) {
      return { ok: false, reason: "Refund already processed" };
    }

    // Create refund record
    const [refund] = await db
      .insert(refunds)
      .values({
        paymentId: opts.paymentId,
        userId: opts.userId,
        amount: opts.amount,
        currency: opts.currency,
        reason: opts.reason,
        status: "pending",
        provider: payment.provider,
        processedByAdminId: opts.processedByAdminId,
      })
      .returning();

    return { ok: true, refundId: refund.id };
  } catch (error) {
    console.error("Create refund error:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Process a refund
 */
export async function processRefund(
  refundId: number,
  adminId: number
): Promise<{ ok: boolean; reason?: string }> {
  try {
    // Get refund details
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.id, refundId))
      .limit(1);

    if (!refund) {
      return { ok: false, reason: "Refund not found" };
    }

    if (refund.status === "completed") {
      return { ok: false, reason: "Refund already completed" };
    }

    // Get payment details
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, refund.paymentId))
      .limit(1);

    if (!payment) {
      return { ok: false, reason: "Payment not found" };
    }

    let providerResult: { ok: boolean; refundId?: string; reason?: string };

    // Process refund with payment provider
    if (payment.provider === "safepay") {
      providerResult = await processSafePayRefund(
        payment.providerTransactionId || payment.transactionId,
        refund.amount,
        refund.currency,
        refund.reason || undefined
      );
    } else {
      return { ok: false, reason: `Unsupported payment provider: ${payment.provider}. Only SafePay is supported.` };
    }

    if (!providerResult.ok) {
      // Update refund status to failed
      await db
        .update(refunds)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(refunds.id, refundId));

      return { ok: false, reason: providerResult.reason };
    }

    // Update refund status to completed
    await db
      .update(refunds)
      .set({
        status: "completed",
        providerRefundId: providerResult.refundId,
        processedByAdminId: adminId,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refunds.id, refundId));

    // Update payment as refunded
    await db
      .update(payments)
      .set({
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, refund.paymentId));

    // Revoke premium status if user has premium
    await db
      .update(users)
      .set({
        isPremium: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, refund.userId));

    return { ok: true };
  } catch (error) {
    console.error("Process refund error:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get refund by ID
 */
export async function getRefund(refundId: number) {
  const [refund] = await db
    .select({
      id: refunds.id,
      paymentId: refunds.paymentId,
      userId: refunds.userId,
      amount: refunds.amount,
      currency: refunds.currency,
      reason: refunds.reason,
      status: refunds.status,
      provider: refunds.provider,
      providerRefundId: refunds.providerRefundId,
      processedByAdminId: refunds.processedByAdminId,
      createdAt: refunds.createdAt,
      updatedAt: refunds.updatedAt,
      completedAt: refunds.completedAt,
      username: users.username,
      email: users.email,
      transactionId: payments.transactionId,
    })
    .from(refunds)
    .leftJoin(users, eq(refunds.userId, users.id))
    .leftJoin(payments, eq(refunds.paymentId, payments.id))
    .where(eq(refunds.id, refundId))
    .limit(1);

  return refund;
}

/**
 * Get all refunds with pagination
 */
export async function getAllRefunds(limit: number = 20, offset: number = 0) {
  const refundsData = await db
    .select({
      id: refunds.id,
      paymentId: refunds.paymentId,
      userId: refunds.userId,
      amount: refunds.amount,
      currency: refunds.currency,
      reason: refunds.reason,
      status: refunds.status,
      provider: refunds.provider,
      providerRefundId: refunds.providerRefundId,
      processedByAdminId: refunds.processedByAdminId,
      createdAt: refunds.createdAt,
      completedAt: refunds.completedAt,
      username: users.username,
      email: users.email,
      transactionId: payments.transactionId,
    })
    .from(refunds)
    .leftJoin(users, eq(refunds.userId, users.id))
    .leftJoin(payments, eq(refunds.paymentId, payments.id))
    .orderBy(desc(refunds.createdAt))
    .limit(limit)
    .offset(offset);

  return refundsData;
}

/**
 * Get refunds by user ID
 */
export async function getRefundsByUserId(userId: number) {
  return await db
    .select()
    .from(refunds)
    .where(eq(refunds.userId, userId))
    .orderBy(desc(refunds.createdAt));
}
