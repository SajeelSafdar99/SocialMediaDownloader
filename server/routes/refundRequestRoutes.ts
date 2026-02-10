/**
 * Public Refund Request Routes
 * For users to submit refund requests from main app
 */

import type { Express } from "express";
import { db } from "../db";
import { refunds, payments, users } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "../services/activityLogService";
import { sendRefundRequestEmail, sendRefundConfirmationEmail } from "../services/emailService";

export function registerRefundRequestRoutes(app: Express) {

  /**
   * Submit refund request from main app
   * POST /api/refund-request
   */
  app.post("/api/refund-request", async (req: any, res) => {
    try {
      const { userId, paymentId, transactionId, amount, reason, additionalDetails } = req.body;

      if (!userId || !paymentId || !amount || !reason) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields: userId, paymentId, amount, reason"
        });
      }

      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      // Get payment details
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, parseInt(paymentId)))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ ok: false, error: "Payment not found" });
      }

      if (payment.refundedAt) {
        return res.status(400).json({ ok: false, error: "Payment already refunded" });
      }

      // Create refund request with pending status
      const [refund] = await db
        .insert(refunds)
        .values({
          userId: parseInt(userId),
          paymentId: parseInt(paymentId),
          amount: payment.amount,
          currency: payment.currency,
          reason: reason,
          status: 'pending',
          provider: payment.provider,
          metadata: JSON.stringify({
            transactionId: transactionId || null,
            additionalDetails: additionalDetails || null,
            submittedAt: new Date().toISOString(),
            submittedFrom: 'main_app',
          }),
        })
        .returning();

      // Send email notification to admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'support@vidgrabber.online';
        await sendRefundRequestEmail(
          adminEmail,
          user.username || 'User',
          user.email,
          payment.id,
          payment.amount,
          payment.currency,
          reason,
          additionalDetails || ''
        );
        console.log('📧 Refund request email sent to admin');
      } catch (emailError) {
        console.error('❌ Failed to send refund request email to admin:', emailError);
        // Don't fail the request if email fails
      }

      // Send confirmation email to user
      try {
        if (user.email) {
          await sendRefundConfirmationEmail(
            user.email,
            user.username || 'User',
            payment.id,
            payment.amount,
            payment.currency,
            reason
          );
          console.log('📧 Refund confirmation email sent to user');
        }
      } catch (emailError) {
        console.error('❌ Failed to send refund confirmation email to user:', emailError);
        // Don't fail the request if email fails
      }

      // Log activity
      await logActivity({
        userId: parseInt(userId),
        action: 'create',
        resource: 'refund_request',
        resourceId: refund.id,
        description: `User submitted refund request for $${(payment.amount / 100).toFixed(2)}`,
        method: 'POST',
        endpoint: '/api/refund-request',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        success: true,
      });

      res.json({
        ok: true,
        refund,
        message: 'Refund request submitted successfully. We will review it within 2-3 business days.'
      });
    } catch (error: any) {
      console.error("Submit refund request error:", error);

      // Log failed attempt
      await logActivity({
        userId: req.body.userId ? parseInt(req.body.userId) : undefined,
        action: 'create',
        resource: 'refund_request',
        description: `Failed to submit refund request`,
        method: 'POST',
        endpoint: '/api/refund-request',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: error.message,
      });

      res.status(500).json({ ok: false, error: "Failed to submit refund request" });
    }
  });

  /**
   * Get user's refund requests
   * GET /api/user/refund-requests
   */
  app.get("/api/user/refund-requests", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const userRefunds = await db
        .select()
        .from(refunds)
        .where(eq(refunds.userId, req.user.id))
        .orderBy(desc(refunds.createdAt));

      res.json({ ok: true, refunds: userRefunds });
    } catch (error) {
      console.error("Get user refund requests error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
