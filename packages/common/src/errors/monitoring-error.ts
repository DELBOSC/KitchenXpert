import { ApiError } from './api-error';

/**
 * Erreurs liées au monitoring et aux métriques
 */
export class MonitoringError extends ApiError {
  public readonly service?: string;
  public readonly metric?: string;

  constructor(
    message: string,
    service?: string,
    metric?: string
  ) {
    const details = {
      ...(service && { service }),
      ...(metric && { metric }),
    };

    super(
      message,
      503,
      'MONITORING_ERROR',
      true,
      Object.keys(details).length > 0 ? details : undefined
    );

    this.service = service;
    this.metric = metric;
  }

  static serviceUnhealthy(serviceName: string, reason?: string): MonitoringError {
    return new MonitoringError(
      reason ? `Service '${serviceName}' is unhealthy: ${reason}` : `Service '${serviceName}' is unhealthy`,
      serviceName
    );
  }

  static metricCollectionFailed(metricName: string, reason?: string): MonitoringError {
    return new MonitoringError(
      reason ? `Failed to collect metric '${metricName}': ${reason}` : `Failed to collect metric '${metricName}'`,
      undefined,
      metricName
    );
  }

  static healthCheckFailed(services: string[]): MonitoringError {
    return new MonitoringError(
      `Health check failed for services: ${services.join(', ')}`,
      services.join(',')
    );
  }

  static alertingFailed(alertName: string, channel: string): MonitoringError {
    const error = new MonitoringError(
      `Failed to send alert '${alertName}' to ${channel}`
    );
    (error as { code: string }).code = 'ALERTING_FAILED';
    return error;
  }
}
