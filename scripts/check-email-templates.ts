/**
 * Check Email Templates
 */

import { db } from "../server/db";
import { emailTemplates, smtpConfig } from "../shared/schema";
import { loadEnv } from "../server/env";

loadEnv();

async function checkTemplates() {
  console.log("📧 Checking Email Templates\n");

  try {
    const templates = await db.select().from(emailTemplates);
    const configs = await db.select().from(smtpConfig);

    console.log(`Found ${templates.length} email templates:`);
    for (const template of templates) {
      console.log(`  - ${template.name}: "${template.subject}" (${template.isActive ? 'Active' : 'Inactive'})`);
    }

    console.log(`\nFound ${configs.length} SMTP configurations`);

    if (templates.length < 3) {
      console.log("\n⚠️  Missing templates! Expected 3 (welcome, forgot_password, subscription)");

      const existing = templates.map(t => t.name);
      const required = ['welcome', 'forgot_password', 'subscription'];
      const missing = required.filter(name => !existing.includes(name));

      if (missing.length > 0) {
        console.log(`Missing: ${missing.join(', ')}`);
        console.log("\n🔧 Adding missing templates...");

        for (const name of missing) {
          if (name === 'welcome') {
            await db.insert(emailTemplates).values({
              name: 'welcome',
              subject: 'Welcome to SaveMedia!',
              htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>Welcome {{username}}!</h1><p>Start at {{appUrl}}</p></body></html>`,
              textContent: 'Welcome {{username}}! Start at {{appUrl}}',
              variables: { username: "User name", appUrl: "App URL" },
              isActive: true,
            });
            console.log("  ✅ Added welcome template");
          } else if (name === 'forgot_password') {
            await db.insert(emailTemplates).values({
              name: 'forgot_password',
              subject: 'Reset Your Password',
              htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>Reset Password</h1><p>Click here: {{resetUrl}}</p></body></html>`,
              textContent: 'Reset at {{resetUrl}}',
              variables: { username: "User name", resetUrl: "Reset URL", expiryHours: "24" },
              isActive: true,
            });
            console.log("  ✅ Added forgot_password template");
          } else if (name === 'subscription') {
            await db.insert(emailTemplates).values({
              name: 'subscription',
              subject: 'Welcome to Premium!',
              htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>Welcome to Premium!</h1><p>Plan: {{planName}}</p></body></html>`,
              textContent: 'Welcome to Premium! Plan: {{planName}}',
              variables: { username: "User", planName: "Plan", amount: "0", billingCycle: "monthly", nextBilling: "date", appUrl: "url" },
              isActive: true,
            });
            console.log("  ✅ Added subscription template");
          }
        }
      }
    } else {
      console.log("\n✅ All templates present!");
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkTemplates();
