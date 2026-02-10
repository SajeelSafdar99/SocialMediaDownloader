// Email service using templates and SMTP configuration
import { sendPasswordResetEmail, sendWelcomeEmail, sendSubscriptionEmail } from './services/emailService';

export type Mailer = {
  sendPasswordResetEmail(to: string, resetUrl: string, username?: string): Promise<void>;
  sendWelcomeEmail(to: string, username: string): Promise<void>;
  sendSubscriptionEmail(to: string, username: string, planName: string, amount: number, billingCycle: string, nextBilling: string, paymentId?: number): Promise<void>;
};

export function createMailer(): Mailer {
  return {
    async sendPasswordResetEmail(to: string, resetUrl: string, username: string = 'User') {
      try {
        await sendPasswordResetEmail(to, username, resetUrl);
        console.log(`[MAILER] Password reset email sent to ${to}`);
      } catch (error: any) {
        console.error(`[MAILER ERROR] Failed to send password reset email to ${to}:`, error.message);
        // Fallback: log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MAILER FALLBACK] Reset URL: ${resetUrl}`);
        }
      }
    },

    async sendWelcomeEmail(to: string, username: string) {
      try {
        await sendWelcomeEmail(to, username);
        console.log(`[MAILER] Welcome email sent to ${to}`);
      } catch (error: any) {
        console.error(`[MAILER ERROR] Failed to send welcome email to ${to}:`, error.message);
      }
    },

    async sendSubscriptionEmail(to: string, username: string, planName: string, amount: number, billingCycle: string, nextBilling: string, paymentId?: number) {
      try {
        await sendSubscriptionEmail(to, username, planName, amount, billingCycle, nextBilling, paymentId);
        console.log(`[MAILER] Subscription email sent to ${to}`);
      } catch (error: any) {
        console.error(`[MAILER ERROR] Failed to send subscription email to ${to}:`, error.message);
      }
    },
  };
}


