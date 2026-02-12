/**
 * Initialize Email Templates
 * Creates email_templates and smtp_config tables and inserts default templates
 * This script combines migration and template initialization
 */

import { db } from "../server/db";
import { emailTemplates, smtpConfig } from "../shared/schema";
import { loadEnv } from "../server/env";
import { eq, sql } from "drizzle-orm";

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
  },
  {
    name: 'test_email',
    subject: 'Test Email from VidGrabber',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ SMTP Configuration Test</h1>
    </div>
    <div class="content">
      <h2>Hi {{recipientName}}!</h2>
      <p>This is a test email to verify your SMTP configuration is working correctly.</p>
      <div class="info-box">
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Recipient: {{recipientEmail}}</li>
          <li>Sent at: {{sentAt}}</li>
          <li>Server: VidGrabber Email System</li>
        </ul>
      </div>
      <p>✅ If you received this email, your SMTP configuration is working perfectly!</p>
      <p>You can now send emails to your users for welcome messages, password resets, and subscription notifications.</p>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
      <p><a href="{{adminUrl}}">Admin Dashboard</a></p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Test email from VidGrabber. Sent to {{recipientEmail}} at {{sentAt}}. SMTP configuration is working!',
    variables: { recipientName: "Recipient name", recipientEmail: "Recipient email", sentAt: "Timestamp", adminUrl: "Admin URL" },
    isActive: true
  },
  {
    name: 'refund_request',
    subject: 'Refund Request Received',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Refund Request Received</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>We have received your refund request. Our team will review it and get back to you within 3-5 business days.</p>
      <div class="info-box">
        <p><strong>Request Details:</strong></p>
        <ul>
          <li>Request ID: #{{requestId}}</li>
          <li>Payment ID: {{paymentId}}</li>
          <li>Amount: {{amount}}</li>
          <li>Reason: {{reason}}</li>
          <li>Submitted: {{submittedAt}}</li>
        </ul>
      </div>
      <p>According to our refund policy, refunds are processed based on:</p>
      <ul>
        <li>Service issues or technical problems</li>
        <li>Duplicate charges</li>
        <li>Subscription cancellation within the eligible period</li>
      </ul>
      <p>If you have any questions, please contact our support team at <a href="mailto:support@vidgrabber.online">support@vidgrabber.online</a></p>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Hi {{username}}! Your refund request #{{requestId}} has been received. Amount: {{amount}}. We will review it within 3-5 business days.',
    variables: { username: "User's name", requestId: "Request ID", paymentId: "Payment ID", amount: "Refund amount", reason: "Refund reason", submittedAt: "Submission date" },
    isActive: true
  },
  {
    name: 'refund_completed',
    subject: 'Refund Processed Successfully',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .success-box { background: #d1fae5; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Refund Processed</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <div class="success-box">
        <p style="margin: 0; font-size: 18px;"><strong>Good news! Your refund has been processed successfully.</strong></p>
      </div>
      <p>We have completed the refund for your payment. The funds should appear in your account within 5-10 business days, depending on your payment provider.</p>
      <div class="info-box">
        <p><strong>Refund Details:</strong></p>
        <ul>
          <li>Refund ID: #{{refundId}}</li>
          <li>Payment ID: {{paymentId}}</li>
          <li>Amount: {{currency}} {{amount}}</li>
          <li>Processed: {{completedAt}}</li>
        </ul>
      </div>
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>The refund has been initiated with your payment provider</li>
        <li>You should see the funds in 5-10 business days</li>
        <li>You'll receive a notification from your bank/card issuer</li>
      </ul>
      <p>If you have any questions or don't see the refund after 10 business days, please contact us at <a href="mailto:support@vidgrabber.online">support@vidgrabber.online</a></p>
      <p>We hope to serve you better in the future!</p>
      <p>Best regards,<br>The VidGrabber Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 VidGrabber. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    textContent: 'Hi {{username}}! Your refund has been processed successfully. Refund ID: #{{refundId}}, Amount: {{currency}} {{amount}}. Funds will appear in 5-10 business days.',
    variables: { username: "User's name", refundId: "Refund request ID", paymentId: "Payment ID", amount: "Refund amount", currency: "Currency code", completedAt: "Completion date" },
    isActive: true
  }
];

async function initTemplates() {
  console.log('📧 Initializing Email System\n');

  try {
    // Step 1: Create tables if they don't exist
    console.log('🔧 Creating database tables...\n');

    // Create email_templates table
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
    console.log('✅ email_templates table ready');

    // Create smtp_config table
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
    console.log('✅ smtp_config table ready\n');

    // Step 2: Check existing templates
    const existing = await db.select().from(emailTemplates);
    console.log(`📋 Found ${existing.length} existing templates\n`);

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
    console.log(`\n✅ Email system initialized successfully!`);
    console.log(`📊 Total templates: ${final.length}`);
    console.log('\n📋 Available Templates:');
    for (const t of final) {
      console.log(`   ${t.isActive ? '✅' : '❌'} ${t.name}: "${t.subject}"`);
    }

    // Check SMTP config
    const [smtp] = await db.select().from(smtpConfig).limit(1);
    if (smtp) {
      console.log(`\n📧 SMTP Config: ${smtp.fromName} <${smtp.fromEmail}>`);
    } else {
      console.log(`\n⚠️  No SMTP configuration found. Configure it in Admin Dashboard.`);
    }

    console.log('\n💡 Next steps:');
    console.log('   1. Configure SMTP settings in Admin Dashboard > Email Templates');
    console.log('   2. Test your configuration using the "Send Test Email" button');
    console.log('   3. Customize templates as needed\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initTemplates();
