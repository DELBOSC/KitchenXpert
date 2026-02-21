import { ApiError } from './api-error';

/**
 * Erreur de permission spécifique (403)
 * Utilisé pour les erreurs liées au système RBAC
 */
export class PermissionError extends ApiError {
  public readonly requiredPermission?: string;
  public readonly userPermissions?: string[];

  constructor(
    requiredPermission?: string,
    userPermissions?: string[],
    message = 'Permission denied'
  ) {
    const details = {
      ...(requiredPermission && { requiredPermission }),
      ...(userPermissions && { userPermissions }),
    };

    super(
      message,
      403,
      'PERMISSION_DENIED',
      true,
      Object.keys(details).length > 0 ? details : undefined
    );

    this.requiredPermission = requiredPermission;
    this.userPermissions = userPermissions;
  }

  static insufficientRole(requiredRole: string, currentRole: string): PermissionError {
    return new PermissionError(
      undefined,
      undefined,
      `Role '${currentRole}' is not sufficient. Required: '${requiredRole}'`
    );
  }

  static resourceAccessDenied(resource: string, action: string): PermissionError {
    return new PermissionError(
      `${resource}:${action}`,
      undefined,
      `You don't have permission to ${action} this ${resource}`
    );
  }
}
