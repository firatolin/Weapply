import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/error.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireStaff, requireAdmin } from '../middleware/roles.js';

const router: Router = Router();

// Validation schema for creating a scholarship
const createScholarshipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  provider: z.string().min(1, 'Provider is required'),
  providerType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE', 'NGO', 'OTHER']),
  scholarshipType: z.enum(['FULL', 'PARTIAL', 'MERIT_BASED', 'NEED_BASED', 'RESEARCH', 'DIVERSITY']),
  
  // Location fields
  country: z.string().optional(),
  continent: z.string().optional(),
  universityCountry: z.string().optional(),
  
  eligibilityRules: z.any().optional(),
  targetFields: z.array(z.string()).optional(),
  targetNationalities: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  educationLevels: z.array(z.string()).optional(),
  
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  amountCurrency: z.string().default('USD'),
  
  applicationDeadline: z.string().datetime().optional(),
  decisionDate: z.string().datetime().optional(),
  notificationDate: z.string().datetime().optional(),
  
  applicationURL: z.string().url().optional(),
  applicationFee: z.number().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  essayPrompt: z.string().optional(),
  
  // NEW: Requirements field
  requirements: z.any().optional(),
  
  tags: z.array(z.string()).optional(),
});

// GET: List all scholarships with advanced filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      // Filters
      country,
      continent,
      universityCountry,
      scholarshipType,
      minAmount,
      maxAmount,
      field,
      englishProficiency,
      minGpa,
      minWorkExperience,
      educationLevel,
      recentlyPosted,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { provider: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Country filter
    if (country) {
      const countries = Array.isArray(country) ? country : [country];
      where.country = { in: countries };
    }

    // Continent filter
    if (continent) {
      const continents = Array.isArray(continent) ? continent : [continent];
      where.continent = { in: continents };
    }

    // University Country filter
    if (universityCountry) {
      const uniCountries = Array.isArray(universityCountry) ? universityCountry : [universityCountry];
      where.universityCountry = { in: uniCountries };
    }

    // Scholarship Type filter
    if (scholarshipType) {
      const types = Array.isArray(scholarshipType) ? scholarshipType : [scholarshipType];
      where.scholarshipType = { in: types };
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      where.amountMin = {};
      if (minAmount) where.amountMin.gte = Number(minAmount);
      if (maxAmount) where.amountMin.lte = Number(maxAmount);
    }

    // Field filter
    if (field) {
      const fields = Array.isArray(field) ? field : [field];
      where.targetFields = { hasSome: fields };
    }

    // Education Level filter
    if (educationLevel) {
      const levels = Array.isArray(educationLevel) ? educationLevel : [educationLevel];
      where.educationLevels = { hasSome: levels };
    }

    // Recently Posted filter
    if (recentlyPosted === 'true') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
    }

    // Build order by
    const orderBy: any = {};
    orderBy[String(sortBy)] = String(sortOrder);

    const total = await prisma.scholarship.count({ where });

    const scholarships = await prisma.scholarship.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: scholarships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching scholarships:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch scholarships');
  }
});

// GET: Get pending scholarships for verification (ADMIN only)
router.get('/pending', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      isVerified: false,
      deletedAt: null,
    };

    const total = await prisma.scholarship.count({ where });

    const scholarships = await prisma.scholarship.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: scholarships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching pending scholarships:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch pending scholarships');
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
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
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
    console.error('❌ Error fetching scholarship:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch scholarship');
  }
});

// POST: Create a new scholarship (requires ADMIN or EMPLOYEE)
router.post('/', authMiddleware, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createScholarshipSchema.parse(req.body);

    console.log('👤 Creating scholarship for user:', req.user?.id);
    console.log('📧 User email:', req.user?.email);
    console.log('🔑 User role:', req.user?.role);

    const data = {
      ...validatedData,
      source: 'ADMIN_CREATED',
      createdBy: req.user?.id,
    };

    const scholarship = await prisma.scholarship.create({
      data,
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Scholarship created successfully',
      data: scholarship,
    });
  } catch (error) {
    console.error('❌ Error creating scholarship:', error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create scholarship');
  }
});

// PUT: Verify a scholarship (ADMIN only)
router.put('/:id/verify', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;

    if (verified === undefined) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Verified status is required');
    }

    const existing = await prisma.scholarship.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    const scholarship = await prisma.scholarship.update({
      where: { id },
      data: {
        isVerified: verified,
        lastVerifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? req.user?.id : null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: verified ? 'Scholarship verified successfully' : 'Scholarship unverified',
      data: scholarship,
    });
  } catch (error) {
    console.error('❌ Error verifying scholarship:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to verify scholarship');
  }
});

// PUT: Update a scholarship (requires ADMIN or EMPLOYEE)
router.put('/:id', authMiddleware, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.scholarship.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

    const validatedData = createScholarshipSchema.parse(req.body);

    const scholarship = await prisma.scholarship.update({
      where: { id },
      data: validatedData,
      include: {
        createdByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        verifiedByUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      message: 'Scholarship updated successfully',
      data: scholarship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update scholarship');
  }
});

// DELETE: Soft delete a scholarship (requires ADMIN only)
router.delete('/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.scholarship.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Scholarship not found');
    }

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