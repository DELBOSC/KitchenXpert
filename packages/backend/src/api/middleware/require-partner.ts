import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/client';
import { Partner } from '@prisma/client';

/**
 * Extend the Express Request type to include the authenticated partner
 */
declare global {
  namespace Express {
    interface Request {
      partner?: Partner;
    }
  }
}

/**
 * Middleware: requirePartner
 *
 * Must be used AFTER the `authenticate` middleware.
 * Looks up the Partner record whose email matches the authenticated user's email.
 * If found and active, attaches it to `req.partner` and calls next().
 * Returns 403 if no active Partner record is associated with this user.
 *
 * NOTE: The Partner model is identified by email (no userId FK in current schema).
 * Partners register via the standard auth flow; their Partner record is created
 * by an admin and linked by matching email addresses.
 */
export const requirePartner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.email) {
      res.status(403).json({ error: 'Partner account required' });
      return;
    }

    const partner = await prisma.partner.findFirst({
      where: { email: req.user.email },
    });

    if (!partner || !partner.isActive) {
      res.status(403).json({ error: 'Partner account required' });
      return;
    }

    req.partner = partner;
    next();
  } catch (error) {
    next(error);
  }
};
