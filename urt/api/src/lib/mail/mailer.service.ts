import { transporter } from './config.js';
import { renderer } from './renderer.service.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../utils/index.js';
import type { EmailOptions, SendTemplateOptions } from './types.js';

/**
 * Mailer Service
 * Handles sending emails with templates
 */
class MailerService {
  /**
   * Send an email with raw HTML
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!config.smtp.enabled) return false;
    try {
      const { to, subject, html, text, attachments } = options;

      await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
        attachments,
      });

      logger.info(`Email sent successfully to: ${Array.isArray(to) ? to.join(', ') : to}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplate(options: SendTemplateOptions): Promise<boolean> {
    if (!config.smtp.enabled) return false;
    try {
      const { to, subject, template, data, attachments } = options;
      const html = renderer.render(template, data);

      return await this.send({ to, subject, html, attachments });
    } catch (error) {
      logger.error('Failed to send template email:', error);
      return false;
    }
  }

  /**
   * Send email to multiple recipients
   */
  async sendBulk(recipients: string[], subject: string, html: string): Promise<number> {
    let successCount = 0;

    for (const recipient of recipients) {
      const success = await this.send({ to: recipient, subject, html });
      if (success) successCount++;
    }

    logger.info(`Bulk email sent: ${successCount}/${recipients.length} successful`);
    return successCount;
  }

  /**
   * Send template email to multiple recipients
   */
  async sendTemplateBulk(
    recipients: string[],
    subject: string,
    template: string,
    data: Record<string, any>,
  ): Promise<number> {
    let successCount = 0;

    for (const recipient of recipients) {
      const success = await this.sendTemplate({ to: recipient, subject, template, data });
      if (success) successCount++;
    }

    logger.info(`Bulk template email sent: ${successCount}/${recipients.length} successful`);
    return successCount;
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const mailService = new MailerService();
