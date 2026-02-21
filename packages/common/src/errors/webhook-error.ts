import { ApiError } from './api-error';

/**
 * Erreurs liées aux webhooks
 */
export class WebhookError extends ApiError {
  public readonly webhookId?: string;
  public readonly deliveryId?: string;
  public readonly responseStatusCode?: number;

  constructor(
    message: string,
    webhookId?: string,
    deliveryId?: string,
    statusCode?: number
  ) {
    const details = {
      ...(webhookId && { webhookId }),
      ...(deliveryId && { deliveryId }),
      ...(statusCode && { responseStatusCode: statusCode }),
    };

    super(
      message,
      502,
      'WEBHOOK_ERROR',
      true,
      Object.keys(details).length > 0 ? details : undefined
    );

    this.webhookId = webhookId;
    this.deliveryId = deliveryId;
    this.responseStatusCode = statusCode;
  }

  static deliveryFailed(
    webhookId: string,
    deliveryId: string,
    statusCode?: number
  ): WebhookError {
    return new WebhookError(
      `Webhook delivery failed${statusCode ? ` with status ${statusCode}` : ''}`,
      webhookId,
      deliveryId,
      statusCode
    );
  }

  static invalidSignature(webhookId: string): WebhookError {
    const error = new WebhookError(
      'Invalid webhook signature',
      webhookId
    );
    (error as { code: string }).code = 'WEBHOOK_INVALID_SIGNATURE';
    return error;
  }

  static endpointUnreachable(webhookId: string, url: string): WebhookError {
    const error = new WebhookError(
      `Webhook endpoint unreachable: ${url}`,
      webhookId
    );
    (error as { code: string }).code = 'WEBHOOK_ENDPOINT_UNREACHABLE';
    return error;
  }

  static timeout(webhookId: string, timeoutMs: number): WebhookError {
    const error = new WebhookError(
      `Webhook request timed out after ${timeoutMs}ms`,
      webhookId
    );
    (error as { code: string }).code = 'WEBHOOK_TIMEOUT';
    return error;
  }
}
