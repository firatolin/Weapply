import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { DeadlineService } from '../services/deadline.service.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Validation schemas
const createDeadlineSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['APPLICATION', 'SCHOLARSHIP', 'ADMISSION', 'DOCUMENT', 'INTERVIEW', 'TEST', 'OTHER']),
  dueDate: z.string().datetime(),
  dueTimezone: z.string().default('UTC'),
  reminderOffset: z.number().optional(),
  scholarshipId: z.string().optional(),
  universityId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  notes: z.string().optional(),
});

const updateDeadlineSchema = createDeadlineSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

/**
 * GET /api/v1/deadlines
 * Get user's deadlines
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const deadlines = await DeadlineService.getUserDeadlines(userId);
    res.json({
      success: true,
      data: deadlines,
    });
  } catch (error) {
    console.error('❌ Error fetching deadlines:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch deadlines');
  }
});

/**
 * GET /api/v1/deadlines/upcoming
 * Get upcoming deadlines
 */
router.get('/upcoming', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const deadlines = await DeadlineService.getUpcomingDeadlines(userId, days);
    res.json({
      success: true,
      data: deadlines,
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming deadlines:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch upcoming deadlines');
  }
});

/**
 * POST /api/v1/deadlines
 * Create a new deadline
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const validatedData = createDeadlineSchema.parse(req.body);
    
    const deadline = await DeadlineService.createDeadline({
      ...validatedData,
      userId,
      dueDate: new Date(validatedData.dueDate),
    });

    res.status(201).json({
      success: true,
      message: 'Deadline created successfully',
      data: deadline,
    });
  } catch (error) {
    console.error('❌ Error creating deadline:', error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create deadline');
  }
});

/**
 * GET /api/v1/deadlines/:id
 * Get a specific deadline
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const deadline = await DeadlineService.getDeadline(id, userId);
    if (!deadline) {
      throw new AppError(404, 'NOT_FOUND', 'Deadline not found');
    }

    res.json({
      success: true,
      data: deadline,
    });
  } catch (error) {
    console.error('❌ Error fetching deadline:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch deadline');
  }
});

/**
 * PUT /api/v1/deadlines/:id
 * Update a deadline
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const validatedData = updateDeadlineSchema.parse(req.body);
    
    if (validatedData.dueDate) {
      validatedData.dueDate = new Date(validatedData.dueDate) as any;
    }

    const deadline = await DeadlineService.updateDeadline(id, userId, validatedData);

    res.json({
      success: true,
      message: 'Deadline updated successfully',
      data: deadline,
    });
  } catch (error) {
    console.error('❌ Error updating deadline:', error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update deadline');
  }
});

/**
 * POST /api/v1/deadlines/:id/complete
 * Mark deadline as complete
 */
router.post('/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const deadline = await DeadlineService.markComplete(id, userId);

    res.json({
      success: true,
      message: 'Deadline marked as complete',
      data: deadline,
    });
  } catch (error) {
    console.error('❌ Error completing deadline:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to complete deadline');
  }
});

/**
 * DELETE /api/v1/deadlines/:id
 * Delete a deadline
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    await DeadlineService.deleteDeadline(id, userId);

    res.json({
      success: true,
      message: 'Deadline deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting deadline:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to delete deadline');
  }
});

/**
 * POST /api/v1/deadlines/from-scholarship/:scholarshipId
 * Auto-create deadline from scholarship
 */
router.post('/from-scholarship/:scholarshipId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { scholarshipId } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const deadline = await DeadlineService.createFromScholarship(userId, scholarshipId);

    res.status(201).json({
      success: true,
      message: 'Deadline created from scholarship',
      data: deadline,
    });
  } catch (error) {
    console.error('❌ Error creating deadline from scholarship:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create deadline from scholarship');
  }
});

export { router as deadlineRouter };