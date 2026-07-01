import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireStaff } from '../middleware/roles.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * GET /employee/stats
 * Get employee dashboard statistics
 */
router.get('/stats', authMiddleware, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log('👤 Fetching employee stats for user:', userId);

    // Get user's scholarships
    const myScholarships = await prisma.scholarship.count({
      where: {
        createdBy: userId,
        deletedAt: null,
      },
    });

    // Get pending reviews (scholarships created by user not verified)
    const pendingReviews = await prisma.scholarship.count({
      where: {
        createdBy: userId,
        isVerified: false,
        deletedAt: null,
      },
    });

    // Get all scholarships created by user
    const allScholarships = await prisma.scholarship.findMany({
      where: {
        createdBy: userId,
        deletedAt: null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get verified count
    const verifiedScholarships = allScholarships.filter((s) => s.isVerified).length;

    // Get recent scholarships (last 5)
    const recentScholarships = allScholarships.slice(0, 5);

    // Get applications count (for now, this is 0 until we build applications)
    const applications = 0;

    console.log('📊 Employee stats:', {
      myScholarships,
      pendingReviews,
      applications,
      totalScholarships: allScholarships.length,
      verifiedScholarships,
    });

    res.json({
      success: true,
      data: {
        stats: {
          myScholarships,
          pendingReviews,
          applications,
          totalScholarships: allScholarships.length,
          verifiedScholarships,
        },
        recentScholarships,
        allScholarships,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching employee stats:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch employee stats');
  }
});

/**
 * GET /employee/scholarships
 * Get all scholarships created by the employee
 */
router.get('/scholarships', authMiddleware, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const scholarships = await prisma.scholarship.findMany({
      where: {
        createdBy: userId,
        deletedAt: null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: scholarships,
    });
  } catch (error) {
    console.error('❌ Error fetching employee scholarships:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch scholarships');
  }
});

export { router as employeeRouter };