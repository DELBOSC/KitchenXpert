/**
 * Auth Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Simple auth middleware implementation for testing
const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'test-secret');
    (req as any).user = decoded;
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should call next() with valid token', () => {
      const mockUser = { userId: 'user-1', email: 'test@example.com' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect((mockReq as any).user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', () => {
      mockReq.headers = {};

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if authorization header has invalid token format', () => {
      // When format is "InvalidFormat token", split(' ')[1] returns 'token'
      // which will fail jwt.verify, resulting in 403
      mockReq.headers = { authorization: 'InvalidFormat token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is present but empty after Bearer', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if token is expired', () => {
      mockReq.headers = { authorization: 'Bearer expired-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('Role-based Authorization', () => {
  const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  };

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  it('should allow access for users with correct role', () => {
    (mockReq as any).user = { userId: 'user-1', role: 'admin' };
    const middleware = requireRole(['admin', 'manager']);

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should deny access for users without correct role', () => {
    (mockReq as any).user = { userId: 'user-1', role: 'user' };
    const middleware = requireRole(['admin', 'manager']);

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient permissions',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if user not authenticated', () => {
    (mockReq as any).user = undefined;
    const middleware = requireRole(['admin']);

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: 'Not authenticated',
    });
  });
});

describe('Permission-based Authorization', () => {
  const requirePermission = (resource: string, action: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const permissions = user.permissions || [];
      const hasPermission = permissions.some(
        (p: { resource: string; action: string }) => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        res.status(403).json({ success: false, error: `Permission denied: ${resource}:${action}` });
        return;
      }

      next();
    };
  };

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  it('should allow access with correct permission', () => {
    (mockReq as any).user = {
      userId: 'user-1',
      permissions: [
        { resource: 'kitchen', action: 'read' },
        { resource: 'kitchen', action: 'write' },
      ],
    };
    const middleware = requirePermission('kitchen', 'write');

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny access without correct permission', () => {
    (mockReq as any).user = {
      userId: 'user-1',
      permissions: [{ resource: 'kitchen', action: 'read' }],
    };
    const middleware = requirePermission('kitchen', 'delete');

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: 'Permission denied: kitchen:delete',
    });
  });

  it('should deny access with no permissions', () => {
    (mockReq as any).user = { userId: 'user-1', permissions: [] };
    const middleware = requirePermission('kitchen', 'read');

    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(403);
  });
});
