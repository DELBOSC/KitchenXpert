/**
 * Mail Service
 * Complete email service with SMTP (nodemailer) and SendGrid support
 * Includes template support and development mode (console logging)
 */

import crypto from 'crypto';

import nodemailer, {
  type Transporter,
  type SendMailOptions as NodemailerOptions,
} from 'nodemailer';

import {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  projectSharedEmail,
  quoteReadyEmail,
  plainTextTemplates,
  type OrderDetails,
} from './mail-templates';
import { config } from '../config/app-config';
import winstonLogger from '../utils/logger';

// Create logger instance
const logger = winstonLogger.child({ module: 'MailService' });

/**
 * Mail provider type
 */
export type MailProvider = 'smtp' | 'sendgrid' | 'console';

/**
 * Email address with optional name
 */
export interface MailAddress {
  email: string;
  name?: string;
}

/**
 * Email template definition
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Options for sending email
 */
export interface SendMailOptions {
  to: MailAddress | MailAddress[];
  subject?: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  attachments?: MailAttachment[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  replyTo?: MailAddress;
  headers?: Record<string, string>;
}

/**
 * Email attachment
 */
export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
  path?: string;
}

/**
 * Result of sending email
 */
export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: MailProvider;
}

/**
 * Mail service configuration
 */
export interface MailServiceConfig {
  provider: MailProvider;
  from: MailAddress;
  replyTo?: MailAddress;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  templates?: Record<string, EmailTemplate>;
}

/**
 * Mail transport interface
 */
export interface MailTransport {
  send(options: SendMailOptions, from: MailAddress): Promise<SendMailResult>;
  verify(): Promise<boolean>;
  close?(): Promise<void>;
}

/**
 * Mail Service Error
 */
export class MailServiceError extends Error {
  public readonly code: string;
  public override readonly cause?: Error;

  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = 'MailServiceError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Default mail configuration from environment
 */
function getDefaultConfig(): MailServiceConfig {
  const mailConfig = config.mail;

  return {
    provider: (mailConfig?.provider || 'console') as MailProvider,
    from: {
      email: mailConfig?.from || 'noreply@kitchenxpert.com',
      name: 'KitchenXpert',
    },
    smtp: mailConfig?.smtp
      ? {
          host: mailConfig.smtp.host || '',
          port: mailConfig.smtp.port || 587,
          secure: mailConfig.smtp.secure || false,
          user: mailConfig.smtp.user || '',
          pass: mailConfig.smtp.pass || '',
        }
      : undefined,
    sendgrid: mailConfig?.sendgrid
      ? {
          apiKey: mailConfig.sendgrid.apiKey || '',
        }
      : undefined,
    templates: {},
  };
}

/**
 * Create SMTP transport using nodemailer
 */
function createSmtpTransport(smtpConfig: NonNullable<MailServiceConfig['smtp']>): MailTransport {
  let transporter: Transporter | null = null;

  const getTransporter = (): Transporter => {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
      });
    }
    return transporter;
  };

  return {
    async send(options: SendMailOptions, from: MailAddress): Promise<SendMailResult> {
      const startTime = Date.now();

      try {
        const recipients = Array.isArray(options.to) ? options.to : [options.to];
        const toAddresses = recipients.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email));

        const mailOptions: NodemailerOptions = {
          from: from.name ? `"${from.name}" <${from.email}>` : from.email,
          to: toAddresses.join(', '),
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
            cid: att.cid,
            path: att.path,
          })),
          cc: options.cc?.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', '),
          bcc: options.bcc?.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', '),
          replyTo: options.replyTo?.name
            ? `"${options.replyTo.name}" <${options.replyTo.email}>`
            : options.replyTo?.email,
          headers: options.headers,
        };

        const info = await getTransporter().sendMail(mailOptions);

        const duration = Date.now() - startTime;
        logger.info('Email sent via SMTP', {
          messageId: info.messageId,
          to: toAddresses,
          subject: options.subject,
          duration,
        });

        return {
          success: true,
          messageId: info.messageId,
          provider: 'smtp',
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('Failed to send email via SMTP', error as Error, {
          subject: options.subject,
          duration,
        });

        return {
          success: false,
          error: errorMessage,
          provider: 'smtp',
        };
      }
    },

    async verify(): Promise<boolean> {
      try {
        await getTransporter().verify();
        logger.info('SMTP transport verified successfully');
        return true;
      } catch (error) {
        logger.error('SMTP transport verification failed', error as Error);
        return false;
      }
    },

    async close(): Promise<void> {
      if (transporter) {
        transporter.close();
        transporter = null;
        logger.debug('SMTP transport closed');
      }
    },
  };
}

