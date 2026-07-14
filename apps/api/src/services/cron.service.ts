import { DeadlineService } from './deadline.service.js';
import prisma from '../lib/prisma.js';

export class CronService {
  /**
   * Run daily to check for new scholarships with deadlines
   */
  static async runDailyDeadlineCheck() {
    console.log('🔄 Running daily deadline check...');

    // Get all verified scholarships with deadlines
    const scholarships = await prisma.scholarship.findMany({
      where: {
        isVerified: true,
        deletedAt: null,
        applicationDeadline: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        applicationDeadline: true,
      },
    });

    console.log(`📅 Found ${scholarships.length} scholarships with deadlines`);

    for (const scholarship of scholarships) {
      await DeadlineService.autoCreateDeadlinesFromScholarship(scholarship.id);
    }

    console.log('✅ Daily deadline check complete');
  }
}