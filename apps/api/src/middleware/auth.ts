import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // TODO: Verify Firebase token
    // For now, just pass through
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      emailVerified: true,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

export const requireEmailVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.emailVerified) {
    throw new AppError(403, 'FORBIDDEN', 'Email not verified');
  }
  next();
};
