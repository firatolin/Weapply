import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');

export interface DocumentGenerationOptions {
  type: 'CV' | 'SOP' | 'MOTIVATION_LETTER' | 'ESSAY' | 'RECOMMENDATION_EMAIL';
  title: string;
  description?: string;
  profileData: any;
  scholarship?: any;
  university?: any;
  additionalInstructions?: string;
  language?: string;
  maxTokens?: number;
  temperature?: number;
}

export class DocumentService {
  /**
   * Generate a document using Gemini AI
   */
  static async generateDocument(options: DocumentGenerationOptions): Promise<{
    content: string;
    wordCount: number;
    aiScore: number;
    metadata: any;
  }> {
    const {
      type,
      title,
      profileData,
      scholarship,
      university,
      additionalInstructions,
      language = 'English',
      temperature = 0.7,
      maxTokens = 2000,
    } = options;

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const prompt = this.buildDocumentPrompt({
        type,
        profileData,
        scholarship,
        university,
        additionalInstructions,
        language,
      });

      console.log('🔄 Generating document with prompt:', prompt.substring(0, 200) + '...');

      const result = await model.generateContent(prompt);
      const response = result.response;
      const content = response.text();

      // Calculate word count
      const wordCount = content.split(/\s+/).length;

      // Generate AI score (self-assessment)
      const aiScore = await this.evaluateDocument(content, type);

      return {
        content,
        wordCount,
        aiScore,
        metadata: {
          type,
          language,
          temperature,
          maxTokens,
        },
      };
    } catch (error) {
      console.error('❌ Error generating document:', error);
      throw new Error('Failed to generate document');
    }
  }

  /**
   * Build the prompt for document generation
   */
  private static buildDocumentPrompt(options: any): string {
    const { type, profileData, scholarship, university, additionalInstructions, language } = options;

    let prompt = `You are an expert academic writer and career counselor. Create a professional ${type} for a student.

STUDENT PROFILE:
${this.formatProfile(profileData)}

`;

    if (scholarship) {
      prompt += `SCHOLARSHIP INFORMATION:
Name: ${scholarship.name}
Provider: ${scholarship.provider}
Type: ${scholarship.scholarshipType}
Description: ${scholarship.description || 'Not specified'}
`;
    }

    if (university) {
      prompt += `UNIVERSITY INFORMATION:
Name: ${university.name}
Country: ${university.country}
`;
    }

    prompt += `
ADDITIONAL INSTRUCTIONS:
${additionalInstructions || 'Please create a compelling and professional document.'}

LANGUAGE: ${language}

IMPORTANT GUIDELINES:
1. The document must be original and tailored to the student's profile
2. Use a professional, academic tone
3. Highlight the student's strengths, achievements, and goals
4. Be specific and provide concrete examples
5. ${type === 'CV' ? 'Use a clear, professional format with sections like Education, Experience, Skills, etc.' : ''}
6. ${type === 'SOP' ? 'Start with a compelling introduction, explain academic journey, career goals, and why this program/university, end with a strong conclusion.' : ''}
7. ${type === 'MOTIVATION_LETTER' ? 'Write a persuasive letter explaining why the student is a good fit and their motivation.' : ''}
8. ${type === 'ESSAY' ? 'Write a well-structured essay with a clear thesis, supporting arguments, and a conclusion.' : ''}
9. ${type === 'RECOMMENDATION_EMAIL' ? 'Write a professional email asking for a recommendation letter.' : ''}

Please provide only the document content, no additional commentary.
`;

    return prompt;
  }

  /**
   * Format profile data for the prompt
   */
  private static formatProfile(profileData: any): string {
    const lines = [];
    if (profileData.firstName) lines.push(`Name: ${profileData.firstName} ${profileData.lastName || ''}`);
    if (profileData.educationLevel) lines.push(`Education Level: ${profileData.educationLevel}`);
    if (profileData.fieldsOfInterest?.length) lines.push(`Fields of Interest: ${profileData.fieldsOfInterest.join(', ')}`);
    if (profileData.skills?.length) lines.push(`Skills: ${profileData.skills.join(', ')}`);
    if (profileData.careerGoal) lines.push(`Career Goal: ${profileData.careerGoal}`);
    if (profileData.gpa) lines.push(`GPA: ${profileData.gpa}`);
    if (profileData.targetCountries?.length) lines.push(`Target Countries: ${profileData.targetCountries.join(', ')}`);
    
    return lines.join('\n');
  }

  /**
   * Evaluate document quality using AI
   */
  private static async evaluateDocument(content: string, type: string): Promise<number> {
    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
      });

      const prompt = `
You are an expert evaluator of academic and professional documents. Score the following ${type} on a scale of 0-100 based on:
- Clarity and coherence (25 points)
- Professionalism and tone (25 points)
- Relevance to purpose (25 points)
- Grammar and language quality (25 points)

Document:
${content.substring(0, 3000)}

Return ONLY a number between 0-100.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const score = parseInt(response.trim());
      
      return isNaN(score) ? 70 : Math.min(Math.max(score, 0), 100);
    } catch (error) {
      console.error('❌ Error evaluating document:', error);
      return 70;
    }
  }

  /**
   * Save document to database
   */
  static async saveDocument(
    userId: string,
    type: string,
    title: string,
    content: string,
    aiScore: number,
    metadata: any,
    scholarshipId?: string,
    universityId?: string
  ) {
    // Create document
    const document = await prisma.document.create({
      data: {
        userId,
        type: type as any,
        title,
        description: metadata.description || '',
        promptVersion: 'v1',
        aiModel: 'gemini-2.5-flash',
        wordCount: content.split(/\s+/).length,
        language: metadata.language || 'English',
        isGenerated: true,
        scholarshipId,
        universityId,
      },
    });

    // Create first version
    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        content,
        versionNumber: 1,
        isCurrent: true,
        generationPrompt: metadata.prompt || '',
        generationParams: metadata,
        aiScore,
      },
    });

    // Update document with current version
    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    });

    return document;
  }

  /**
   * Get document with all versions
   */
  static async getDocument(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string) {
    return prisma.document.findMany({
      where: { userId, deletedAt: null },
      include: {
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Create a new version of a document
   */
  static async createNewVersion(
    documentId: string,
    content: string,
    changeDescription?: string
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const nextVersion = document.versions.length + 1;

    // Set all existing versions to not current
    await prisma.documentVersion.updateMany({
      where: { documentId },
      data: { isCurrent: false },
    });

    // Create new version
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        content,
        versionNumber: nextVersion,
        isCurrent: true,
        changeDescription,
        wordCount: content.split(/\s+/).length,
      },
    });

    // Update document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: version.id,
        updatedAt: new Date(),
        isEdited: true,
        wordCount: content.split(/\s+/).length,
      },
    });

    return version;
  }

  /**
   * Delete a document (soft delete)
   */
  static async deleteDocument(documentId: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
  }
}