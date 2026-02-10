-- Email templates and SMTP configuration
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
);

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
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES
('welcome', 'Welcome to SaveMedia!',
'<!DOCTYPE html>
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
      <h1>Welcome to SaveMedia!</h1>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>Thank you for joining SaveMedia! We''re excited to have you on board.</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Download videos from Instagram, TikTok, YouTube and more</li>
        <li>Save your download history</li>
        <li>Access premium features (with subscription)</li>
        <li>Get priority support</li>
      </ul>
      <a href="{{appUrl}}" class="button">Start Downloading Now</a>
      <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
      <p>Best regards,<br>The SaveMedia Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 SaveMedia. All rights reserved.</p>
      <p>{{appUrl}}</p>
    </div>
  </div>
</body>
</html>',
'Hi {{username}}! Welcome to SaveMedia! Thank you for joining us. Start downloading now at {{appUrl}}',
'{"username": "User''s name", "appUrl": "Application URL"}'
),

('forgot_password', 'Reset Your Password',
'<!DOCTYPE html>
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
        <strong>Security Note:</strong> If you didn''t request this password reset, please ignore this email or contact our support team immediately.
      </div>
      <p>Best regards,<br>The SaveMedia Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 SaveMedia. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Hi {{username}}! Reset your password at {{resetUrl}}. This link expires in {{expiryHours}} hours.',
'{"username": "User''s name", "resetUrl": "Password reset URL", "expiryHours": "Expiry hours"}'
),

('subscription', 'Welcome to Premium!',
'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .premium-badge { background: #ffd700; color: #333; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Premium!</h1>
      <p class="premium-badge">PREMIUM MEMBER</p>
    </div>
    <div class="content">
      <h2>Hi {{username}}!</h2>
      <p>Thank you for subscribing to SaveMedia Premium! Your subscription is now active.</p>
      <div class="features">
        <h3>Your Premium Benefits:</h3>
        <ul>
          <li>✅ Unlimited downloads</li>
          <li>✅ HD quality downloads</li>
          <li>✅ No ads</li>
          <li>✅ Priority support</li>
          <li>✅ Exclusive features</li>
        </ul>
      </div>
      <p><strong>Subscription Details:</strong></p>
      <ul>
        <li>Plan: {{planName}}</li>
        <li>Amount: ${{amount}}</li>
        <li>Billing Cycle: {{billingCycle}}</li>
        <li>Next Billing: {{nextBilling}}</li>
      </ul>
      <a href="{{appUrl}}" class="button">Start Using Premium Features</a>
      <p>Questions? Contact us anytime at support@savemedia.app</p>
      <p>Best regards,<br>The SaveMedia Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 SaveMedia. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Hi {{username}}! Welcome to SaveMedia Premium! Your subscription is active. Plan: {{planName}}, Amount: ${{amount}}',
'{"username": "User''s name", "planName": "Plan name", "amount": "Amount", "billingCycle": "Billing cycle", "nextBilling": "Next billing date", "appUrl": "App URL"}'
);
