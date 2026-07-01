import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { AppError } from '../middleware/error.js';

const router = Router();

/**
 * GET /admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get total users
    const totalUsers = await prisma.user.count({
      where: { deletedAt: null },
    });

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    });

    // Get total scholarships
    const totalScholarships = await prisma.scholarship.count({
      where: { deletedAt: null },
    });

    // Get verified scholarships
    const verifiedScholarships = await prisma.scholarship.count({
      where: { isVerified: true, deletedAt: null },
    });

    // Get total favorites
    const totalFavorites = await prisma.favorite.count();

    // Get recent users (last 5)
    const recentUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get recent scholarships (last 5)
    const recentScholarships = await prisma.scholarship.findMany({
      where: { deletedAt: null },
      include: {
        createdByUser: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: true,
    });

    // Get scholarship status breakdown
    const scholarshipStatus = {
      verified: verifiedScholarships,
      pending: totalScholarships - verifiedScholarships,
      total: totalScholarships,
    };

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          totalScholarships,
          verifiedScholarships,
          totalFavorites,
          pendingScholarships: totalScholarships - verifiedScholarships,
        },
        recentUsers,
        recentScholarships,
        roleDistribution,
        scholarshipStatus,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch admin stats');
  }
});

/**
 * GET /admin/users
 * Get all users with pagination
 */
router.get('/users', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { displayName: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = String(role);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            countryOfResidence: true,
          },
        },
        _count: {
          select: {
            favorites: true,
            scholarships: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch users');
  }
});

/**
 * PUT /admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['VIEWER', 'EMPLOYEE', 'ADMIN'].includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role');
    }

    // Prevent changing your own role
    if (id === req.user?.id) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot change your own role');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update user role');
  }
});

/**
 * DELETE /admin/users/:id
 * Delete a user (soft delete)
 */
router.delete('/users/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user?.id) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot delete yourself');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to delete user');
  }
});

export { router as adminRouter };