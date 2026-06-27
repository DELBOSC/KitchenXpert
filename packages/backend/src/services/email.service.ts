/**
 * Email Notification Service
 * Convenience wrapper around the existing MailService for common transactional emails.
 * Delegates to the MailService singleton for actual sending (SMTP / SendGrid / console).
 */

import { getMailService } from './mail.service';
import logger from '../utils/logger';

export type EmailTemplateName =
  | 'order_confirmation'
  | 'order_status_update'
  | 'quote_request'
  | 'quote_ready'
  | 'welcome'
  | 'password_reset';

export interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplateName;
  data: Record<string, unknown>;
}

export class EmailService {
  /**
   * Send an email using a template name and data.
   * Falls back to logging if SMTP/SendGrid is not configured (dev mode).
   */
  static async send(options: EmailOptions): Promise<boolean> {
    try {
      const html = EmailService.renderTemplate(options.template, options.data);

      const mailService = getMailService();

      const result = await mailService.send({
        to: { email: options.to },
        subject: options.subject,
        html,
      });

      if (!result.success) {
        logger.warn(`[EmailService] Failed to send email to ${options.to}: ${result.error}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[EmailService] Failed to send:', error);
      return false;
    }
  }

  /**
   * Render an HTML email body from a template name and data.
   */
  private static renderTemplate(
    template: EmailTemplateName,
    data: Record<string, unknown>
  ): string {
    const templates: Record<EmailTemplateName, string> = {
      welcome: `
        <h1>Bienvenue sur KitchenXpert !</h1>
        <p>Bonjour ${data.name || ''},</p>
        <p>Votre compte a ete cree avec succes. Vous pouvez maintenant concevoir votre cuisine ideale.</p>
        <p><a href="${data.loginUrl || '#'}">Se connecter</a></p>
      `,
      order_confirmation: `
        <h1>Confirmation de commande</h1>
        <p>Bonjour ${data.customerName || ''},</p>
        <p>Votre commande <strong>#${data.orderId || ''}</strong> a bien ete enregistree.</p>
        <p>Montant total : <strong>${data.total || '0'} EUR</strong></p>
        <p>Nous vous tiendrons informe de l'avancement de votre commande.</p>
      `,
      order_status_update: `
        <h1>Mise a jour de votre commande</h1>
        <p>Bonjour ${data.customerName || ''},</p>
        <p>Le statut de votre commande <strong>#${data.orderId || ''}</strong> a change :</p>
        <p>Nouveau statut : <strong>${data.status || ''}</strong></p>
        ${data.message ? `<p>${data.message}</p>` : ''}
      `,
      quote_request: `
        <h1>Nouvelle demande de devis</h1>
        <p>Un nouveau devis a ete demande par <strong>${data.customerName || ''}</strong>.</p>
        <p>Projet : ${data.projectName || ''}</p>
        <p>Configuration : ${data.kitchenName || ''}</p>
        <p><a href="${data.adminUrl || '#'}">Voir le devis</a></p>
      `,
      quote_ready: `
        <h1>Votre devis est pret !</h1>
        <p>Bonjour ${data.customerName || ''},</p>
        <p>Votre devis pour le projet <strong>${data.projectName || ''}</strong> est pret.</p>
        <p>Montant estime : <strong>${data.total || '0'} EUR</strong></p>
        <p><a href="${data.quoteUrl || '#'}">Consulter le devis</a></p>
      `,
      password_reset: `
        <h1>Reinitialisation de mot de passe</h1>
        <p>Vous avez demande une reinitialisation de votre mot de passe.</p>
        <p><a href="${data.resetUrl || '#'}">Cliquez ici pour reinitialiser votre mot de passe</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      `,
    };

    const body = templates[template] || '<p>Notification KitchenXpert</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
          ${body}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 20px; text-align: center;">
          KitchenXpert - Conception de cuisine professionnelle
        </p>
      </body>
      </html>
    `;
  }

  // ==================== Convenience Methods ====================

  static async sendOrderConfirmation(
    to: string,
    orderId: string,
    customerName: string,
    total: number
  ): Promise<boolean> {
    return EmailService.send({
      to,
      subject: `KitchenXpert - Confirmation de commande #${orderId}`,
      template: 'order_confirmation',
      data: { orderId, customerName, total: total.toFixed(2) },
    });
  }

  static async sendOrderStatusUpdate(
    to: string,
    orderId: string,
    customerName: string,
    status: string,
    message?: string
  ): Promise<boolean> {
    return EmailService.send({
      to,
      subject: `KitchenXpert - Mise a jour commande #${orderId}`,
      template: 'order_status_update',
      data: { orderId, customerName, status, message },
    });
  }

  static async sendQuoteReady(
    to: string,
    customerName: string,
    projectName: string,
    total: number,
    quoteUrl: string
  ): Promise<boolean> {
    return EmailService.send({
      to,
      subject: 'KitchenXpert - Votre devis est pret',
      template: 'quote_ready',
      data: { customerName, projectName, total: total.toFixed(2), quoteUrl },
    });
  }

  static async sendWelcome(to: string, name: string, loginUrl: string): Promise<boolean> {
    return EmailService.send({
      to,
      subject: 'Bienvenue sur KitchenXpert !',
      template: 'welcome',
      data: { name, loginUrl },
    });
  }
}
