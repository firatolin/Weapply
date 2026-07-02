import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

const router: Router = Router();

// Validation schema for profile update
const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nationality: z.string().optional(),
  countryOfResidence: z.string().optional(),
  educationLevel: z.string().optional(),
  gpa: z.number().min(0).max(4).optional().nullable(),
  fieldsOfInterest: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  budgetRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  skills: z.array(z.string()).optional(),
  careerGoal: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

// GET: Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Return empty profile if not exists
      return res.json({
        success: true,
        data: null,
        message: 'Profile not found',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch profile');
  }
});

// PUT: Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const validatedData = profileSchema.parse(req.body);

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    let profile;

    if (existingProfile) {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { userId },
        data: validatedData,
      });
    } else {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          userId,
          ...validatedData,
        },
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update profile');
  }
});

export { router as userRouter };