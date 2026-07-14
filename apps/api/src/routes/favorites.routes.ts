import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { DeadlineService } from '../services/deadline.service.js';

const router = Router();

/**
 * GET /favorites
 * Get user's favorite scholarships
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id,
        scholarship: {
          deletedAt: null,
        },
      },
      include: {
        scholarship: {
          include: {
            createdByUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: favorites.map((f) => f.scholarship),
    });
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch favorites');
  }
});

/**
 * POST /favorites/:scholarshipId
 * Add scholarship to favorites
 */
router.post('/:scholarshipId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { scholarshipId } = req.params;
    
    if (!req.user?.id) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Check if scholarship exists
    const scholarship = await prisma.scholarship.findFirst({
      where: { id: scholarshipId, deletedAt: null },
    });

    if (!scholarship) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_scholarshipId: {
          userId: req.user.id,
          scholarshipId: scholarshipId,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Scholarship already in favorites');
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        scholarshipId,
      },
      include: {
        scholarship: true,
      },
    });

// Auto-create deadline for this scholarship
if (favorite.scholarship?.applicationDeadline) {
  try {
    await DeadlineService.autoCreateDeadlinesFromScholarship(scholarshipId);
  } catch (error) {
    console.error('⚠️ Failed to auto-create deadline:', error);
    // Don't fail the favorite request if deadline creation fails
  }
}

res.status(201).json({
  success: true,
  message: 'Added to favorites',
  data: favorite.scholarship,
});

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data: favorite.scholarship,
    });
  } catch (error) {
    console.error('❌ Error adding favorite:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to add favorite');
  }
});

/**
 * DELETE /favorites/:scholarshipId
 * Remove scholarship from favorites
 */
router.delete('/:scholarshipId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { scholarshipId } = req.params;
    
    if (!req.user?.id) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Check if favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_scholarshipId: {
          userId: req.user.id,
          scholarshipId: scholarshipId,
        },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not in favorites');
    }

    // Remove from favorites
    await prisma.favorite.delete({
      where: {
        userId_scholarshipId: {
          userId: req.user.id,
          scholarshipId: scholarshipId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    console.error('❌ Error removing favorite:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to remove favorite');
  }
});

export { router as favoritesRouter };