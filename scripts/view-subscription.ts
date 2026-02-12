/**
 * View user subscription status
 * Usage: tsx scripts/view-subscription.ts <user_id>
 */

import { db } from "../server/db";
import { users, payments } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function viewSubscription(userId: number) {
  try {
    console.log(`📊 Subscription Status for User ${userId}\n`);

    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      console.error(`❌ User ${userId} not found`);
      process.exit(1);
    }

    console.log(`👤 User Information:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Created: ${user.createdAt}\n`);

    console.log(`💎 Premium Status:`);
    console.log(`   Is Premium: ${user.isPremium ? '✅ Yes' : '❌ No'}`);
    console.log(`   Premium Expires: ${user.premiumExpiresAt || 'N/A'}`);
    if (user.premiumExpiresAt) {
      const now = new Date();
      const expires = new Date(user.premiumExpiresAt);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   Days Remaining: ${daysLeft > 0 ? daysLeft : 'Expired'}`);
    }
    console.log();

    console.log(`🔐 SafePay Account:`);
    console.log(`   Customer ID: ${user.safepayCustomerId || 'Not created'}`);
    console.log(`   Merchant Key: ${user.safepayMerchantKey ? user.safepayMerchantKey.substring(0, 15) + '...' : 'Not set'}`);
    console.log();

    console.log(`🔄 Subscription Details:`);
    console.log(`   Provider: ${user.subscriptionProvider || 'N/A'}`);
    console.log(`   Plan ID: ${user.subscriptionPlanId || 'N/A'}`);
    console.log(`   Subscription Token: ${user.safepaySubscriptionToken || 'Not created'}`);
    if (user.safepaySubscriptionToken) {
      const tokenType = user.safepaySubscriptionToken.startsWith('sub_') ? '✅ Valid (sub_ prefix)' :
                        user.safepaySubscriptionToken.startsWith('track_') ? '⚠️  Tracker token (not subscription)' :
                        '⚠️  Unknown format';
      console.log(`   Token Type: ${tokenType}`);
    }
    console.log(`   Cancelled At: ${user.subscriptionCancelledAt || 'Not cancelled'}`);
    console.log(`   Cancel at Period End: ${user.subscriptionCancelAtPeriodEnd ? 'Yes' : 'No'}`);
    console.log();

    console.log(`💳 Saved Payment Method:`);
    console.log(`   Instrument Token: ${user.safepayInstrumentToken || 'No card saved'}`);
    if (user.safepayInstrumentToken) {
      const tokenType = user.safepayInstrumentToken.startsWith('card_') ? '✅ Valid card token' : '⚠️  Unknown format';
      console.log(`   Token Type: ${tokenType}`);
    }
    console.log(`   Saved At: ${user.safepayInstrumentSavedAt || 'N/A'}`);
    console.log();

    // Get recent payments
    const recentPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    if (recentPayments.length > 0) {
      console.log(`💰 Recent Payments (last 5):`);
      for (const payment of recentPayments) {
        const statusIcon = payment.status === 'completed' ? '✅' :
                          payment.status === 'pending' ? '⏳' :
                          payment.status === 'failed' ? '❌' : '❓';
        console.log(`   ${statusIcon} ${payment.status.toUpperCase()}`);
        console.log(`      Amount: ${payment.amount} ${payment.currency}`);
        console.log(`      Provider: ${payment.provider}`);
        console.log(`      Transaction: ${payment.transactionId}`);
        console.log(`      Provider TX: ${payment.providerTransactionId || 'N/A'}`);
        console.log(`      Created: ${payment.createdAt}`);

        if (payment.metadata) {
          try {
            const meta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
            if (meta.tracker_token) {
              console.log(`      Tracker: ${meta.tracker_token}`);
            }
            if (meta.mode) {
              console.log(`      Mode: ${meta.mode}`);
            }
          } catch {}
        }
        console.log();
      }
    } else {
      console.log(`💰 No payment history found\n`);
    }

    // Summary
    console.log(`📝 Summary:`);
    if (user.isPremium && user.safepaySubscriptionToken?.startsWith('sub_')) {
      console.log(`   ✅ Active subscription with valid token`);
    } else if (user.isPremium && user.safepaySubscriptionToken) {
      console.log(`   ⚠️  Premium active but subscription token may be invalid`);
      console.log(`      Expected: sub_xxx format, Got: ${user.safepaySubscriptionToken}`);
    } else if (user.isPremium) {
      console.log(`   ⚠️  Premium active but no subscription token`);
    } else {
      console.log(`   ℹ️  No active premium subscription`);
    }

    if (user.safepayInstrumentToken) {
      console.log(`   ✅ Payment method saved for recurring billing`);
    } else {
      console.log(`   ℹ️  No saved payment method`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error:`, error);
    process.exit(1);
  }
}

// Get user ID from command line
const userId = parseInt(process.argv[2]);

if (!userId || isNaN(userId)) {
  console.error(`❌ Usage: tsx scripts/view-subscription.ts <user_id>`);
  console.log(`\nExample: tsx scripts/view-subscription.ts 4`);
  process.exit(1);
}

viewSubscription(userId);

