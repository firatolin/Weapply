import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { MatchingService } from '../services/matching.service.js';
import { AppError } from '../middleware/error.js';
import prisma from '../lib/prisma.js';

const router: Router = Router();

// GET: Get personalized scholarship matches for current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Check if user has a profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.json({
        success: true,
        data: [],
        needsProfile: true,
        message: 'Please complete your profile to get personalized matches',
      });
    }

    const result = await MatchingService.getMatchesForUser(userId);

    res.json({
      success: true,
      data: result.matches,
      total: result.total,
      averageScore: result.averageScore,
      needsProfile: false,
    });
  } catch (error) {
    console.error('❌ Error getting matches:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to get matches');
  }
});

// GET: Get top matches (default: 10)
router.get('/top', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const result = await MatchingService.getTopMatches(userId, limit);

    res.json({
      success: true,
      data: result.matches,
      total: result.total,
      count: result.matches.length,
      averageScore: result.averageScore,
    });
  } catch (error) {
    console.error('❌ Error getting top matches:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to get top matches');
  }
});

// GET: Get matches by minimum score (default: 60%)
router.get('/filter', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : 60;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const result = await MatchingService.getMatchesByScore(userId, minScore);

    res.json({
      success: true,
      data: result.matches,
      total: result.total,
      count: result.matches.length,
      minScore,
      averageScore: result.averageScore,
    });
  } catch (error) {
    console.error('❌ Error filtering matches:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to filter matches');
  }
});

// GET: Get match for a specific scholarship
router.get('/scholarship/:scholarshipId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { scholarshipId } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError(404, 'NOT_FOUND', 'User profile not found');
    }

    // Get scholarship
    const scholarship = await prisma.scholarship.findFirst({
      where: {
        id: scholarshipId,
        isVerified: true,
        deletedAt: null,
      },
    });

    if (!scholarship) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    const match = MatchingService.calculateMatchScore(profile, scholarship);

    res.json({
      success: true,
      data: {
        scholarship,
        score: match.score,
        breakdown: match.breakdown,
        reasons: match.reasons,
      },
    });
  } catch (error) {
    console.error('❌ Error calculating match:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to calculate match');
  }
});

export { router as matchingRouter };