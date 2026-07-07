import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service'; // Ensure the file exists and remove '.js' if using TypeScript
import { AppError } from '../middleware/error.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Validation schema for document generation
const generateSchema = z.object({
  type: z.enum(['CV', 'SOP', 'MOTIVATION_LETTER', 'ESSAY', 'RECOMMENDATION_EMAIL']),
  title: z.string().min(3),
  description: z.string().optional(),
  scholarshipId: z.string().optional(),
  universityId: z.string().optional(),
  additionalInstructions: z.string().optional(),
  language: z.string().default('English'),
});

/**
 * POST /api/v1/documents/generate
 * Generate a new document
 */
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = generateSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError(400, 'BAD_REQUEST', 'Please complete your profile first');
    }

    // Get scholarship if provided
    let scholarship = null;
    if (validatedData.scholarshipId) {
      scholarship = await prisma.scholarship.findUnique({
        where: { id: validatedData.scholarshipId, deletedAt: null },
      });
    }

    // Get university if provided
    let university = null;
    if (validatedData.universityId) {
      university = await prisma.university.findUnique({
        where: { id: validatedData.universityId, deletedAt: null },
      });
    }

    // Generate document
    const result = await DocumentService.generateDocument({
      type: validatedData.type,
      title: validatedData.title,
      description: validatedData.description,
      profileData: profile,
      scholarship,
      university,
      additionalInstructions: validatedData.additionalInstructions,
      language: validatedData.language,
    });

    // Save document
    const document = await DocumentService.saveDocument(
      userId,
      validatedData.type,
      validatedData.title,
      result.content,
      result.aiScore,
      {
        ...result.metadata,
        description: validatedData.description,
        additionalInstructions: validatedData.additionalInstructions,
      },
      validatedData.scholarshipId,
      validatedData.universityId
    );

    res.status(201).json({
      success: true,
      message: 'Document generated successfully',
      data: {
        document,
        content: result.content,
        wordCount: result.wordCount,
        aiScore: result.aiScore,
      },
    });
  } catch (error) {
    console.error('❌ Error generating document:', error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', error.errors);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to generate document');
  }
});

/**
 * GET /api/v1/documents
 * Get user's documents
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const documents = await DocumentService.getUserDocuments(userId);

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch documents');
  }
});

/**
 * GET /api/v1/documents/:id
 * Get a specific document
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const document = await DocumentService.getDocument(id);

    if (!document) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    // Check ownership
    if (document.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch document');
  }
});

/**
 * PUT /api/v1/documents/:id
 * Update document content (create new version)
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, changeDescription } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    if (!content) {
      throw new AppError(400, 'BAD_REQUEST', 'Content is required');
    }

    // Check ownership
    const existing = await prisma.document.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    if (existing.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    const version = await DocumentService.createNewVersion(
      id,
      content,
      changeDescription || 'User edited document'
    );

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: version,
    });
  } catch (error) {
    console.error('❌ Error updating document:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to update document');
  }
});

/**
 * DELETE /api/v1/documents/:id
 * Delete a document
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Check ownership
    const existing = await prisma.document.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    if (existing.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    await DocumentService.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to delete document');
  }
});

export { router as documentRouter };