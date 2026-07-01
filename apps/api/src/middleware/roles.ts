import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { AppError } from './error.js';

export type UserRole = 'VIEWER' | 'EMPLOYEE' | 'ADMIN';

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Get user role from the request (set by auth middleware)
    const userRole = req.user.role || 'VIEWER';

    if (!allowedRoles.includes(userRole as UserRole)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware to check if user has ADMIN role
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  return requireRole(['ADMIN'])(req, res, next);
};

/**
 * Middleware to check if user has ADMIN or EMPLOYEE role
 */
export const requireStaff = (req: AuthRequest, res: Response, next: NextFunction) => {
  return requireRole(['ADMIN', 'EMPLOYEE'])(req, res, next);
};