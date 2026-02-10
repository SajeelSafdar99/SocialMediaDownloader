/**
 * Email Templates Management Routes (Admin Only)
 */

import type { Express } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { requirePermission } from "../middleware/permissionMiddleware";
import { db } from "../db";
import { emailTemplates, smtpConfig } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { testSmtpConnection } from "../services/emailService";

export function registerEmailTemplateRoutes(app: Express) {

  /**
   * Get all email templates
   * GET /api/admin/email-templates
   */
  app.get(
    "/api/admin/email-templates",
    requireAdmin,
    requirePermission("email_templates.read"),
    async (req, res) => {
      try {
        const templates = await db.select().from(emailTemplates);
        res.json({ ok: true, templates });
      } catch (error) {
        console.error("Get email templates error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get single email template
   * GET /api/admin/email-templates/:id
   */
  app.get(
    "/api/admin/email-templates/:id",
    requireAdmin,
    requirePermission("email_templates.read"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const [template] = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, id))
          .limit(1);

        if (!template) {
          return res.status(404).json({ ok: false, error: "Template not found" });
        }

        res.json({ ok: true, template });
      } catch (error) {
        console.error("Get email template error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update email template
   * PUT /api/admin/email-templates/:id
   */
  app.put(
    "/api/admin/email-templates/:id",
    requireAdmin,
    requirePermission("email_templates.update"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { subject, htmlContent, textContent } = req.body;

        const [updated] = await db
          .update(emailTemplates)
          .set({
            subject,
            htmlContent,
            textContent,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.id, id))
          .returning();

        if (!updated) {
          return res.status(404).json({ ok: false, error: "Template not found" });
        }

        res.json({ ok: true, template: updated });
      } catch (error) {
        console.error("Update email template error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get SMTP configuration
   * GET /api/admin/smtp-config
   */
  app.get(
    "/api/admin/smtp-config",
    requireAdmin,
    requirePermission("smtp_config.read"),
    async (req, res) => {
      try {
        const [config] = await db
          .select()
          .from(smtpConfig)
          .where(eq(smtpConfig.isActive, true))
          .limit(1);

        if (!config) {
          return res.json({ ok: true, config: null });
        }

        // Don't send password to frontend
        const { password, ...safeConfig } = config;

        res.json({ ok: true, config: { ...safeConfig, password: '••••••••' } });
      } catch (error) {
        console.error("Get SMTP config error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Create or update SMTP configuration
   * POST /api/admin/smtp-config
   */
  app.post(
    "/api/admin/smtp-config",
    requireAdmin,
    requirePermission("smtp_config.update"),
    async (req, res) => {
      try {
        const { host, port, secure, username, password, fromEmail, fromName } = req.body;

        // Deactivate existing configs
        await db
          .update(smtpConfig)
          .set({ isActive: false })
          .where(eq(smtpConfig.isActive, true));

        // Create new config
        const [config] = await db
          .insert(smtpConfig)
          .values({
            host,
            port,
            secure,
            username,
            password,
            fromEmail,
            fromName,
            isActive: true,
          })
          .returning();

        res.json({ ok: true, config });
      } catch (error) {
        console.error("Create SMTP config error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update SMTP configuration
   * PUT /api/admin/smtp-config
   */
  app.put(
    "/api/admin/smtp-config",
    requireAdmin,
    requirePermission("smtp_config.update"),
    async (req, res) => {
      try {
        const { id, host, port, secure, username, password, fromEmail, fromName } = req.body;

        const updateData: any = {
          host,
          port,
          secure,
          username,
          fromEmail,
          fromName,
          updatedAt: new Date(),
        };

        // Only update password if it's not the masked value
        if (password && password !== '••••••••') {
          updateData.password = password;
        }

        const [updated] = await db
          .update(smtpConfig)
          .set(updateData)
          .where(eq(smtpConfig.id, id))
          .returning();

        if (!updated) {
          return res.status(404).json({ ok: false, error: "SMTP config not found" });
        }

        res.json({ ok: true, config: updated });
      } catch (error) {
        console.error("Update SMTP config error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Test SMTP connection
   * POST /api/admin/smtp-config/test
   */
  app.post(
    "/api/admin/smtp-config/test",
    requireAdmin,
    requirePermission("smtp_config.read"),
    async (req, res) => {
      try {
        const result = await testSmtpConnection();

        if (result.success) {
          res.json({ ok: true, message: result.message });
        } else {
          res.status(400).json({ ok: false, error: result.message });
        }
      } catch (error: any) {
        console.error("Test SMTP connection error:", error);
        res.status(500).json({ ok: false, error: error.message || "Failed to test connection" });
      }
    }
  );

  /**
   * Send test email using test_email template
   * POST /api/admin/smtp-config/send-test-email
   */
  app.post(
    "/api/admin/smtp-config/send-test-email",
    requireAdmin,
    requirePermission("smtp_config.read"),
    async (req, res) => {
      try {
        const { email } = req.body;
        const adminReq = req as any; // Cast to access admin property

        if (!email) {
          return res.status(400).json({ ok: false, error: 'Email address is required' });
        }

        // Import sendTemplateEmail function
        const { sendTemplateEmail } = await import('../services/emailService');

        const appUrl = process.env.APP_URL || 'https://vidgrabber.online';
        const adminUrl = appUrl.includes('localhost') ? 'http://localhost:5173' : 'https://admin.vidgrabber.online';

        // Send test email
        await sendTemplateEmail('test_email', email, {
          recipientName: adminReq.admin?.username || 'Admin',
          recipientEmail: email,
          sentAt: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          adminUrl,
        });

        res.json({ ok: true, message: `Test email sent successfully to ${email}` });
      } catch (error: any) {
        console.error("Send test email error:", error);
        res.status(500).json({ ok: false, error: error.message || "Failed to send test email" });
      }
    }
  );
}
