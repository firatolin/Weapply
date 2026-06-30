import { Router, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { UserService } from '../services/user.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router: Router = Router();

/**
 * POST /auth/sync
 * Sync Firebase user with database
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Sync request received');
    
    // Check if Firebase Admin is initialized
    if (!adminAuth) {
      console.error('❌ Firebase Admin not initialized');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error - Firebase not initialized'
      });
    }
    
    const { token } = req.body;
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    console.log('🔑 Verifying token...');
    
    // Verify the Firebase token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (verifyError) {
      console.error('❌ Token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    console.log('✅ Token verified for user:', decodedToken.uid);
    
    // Get user from Firebase
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUser(decodedToken.uid);
      console.log('👤 Firebase user found:', firebaseUser.email);
    } catch (userError) {
      console.error('❌ Failed to get Firebase user:', userError);
      return res.status(404).json({
        success: false,
        error: 'User not found in Firebase'
      });
    }
    
    // Create or update user in database
    let user;
    try {
      user = await UserService.findOrCreateUser(firebaseUser);
      console.log('💾 User saved to database:', user.id);
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save user to database'
      });
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('❌ Unhandled sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
    }

    const user = await UserService.getUserByUid(req.user.uid);
    
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to get user');
  }
});

export { router as authRouter };