/**
 * Create SendGrid transport
 */
function createSendGridTransport(
  sendgridConfig: NonNullable<MailServiceConfig['sendgrid']>
): MailTransport {
  // Dynamic import for SendGrid to make it optional
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sgMailClient: any = null;

  const initialize = async (): Promise<any> => {
    if (!sgMailClient) {
      try {
        const sgModule = await import('@sendgrid/mail');
        sgMailClient = sgModule.default || sgModule;
        sgMailClient.setApiKey(sendgridConfig.apiKey);
        logger.info('SendGrid transport initialized');
      } catch (error) {
        throw new MailServiceError(
          'SENDGRID_INIT_FAILED',
          'Failed to initialize SendGrid. Make sure @sendgrid/mail is installed.',
          error instanceof Error ? error : undefined
        );
      }
    }
    return sgMailClient;
  };

  return {
    async send(options: SendMailOptions, from: MailAddress): Promise<SendMailResult> {
      const startTime = Date.now();

      try {
        const sg = await initialize();
        const recipients = Array.isArray(options.to) ? options.to : [options.to];

        const msg = {
          to: recipients.map((r) => ({ email: r.email, name: r.name })),
          from: { email: from.email, name: from.name },
          subject: options.subject || '',
          html: options.html,
          text: options.text,
          cc: options.cc?.map((r) => ({ email: r.email, name: r.name })),
          bcc: options.bcc?.map((r) => ({ email: r.email, name: r.name })),
          replyTo: options.replyTo
            ? { email: options.replyTo.email, name: options.replyTo.name }
            : undefined,
          headers: options.headers,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
            type: att.contentType,
            content_id: att.cid,
            disposition: att.cid ? 'inline' : 'attachment',
          })),
        };

        const [response] = await sg.send(msg);

        const duration = Date.now() - startTime;
        const messageId = response.headers?.['x-message-id'] as string | undefined;

        logger.info('Email sent via SendGrid', {
          messageId,
          to: recipients.map((r) => r.email),
          subject: options.subject,
          statusCode: response.statusCode,
          duration,
        });

        return {
          success: true,
          messageId,
          provider: 'sendgrid',
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('Failed to send email via SendGrid', error as Error, {
          subject: options.subject,
          duration,
        });

        return {
          success: false,
          error: errorMessage,
          provider: 'sendgrid',
        };
      }
    },

    async verify(): Promise<boolean> {
      try {
        await initialize();
        logger.info('SendGrid transport verified (API key set)');
        return true;
      } catch (error) {
        logger.error('SendGrid transport verification failed', error as Error);
        return false;
      }
    },
  };
}

/**
 * Create console transport for development
 */
