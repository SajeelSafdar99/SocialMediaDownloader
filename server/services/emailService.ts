/**
 * Email Template Service
 * Handles sending emails with customizable templates
 */

import * as nodemailer from 'nodemailer';
import { db } from '../db';
import { emailTemplates, smtpConfig } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

interface EmailVariables {
  [key: string]: string | number;
}

/**
 * Get active SMTP configuration
 */
async function getSmtpConfig() {
  const [config] = await db
    .select()
    .from(smtpConfig)
    .where(eq(smtpConfig.isActive, true))
    .limit(1);

  if (!config) {
    throw new Error('No active SMTP configuration found. Please configure SMTP settings in admin panel.');
  }

  return config;
}

/**
 * Create nodemailer transporter from SMTP config
 */
async function createTransporter() {
  const config = await getSmtpConfig();

  // Port 587 uses STARTTLS (secure: false), Port 465 uses SSL (secure: true)
  const useSecure = config.port === 465;

  const transportOptions: any = {
    host: config.host,
    port: config.port,
    secure: useSecure, // true for 465, false for other ports
    auth: {
      user: config.username,
      pass: config.password,
    },
  };

  // For port 587, explicitly require STARTTLS
  if (config.port === 587) {
    transportOptions.requireTLS = true;
  }

  return nodemailer.createTransport(transportOptions);
}

/**
 * Replace variables in template
 */
function replaceVariables(content: string, variables: EmailVariables): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

/**
 * Get email template by name
 */
export async function getEmailTemplate(templateName: string) {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(and(
      eq(emailTemplates.name, templateName),
      eq(emailTemplates.isActive, true)
    ))
    .limit(1);

  if (!template) {
    throw new Error(`Email template '${templateName}' not found or inactive`);
  }

  return template;
}

/**
 * Send email using template
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  variables: EmailVariables
) {
  try {
    // Get template
    const template = await getEmailTemplate(templateName);

    // Get SMTP config and create transporter
    const config = await getSmtpConfig();
    const transporter = await createTransporter();

    // Replace variables in subject and content
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.htmlContent, variables);
    const text = template.textContent
      ? replaceVariables(template.textContent, variables)
      : undefined;

    // Send email
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
      text,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to: string, username: string) {
  return sendTemplateEmail('welcome', to, {
    username,
    appUrl: process.env.APP_URL || 'http://localhost:5173',
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  username: string,
  resetUrl: string
) {
  return sendTemplateEmail('forgot_password', to, {
    username,
    resetUrl,
    expiryHours: '24',
  });
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionEmail(
  to: string,
  username: string,
  planName: string,
  amount: number,
  billingCycle: string,
  nextBilling: string,
  paymentId?: number
) {
  return sendTemplateEmail('subscription', to, {
    username,
    planName,
    amount: amount.toFixed(2),
    billingCycle,
    nextBilling,
    paymentId: paymentId ? `#${paymentId}` : 'N/A',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
  });
}

/**
 * Send refund request notification to admin
 */
export async function sendRefundRequestEmail(
  to: string,
  username: string,
  userEmail: string,
  paymentId: number,
  amount: number,
  currency: string,
  reason: string,
  additionalDetails: string,
  requestId?: number
) {
  const appUrl = process.env.PUBLIC_BASE_URL || process.env.APP_URL || 'https://vidgrabber.online';
  const adminUrl = appUrl.includes('localhost') ? 'http://localhost:5173' : 'https://admin.vidgrabber.online';

  return sendTemplateEmail('refund_request', to, {
    username,
    userEmail,
    requestId: requestId ? requestId.toString() : 'Pending',
    paymentId: paymentId.toString(),
    amount: `${currency} ${(amount / 100).toFixed(2)}`,
    reason,
    additionalDetails: additionalDetails || 'None provided',
    submittedAt: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    adminUrl,
  });
}

/**
 * Send refund confirmation to user
 */
export async function sendRefundConfirmationEmail(
  to: string,
  username: string,
  paymentId: number,
  amount: number,
  currency: string,
  reason: string,
  requestId?: number
) {
  return sendTemplateEmail('refund_request', to, { // Use refund_request template (same as admin notification)
    username,
    requestId: requestId ? requestId.toString() : 'Pending',
    paymentId: paymentId.toString(),
    amount: `${currency} ${(amount / 100).toFixed(2)}`,
    reason,
    submittedAt: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
  });
}

/**
 * Send refund completed notification to user
 */
export async function sendRefundCompletedEmail(
  to: string,
  username: string,
  paymentId: number,
  refundId: number,
  amount: number,
  currency: string
) {
  return sendTemplateEmail('refund_completed', to, {
    username,
    paymentId: paymentId.toString(),
    refundId: refundId.toString(),
    amount: (amount / 100).toFixed(2),
    currency,
    completedAt: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
  });
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection() {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
