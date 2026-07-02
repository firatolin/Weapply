import prisma from '../lib/prisma.js';
import aiService from './ai.service.js';

export class MatchingService {
  /**
   * Get AI-powered matches for a user
   */
  static async getMatchesForUser(userId: string) {
    try {
      // Get user profile
      const profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new Error('User profile not found. Please complete your profile first.');
      }

      // Get all verified scholarships
      const scholarships = await prisma.scholarship.findMany({
        where: {
          isVerified: true,
          deletedAt: null,
        },
        include: {
          createdByUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      });

      if (scholarships.length === 0) {
        return {
          matches: [],
          message: 'No verified scholarships available yet.',
        };
      }

      // Calculate AI-powered scores for each scholarship
      const matches = await Promise.all(
        scholarships.map(async (scholarship) => {
          // Get AI match score
          const aiMatch = await aiService.getSemanticMatchScore(profile, scholarship);
          
          return {
            scholarship,
            score: aiMatch.score,
            reasoning: aiMatch.reasoning,
            breakdown: {
              fieldMatch: aiMatch.fieldMatch,
              educationMatch: aiMatch.educationMatch,
              countryMatch: aiMatch.countryMatch,
              financialFit: aiMatch.financialFit,
            },
            suggestions: aiMatch.suggestions,
          };
        })
      );

      // Sort by score (highest first)
      matches.sort((a, b) => b.score - a.score);

      return {
        matches,
        total: matches.length,
        averageScore: matches.reduce((acc, m) => acc + m.score, 0) / matches.length,
      };
    } catch (error) {
      console.error('❌ Error getting matches:', error);
      throw error;
    }
  }

  /**
   * Get top N matches
   */
  static async getTopMatches(userId: string, limit: number = 10) {
    const result = await MatchingService.getMatchesForUser(userId);
    return {
      ...result,
      matches: result.matches.slice(0, limit),
    };
  }

  /**
   * Get matches by minimum score
   */
  static async getMatchesByScore(userId: string, minScore: number = 60) {
    const result = await MatchingService.getMatchesForUser(userId);
    return {
      ...result,
      matches: result.matches.filter((match) => match.score >= minScore),
    };
  }
}