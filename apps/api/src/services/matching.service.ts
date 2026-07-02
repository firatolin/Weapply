import prisma from '../lib/prisma.js';

export class MatchingService {
  /**
   * Calculate match score between a user profile and a scholarship
   */
  static calculateMatchScore(profile: any, scholarship: any): {
    score: number;
    breakdown: {
      fieldMatch: number;
      educationMatch: number;
      countryMatch: number;
      financialFit: number;
    };
    reasons: string[];
  } {
    let totalScore = 0;
    const reasons: string[] = [];
    let maxPossibleScore = 0;

    // 1. Field of Study Match (30% weight)
    const fieldWeight = 30;
    maxPossibleScore += fieldWeight;
    
    // Use fieldsOfInterest from profile (existing field)
    const profileFields = profile.fieldsOfInterest || [];
    const scholarshipFields = scholarship.targetFields || [];
    
    if (profileFields.length > 0 && scholarshipFields.length > 0) {
      const fieldOverlap = profileFields.filter((f: string) =>
        scholarshipFields.includes(f)
      ).length;
      
      const fieldScore = (fieldOverlap / Math.max(profileFields.length, scholarshipFields.length)) * fieldWeight;
      totalScore += fieldScore;
      
      if (fieldScore > 0) {
        reasons.push(`✅ ${Math.round(fieldScore)}% match in field of study (${fieldOverlap} fields match)`);
      } else {
        reasons.push('❌ No matching fields of study');
      }
    } else {
      reasons.push('⚠️ No fields of study specified');
    }

    // 2. Education Level Match (25% weight)
    const eduWeight = 25;
    maxPossibleScore += eduWeight;
    
    if (profile.educationLevel && scholarship.educationLevels?.length > 0) {
      if (scholarship.educationLevels.includes(profile.educationLevel)) {
        totalScore += eduWeight;
        reasons.push(`✅ Your education level (${profile.educationLevel}) matches the requirements`);
      } else {
        reasons.push(`❌ Education level (${profile.educationLevel}) doesn't match requirements`);
      }
    } else {
      reasons.push('⚠️ Education level not specified or not required');
    }

    // 3. Country Match (20% weight)
    const countryWeight = 20;
    maxPossibleScore += countryWeight;
    
    const profileCountry = profile.countryOfResidence;
    const scholarshipCountries = scholarship.targetCountries || [];
    
    if (profileCountry && scholarshipCountries.length > 0) {
      if (scholarshipCountries.includes(profileCountry) || scholarshipCountries.includes('Global') || scholarshipCountries.includes('All')) {
        totalScore += countryWeight;
        reasons.push(`✅ Your country (${profileCountry}) is eligible`);
      } else {
        reasons.push(`❌ Your country (${profileCountry}) is not in the eligible list`);
      }
    } else {
      reasons.push('⚠️ Country not specified or no country restrictions');
    }

    // 4. Financial Fit (25% weight)
    const financialWeight = 25;
    maxPossibleScore += financialWeight;
    
    const budgetRange = profile.budgetRange || {};
    const budgetMin = budgetRange.min || 0;
    const budgetMax = budgetRange.max || 1000000;
    const scholarshipAmount = scholarship.amountMin || 0;
    
    if (scholarshipAmount > 0) {
      if (scholarshipAmount <= budgetMax) {
        totalScore += financialWeight;
        reasons.push(`✅ Scholarship amount ($${scholarshipAmount}) fits your budget`);
      } else if (scholarshipAmount <= budgetMax * 1.2) {
        // Close to budget
        totalScore += financialWeight * 0.6;
        reasons.push(`⚠️ Scholarship amount ($${scholarshipAmount}) is slightly above your budget`);
      } else {
        reasons.push(`❌ Scholarship amount ($${scholarshipAmount}) exceeds your budget`);
      }
    } else {
      reasons.push('⚠️ Scholarship amount not specified');
    }

    // Calculate final score as percentage
    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      score: Math.round(finalScore),
      breakdown: {
        fieldMatch: profileFields.length > 0 && scholarshipFields.length > 0
          ? Math.round((profileFields.filter((f: string) => scholarshipFields.includes(f)).length /
              Math.max(profileFields.length, scholarshipFields.length)) * 100)
          : 0,
        educationMatch: profile.educationLevel && scholarship.educationLevels?.includes(profile.educationLevel) ? 100 : 0,
        countryMatch: profile.countryOfResidence && 
          (scholarship.targetCountries?.includes(profile.countryOfResidence) || 
           scholarship.targetCountries?.includes('Global') || 
           scholarship.targetCountries?.includes('All')) ? 100 : 0,
        financialFit: scholarship.amountMin && budgetRange?.max && scholarship.amountMin <= budgetRange.max ? 100 : 0,
      },
      reasons,
    };
  }

  /**
   * Get matching scholarships for a user with scores
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

      // Calculate scores for each scholarship
      const matches = scholarships.map((scholarship) => {
        const result = MatchingService.calculateMatchScore(profile, scholarship);
        return {
          scholarship,
          score: result.score,
          breakdown: result.breakdown,
          reasons: result.reasons,
        };
      });

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
   * Get top N matches for a user
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