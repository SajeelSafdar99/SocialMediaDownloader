/**
 * Reset User Subscription Data
 * Removes subscription-related data from a user account for testing purposes
 */

import { db } from "../server/db";
import { users, payments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function resetUserSubscription(userId: number) {
  try {
    console.log(`\n🔄 Resetting subscription data for user ID: ${userId}\n`);

    // 1. Get user info first
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      console.error("❌ User not found!");
      process.exit(1);
    }

    console.log("👤 User Info:");
    console.log("   Email:", user.email);
    console.log("   Username:", user.username);
    console.log("   Is Premium:", user.isPremium);
    console.log("   SafePay Customer ID:", user.safepayCustomerId);
    console.log("   SafePay Merchant Key:", user.safepayMerchantKey);
    console.log("   Premium Expires:", user.premiumExpiresAt);
    console.log("   Subscription Token:", user.safepaySubscriptionToken);

    // 2. Delete user's payments
    const deletedPayments = await db
      .delete(payments)
      .where(eq(payments.userId, userId))
      .returning();

    console.log(`\n💳 Deleted ${deletedPayments.length} payment record(s)`);

    // 3. Reset user subscription fields
    await db
      .update(users)
      .set({
        isPremium: false,
        premiumExpiresAt: null,
        safepayCustomerId: null,
        safepayMerchantKey: null,
        safepayInstrumentToken: null,
        safepayInstrumentSavedAt: null,
        safepaySubscriptionToken: null,
        subscriptionProvider: null,
        subscriptionPlanId: null,
        subscriptionCancelledAt: null,
        subscriptionCancelAtPeriodEnd: false,
      })
      .where(eq(users.id, userId));

    console.log("\n✅ User subscription data reset successfully!");
    console.log("\nℹ️  You can now create a new subscription for this user.");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error resetting subscription:", error);
    process.exit(1);
  }
}

// Get user ID from command line argument
const userId = parseInt(process.argv[2]);

if (!userId || isNaN(userId)) {
  console.error("\n❌ Usage: tsx scripts/reset-user-subscription.ts <userId>\n");
  console.error("Example: tsx scripts/reset-user-subscription.ts 4\n");
  process.exit(1);
}

resetUserSubscription(userId);

