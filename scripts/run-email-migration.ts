/**
 * Run Email Templates Migration
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { loadEnv } from "../server/env";

loadEnv();

async function runMigration() {
  console.log("🔧 Running Email Templates Migration\n");

  try {
    // Check if tables already exist
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('email_templates', 'smtp_config')
    `);

    console.log("Existing tables:", tablesCheck.rows);

    // Create email_templates table
    console.log("\n📧 Creating email_templates table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ email_templates table created");

    // Create smtp_config table
    console.log("\n📨 Creating smtp_config table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS smtp_config (
        id SERIAL PRIMARY KEY,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        secure BOOLEAN DEFAULT true,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ smtp_config table created");

    // Insert default templates
    console.log("\n✉️  Inserting default email templates...");

    // Check if templates already exist
    const existingTemplates = await db.execute(sql`SELECT COUNT(*) as count FROM email_templates`);
    const templateCount = parseInt(existingTemplates.rows[0].count as string);

    if (templateCount === 0) {
      // Import the insert function
      const { emailTemplates } = await import("../shared/schema");

      // Welcome template
      await db.insert(emailTemplates).values({
        name: 'welcome',
        subject: 'Welcome to SaveMedia!',
        htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#ffffff;padding:30px;border:1px solid #e0e0e0}.button{display:inline-block;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;padding:20px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>Welcome to SaveMedia!</h1></div><div class="content"><h2>Hi {{username}}!</h2><p>Thank you for joining SaveMedia! We are excited to have you on board.</p><p>With your account, you can:</p><ul><li>Download videos from Instagram, TikTok, YouTube and more</li><li>Save your download history</li><li>Access premium features (with subscription)</li><li>Get priority support</li></ul><a href="{{appUrl}}" class="button">Start Downloading Now</a><p>If you have any questions, feel free to reply to this email or contact our support team.</p><p>Best regards,<br>The SaveMedia Team</p></div><div class="footer"><p>&copy; 2026 SaveMedia. All rights reserved.</p><p>{{appUrl}}</p></div></div></body></html>`,
        textContent: 'Hi {{username}}! Welcome to SaveMedia! Thank you for joining us. Start downloading now at {{appUrl}}',
        variables: { username: "User name", appUrl: "Application URL" },
        isActive: true,
      });

      // Password reset template
      await db.insert(emailTemplates).values({
        name: 'forgot_password',
        subject: 'Reset Your Password',
        htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#ffffff;padding:30px;border:1px solid#e0e0e0}.button{display:inline-block;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.warning{background:#fff3cd;border-left:4px solid#ffc107;padding:15px;margin:20px 0}.footer{text-align:center;padding:20px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>Password Reset Request</h1></div><div class="content"><h2>Hi {{username}}!</h2><p>We received a request to reset your password. Click the button below to create a new password:</p><a href="{{resetUrl}}" class="button">Reset Password</a><p>This link will expire in {{expiryHours}} hours.</p><div class="warning"><strong>Security Note:</strong> If you did not request this password reset, please ignore this email or contact our support team immediately.</div><p>Best regards,<br>The SaveMedia Team</p></div><div class="footer"><p>&copy; 2026 SaveMedia. All rights reserved.</p></div></div></body></html>`,
        textContent: 'Hi {{username}}! Reset your password at {{resetUrl}}. This link expires in {{expiryHours}} hours.',
        variables: { username: "User name", resetUrl: "Password reset URL", expiryHours: "Expiry hours" },
        isActive: true,
      });

      // Subscription template
      await db.insert(emailTemplates).values({
        name: 'subscription',
        subject: 'Welcome to Premium!',
        htmlContent: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.premium-badge{background:#ffd700;color:#333;padding:5px 15px;border-radius:20px;display:inline-block;font-weight:bold}.features{background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0}.button{display:inline-block;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;padding:20px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🎉 Welcome to Premium!</h1><p class="premium-badge">PREMIUM MEMBER</p></div><div class="content"><h2>Hi {{username}}!</h2><p>Thank you for subscribing to SaveMedia Premium! Your subscription is now active.</p><div class="features"><h3>Your Premium Benefits:</h3><ul><li>✅ Unlimited downloads</li><li>✅ HD quality downloads</li><li>✅ No ads</li><li>✅ Priority support</li><li>✅ Exclusive features</li></ul></div><p><strong>Subscription Details:</strong></p><ul><li>Plan: {{planName}}</li><li>Amount: ${{amount}}</li><li>Billing Cycle: {{billingCycle}}</li><li>Next Billing: {{nextBilling}}</li></ul><a href="{{appUrl}}" class="button">Start Using Premium Features</a><p>Questions? Contact us anytime at support@savemedia.app</p><p>Best regards,<br>The SaveMedia Team</p></div><div class="footer"><p>&copy; 2026 SaveMedia. All rights reserved.</p></div></div></body></html>`,
        textContent: 'Hi {{username}}! Welcome to SaveMedia Premium! Your subscription is active. Plan: {{planName}}, Amount: ${{amount}}',
        variables: { username: "User name", planName: "Plan name", amount: "Amount", billingCycle: "Billing cycle", nextBilling: "Next billing date", appUrl: "App URL" },
        isActive: true,
      });

      console.log("✅ Default templates inserted");
    } else {
      console.log(`⚠️  ${templateCount} templates already exist, skipping insert`);
    }

    console.log("\n✅ Migration completed successfully!\n");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

runMigration();
