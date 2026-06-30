import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { AppError } from './error.js';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName?: string;
    photoURL?: string;
    id?: string; // Database user ID
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
    
    // Verify Firebase token
    if (!adminAuth) {
      throw new AppError(500, 'SERVER_ERROR', 'Firebase admin is not initialized');
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get user info from Firebase
    const firebaseUser = await adminAuth.getUser(decodedToken.uid);
    
    // Find or create user in database
    let dbUser = await prisma.user.findUnique({
      where: { uid: firebaseUser.uid },
    });

    if (!dbUser) {
      // Create user if doesn't exist (should already exist from sync)
      dbUser = await prisma.user.create({
        data: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          emailVerified: firebaseUser.emailVerified || false,
          lastLoginAt: new Date(),
        },
      });
      
      // Create profile
      await prisma.profile.create({
        data: {
          userId: dbUser.id,
          firstName: firebaseUser.displayName?.split(' ')[0] || null,
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || null,
          fieldsOfInterest: [],
          targetCountries: [],
        },
      });
    }

    // Set user in request with database ID
    req.user = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      emailVerified: firebaseUser.emailVerified || false,
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      id: dbUser.id, // Add the database ID
    };
    
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
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