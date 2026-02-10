/**
 * Initialize Email Templates
 * Re-creates email templates if they're missing
 */

import { db } from "../server/db";
import { emailTemplates } from "../shared/schema";
import { loadEnv } from "../server/env";
import { eq } from "drizzle-orm";

loadEnv();

const templates = [
  {
    name: 'welcome',
    subject: 'Welcome to VidGrabber!',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to VidGrabber!</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>Thank you for joining VidGrabber! We're excited to have you on board.</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Download videos from Instagram, TikTok, YouTube and more</li>
        <li>Save your download history</li>
        <li>Access premium features (with subscription)</li>
        <li>Get priority support</li>
      </ul>
      <a href="{{appUrl}}" class="button">Start Downloading Now</a>
      <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
      <p>{{appUrl}}</p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Hi {{username}}! Welcome to VidGrabber! Thank you for joining us. Start downloading now at {{appUrl}}',
    variables: { username: "User's name", appUrl: "Application URL" },
    isActive: true
  },
  {
    name: 'forgot_password',
    subject: 'Reset Your Password',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      <p>This link will expire in {{expiryHours}} hours.</p>
      <div class="warning">
        <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
      </div>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Hi {{username}}! Reset your password at {{resetUrl}}. Link expires in {{expiryHours}} hours.',
    variables: { username: "User's name", resetUrl: "Password reset URL", expiryHours: "Link expiry hours" },
    isActive: true
  },
  {
    name: 'subscription',
    subject: 'Welcome to Premium!',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .premium-features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #ffd700; color: #333; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Premium!</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>Congratulations! Your Premium subscription is now active.</p>
      <div class="premium-features">
        <h3>Your Premium Benefits:</h3>
        <ul>
          <li>✅ Unlimited downloads per day</li>
          <li>✅ 4K video quality downloads</li>
          <li>✅ No watermarks on videos</li>
          <li>✅ Priority customer support</li>
          <li>✅ Faster download speeds</li>
        </ul>
      </div>
      <p><strong>Plan:</strong> {{planName}}</p>
      <p><strong>Expires:</strong> {{expiryDate}}</p>
      <a href="{{appUrl}}" class="button">Start Using Premium Features</a>
      <p>Thank you for supporting VidGrabber!</p>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
      <p><a href="{{appUrl}}/profile">Manage Your Subscription</a></p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Hi {{username}}! Your Premium subscription is now active. Plan: {{planName}}, Expires: {{expiryDate}}. Start using at {{appUrl}}',
    variables: { username: "User's name", planName: "Subscription plan name", expiryDate: "Subscription expiry date", appUrl: "Application URL" },
    isActive: true
  }
];

async function initTemplates() {
  console.log('📧 Initializing Email Templates\n');

  try {
    // Check existing templates
    const existing = await db.select().from(emailTemplates);
    console.log(`Found ${existing.length} existing templates\n`);

    for (const template of templates) {
      const exists = existing.find(t => t.name === template.name);

      if (exists) {
        console.log(`✅ Template "${template.name}" already exists (ID: ${exists.id})`);

        // Update it to ensure it has the latest content
        await db.update(emailTemplates)
          .set({
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            variables: template.variables,
            isActive: template.isActive,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, exists.id));

        console.log(`   Updated with latest content\n`);
      } else {
        console.log(`➕ Creating template "${template.name}"...`);

        const [created] = await db.insert(emailTemplates)
          .values({
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            variables: template.variables,
            isActive: template.isActive
          })
          .returning();

        console.log(`   ✅ Created (ID: ${created.id})\n`);
      }
    }

    // Show final count
    const final = await db.select().from(emailTemplates);
    console.log(`\n✅ Total templates: ${final.length}`);
    console.log('\n📋 Templates:');
    for (const t of final) {
      console.log(`   ${t.isActive ? '✅' : '❌'} ${t.name}: "${t.subject}"`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initTemplates();
