import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { AppError } from '../middleware/error.js';

const router: Router = Router();

/**
 * GET /admin/users
 * List all users (ADMIN only)
 */
router.get('/users', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch users');
  }
});

/**
 * PUT /admin/users/:id/role
 * Update user role (ADMIN only)
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

export { router as adminRouter };