import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router: Router = Router();

// Validation schema for creating a scholarship
const createScholarshipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  provider: z.string().min(1, 'Provider is required'),
  providerType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE', 'NGO', 'OTHER']),
  eligibilityRules: z.any().optional(),
  targetFields: z.array(z.string()).optional(),
  targetNationalities: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  educationLevels: z.array(z.string()).optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  amountCurrency: z.string().default('USD'),
  scholarshipType: z.enum([
    'FULL',
    'PARTIAL',
    'MERIT_BASED',
    'NEED_BASED',
    'RESEARCH',
    'DIVERSITY',
  ]),
  applicationDeadline: z.string().datetime().optional(),
  decisionDate: z.string().datetime().optional(),
  notificationDate: z.string().datetime().optional(),
  applicationURL: z.string().url().optional(),
  applicationFee: z.number().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  essayPrompt: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// GET: List all scholarships (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Convert to numbers
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for search
    const where: any = {
      deletedAt: null, // Don't show deleted scholarships
    };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { provider: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Build order by
    const orderBy: any = {};
    orderBy[String(sortBy)] = String(sortOrder);

    // Get total count for pagination
    const total = await prisma.scholarship.count({ where });

    // Get scholarships
    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
    });

    res.json({
      data: scholarships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch scholarships');
  }
});

// GET: Get a single scholarship by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const scholarship = await prisma.scholarship.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!scholarship) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    // Increment view count
    await prisma.scholarship.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ data: scholarship });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch scholarship');
  }
});

// POST: Create a new scholarship (requires authentication)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = createScholarshipSchema.parse(req.body);

    // Add user ID to track who created it
    const data = {
      ...validatedData,
      source: 'ADMIN_CREATED',
      createdBy: req.user?.id,
    };

    const scholarship = await prisma.scholarship.create({
      data,
    });

    res.status(201).json({
      message: 'Scholarship created successfully',
      data: scholarship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.issues);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create scholarship');
  }
});

// PUT: Update a scholarship (requires authentication)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if scholarship exists
    const existing = await prisma.scholarship.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    // Validate request body
    const validatedData = createScholarshipSchema.parse(req.body);

    // Update scholarship
    const scholarship = await prisma.scholarship.update({
      where: { id },
      data: validatedData,
    });

    res.json({
      message: 'Scholarship updated successfully',
      data: scholarship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.issues);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update scholarship');
  }
});

// DELETE: Soft delete a scholarship (requires authentication)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if scholarship exists
    const existing = await prisma.scholarship.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    // Soft delete by setting deletedAt
    await prisma.scholarship.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({
      message: 'Scholarship deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to delete scholarship');
  }
});

export { router as scholarshipRouter };