function createConsoleTransport(): MailTransport {
  return {
    async send(options: SendMailOptions, from: MailAddress): Promise<SendMailResult> {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const toStr = recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', ');
      const messageId = `console-${crypto.randomBytes(12).toString('base64url')}`;

      logger.info(`\n${'='.repeat(70)}`);
      logger.info('[MAIL SERVICE - DEVELOPMENT MODE]');
      logger.info('='.repeat(70));
      logger.info(`Message ID: ${messageId}`);
      logger.info(`From:       ${from.name ? `${from.name} <${from.email}>` : from.email}`);
      logger.info(`To:         ${toStr}`);
      if (options.cc?.length) {
        logger.info(
          `CC:         ${options.cc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', ')}`
        );
      }
      if (options.bcc?.length) {
        logger.info(
          `BCC:        ${options.bcc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', ')}`
        );
      }
      if (options.replyTo) {
        logger.info(
          `Reply-To:   ${options.replyTo.name ? `${options.replyTo.name} <${options.replyTo.email}>` : options.replyTo.email}`
        );
      }
      logger.info(`Subject:    ${options.subject}`);
      logger.info('-'.repeat(70));

      if (options.text) {
        logger.info('TEXT BODY:');
        logger.info(options.text);
        logger.info('-'.repeat(70));
      }

      if (options.html) {
        logger.info('HTML BODY:');
        // Log a truncated version in dev mode
        const htmlPreview =
          options.html.length > 1000
            ? `${options.html.substring(0, 1000)}\n... [truncated]`
            : options.html;
        logger.info(htmlPreview);
      }

      if (options.attachments?.length) {
        logger.info('-'.repeat(70));
        logger.info('ATTACHMENTS:');
        options.attachments.forEach((att) => {
          logger.info(`  - ${att.filename} (${att.contentType || 'unknown type'})`);
        });
      }

      logger.info(`${'='.repeat(70)}\n`);

      logger.info('Email logged to console (development mode)', {
        messageId,
        to: recipients.map((r) => r.email),
        subject: options.subject,
      });

      return {
        success: true,
        messageId,
        provider: 'console',
      };
    },

    async verify(): Promise<boolean> {
      logger.info('Console transport verified (development mode)');
      return true;
    },
  };
}

/**
 * Main Mail Service class
 */
export class MailService {
  private config: MailServiceConfig;
  private transport: MailTransport;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(customConfig?: Partial<MailServiceConfig>) {
    const defaultConfig = getDefaultConfig();
    this.config = { ...defaultConfig, ...customConfig };
    this.transport = this.createTransport();

    // Register default templates
    if (this.config.templates) {
      Object.entries(this.config.templates).forEach(([name, template]) => {
        this.templates.set(name, template);
      });
    }

    logger.info('Mail service initialized', {
      provider: this.config.provider,
      from: this.config.from.email,
    });
  }

  /**
   * Create appropriate transport based on configuration
   */
  private createTransport(): MailTransport {
    switch (this.config.provider) {
      case 'smtp':
        if (!this.config.smtp?.host) {
          logger.warn('SMTP host not configured, falling back to console transport');
          return createConsoleTransport();
        }
        return createSmtpTransport(this.config.smtp);

      case 'sendgrid':
        if (!this.config.sendgrid?.apiKey) {
          logger.warn('SendGrid API key not configured, falling back to console transport');
          return createConsoleTransport();
        }
        return createSendGridTransport(this.config.sendgrid);

      case 'console':
      default:
        return createConsoleTransport();
    }
  }

  /**
   * Send an email
   */
  async send(options: SendMailOptions): Promise<SendMailResult> {
    if (!options.subject && !options.template) {
      throw new MailServiceError('INVALID_OPTIONS', 'Email must have a subject or use a template');
    }

    if (!options.html && !options.text && !options.template) {
      throw new MailServiceError(
        'INVALID_OPTIONS',
        'Email must have content (html, text, or template)'
      );
    }

    return this.transport.send(options, this.config.from);
  }

  /**
   * Send email using a registered template
   */
  async sendTemplate(
    templateName: string,
    to: MailAddress | MailAddress[],
    data: Record<string, unknown>
  ): Promise<SendMailResult> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new MailServiceError('TEMPLATE_NOT_FOUND', `Template "${templateName}" not found`);
    }

    const subject = this.interpolate(template.subject, data);
    const html = this.interpolate(template.html, data);
    const text = template.text ? this.interpolate(template.text, data) : undefined;

    return this.send({ to, subject, html, text });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcome(to: MailAddress): Promise<SendMailResult> {
    const userName = to.name ?? to.email.split('@')[0] ?? 'User';

    return this.send({
      to,
      subject: `Bienvenue sur KitchenXpert, ${userName} !`,
      html: welcomeEmail(userName),
      text: plainTextTemplates.welcome(userName),
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: MailAddress, verificationLink: string): Promise<SendMailResult> {
    const userName = to.name ?? to.email.split('@')[0] ?? 'User';

    return this.send({
      to,
      subject: 'Verifiez votre adresse email - KitchenXpert',
      html: verificationEmail(userName, verificationLink),
      text: plainTextTemplates.verification(userName, verificationLink),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: MailAddress, resetLink: string): Promise<SendMailResult> {
    const userName = to.name ?? to.email.split('@')[0] ?? 'User';

    return this.send({
      to,
      subject: 'Reinitialisation de votre mot de passe - KitchenXpert',
      html: passwordResetEmail(userName, resetLink),
      text: plainTextTemplates.passwordReset(userName, resetLink),
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    to: MailAddress,
    orderDetails: OrderDetails
  ): Promise<SendMailResult> {
    return this.send({
      to,
      subject: `Commande confirmee #${orderDetails.orderNumber} - KitchenXpert`,
      html: orderConfirmationEmail(orderDetails),
      text: plainTextTemplates.orderConfirmation(orderDetails),
    });
  }

  /**
   * Send project shared notification
   */
  async sendProjectShared(
    to: MailAddress,
    data: {
      recipientName: string;
      ownerName: string;
      projectName: string;
      projectUrl: string;
    }
  ): Promise<SendMailResult> {
    return this.send({
      to,
      subject: `${data.ownerName} a partage un projet avec vous - KitchenXpert`,
      html: projectSharedEmail(
        data.recipientName,
        data.ownerName,
        data.projectName,
        data.projectUrl
      ),
    });
  }

  /**
   * Send quote ready notification
   */
  async sendQuoteReady(
    to: MailAddress,
    data: {
      customerName: string;
      projectName: string;
      totalAmount: number;
      currency: string;
      quoteUrl: string;
      validUntil?: string;
    }
  ): Promise<SendMailResult> {
    return this.send({
      to,
      subject: `Votre devis est pret - ${data.projectName}`,
      html: quoteReadyEmail(
        data.customerName,
        data.projectName,
        data.totalAmount,
        data.currency,
        data.quoteUrl,
        data.validUntil
      ),
    });
  }

  /**
   * Verify transport connection
   */
  async verify(): Promise<boolean> {
    return this.transport.verify();
  }

  /**
   * Register a custom template
   */
  registerTemplate(name: string, template: EmailTemplate): void {
    this.templates.set(name, template);
    logger.debug('Template registered', { name });
  }

  /**
   * Get the current mail provider
   */
  getProvider(): MailProvider {
    return this.config.provider;
  }

  /**
   * Check if using development mode (console transport)
   */
  isDevMode(): boolean {
    return this.config.provider === 'console';
  }

  /**
   * Close the transport connection
   */
  async close(): Promise<void> {
    if (this.transport.close) {
      await this.transport.close();
    }
  }

  /**
   * Interpolate template variables
   */
  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}

// Singleton instance
let mailServiceInstance: MailService | null = null;

/**
 * Get or create the singleton mail service instance
 */
export function getMailService(config?: Partial<MailServiceConfig>): MailService {
  if (!mailServiceInstance) {
    mailServiceInstance = new MailService(config);
  }
  return mailServiceInstance;
}

/**
 * Create a new mail service instance (non-singleton)
 */
export function createMailService(config?: Partial<MailServiceConfig>): MailService {
  return new MailService(config);
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMailService(): void {
  if (mailServiceInstance) {
    mailServiceInstance.close().catch(() => {});
    mailServiceInstance = null;
  }
}

export default MailService;
