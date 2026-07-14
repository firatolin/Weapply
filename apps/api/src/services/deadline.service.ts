import prisma from '../lib/prisma.js';
import { Deadline, Reminder, Priority } from '@prisma/client';

export class DeadlineService {
  /**
   * Auto-create deadlines from scholarships
   * This runs when a scholarship is created or updated
   */
  static async autoCreateDeadlinesFromScholarship(scholarshipId: string) {
    try {
      // Get the scholarship with all details
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId, deletedAt: null },
        include: {
          createdByUser: true,
        },
      });

      if (!scholarship) {
        console.log('❌ Scholarship not found:', scholarshipId);
        return;
      }

      // Check if scholarship has a deadline
      if (!scholarship.applicationDeadline) {
        console.log(`⏭️ Scholarship "${scholarship.name}" has no deadline, skipping`);
        return;
      }

      console.log(`📅 Auto-creating deadline for scholarship: ${scholarship.name}`);

      // Find all users who might be interested (for now, we'll link to the creator)
      // In production, this would be all users who favorited or applied to this scholarship
      const users = await prisma.user.findMany({
        where: {
          favorites: {
            some: {
              scholarshipId: scholarship.id,
            },
          },
        },
        select: { id: true },
      });

      // Also include the creator
      if (scholarship.createdBy) {
        users.push({ id: scholarship.createdBy });
      }

      // Remove duplicates
      const uniqueUserIds = [...new Set(users.map(u => u.id))];

      console.log(`👤 Creating deadlines for ${uniqueUserIds.length} users`);

      // Create deadlines for each user
      for (const userId of uniqueUserIds) {
        // Check if deadline already exists
        const existing = await prisma.deadline.findFirst({
          where: {
            userId,
            scholarshipId: scholarship.id,
            deletedAt: null,
          },
        });

        if (existing) {
          // Update existing deadline if needed
          await prisma.deadline.update({
            where: { id: existing.id },
            data: {
              dueDate: scholarship.applicationDeadline,
              title: `Apply: ${scholarship.name}`,
              description: scholarship.description || `Application deadline for ${scholarship.name}`,
              updatedAt: new Date(),
            },
          });
          console.log(`✅ Updated deadline for user ${userId}`);
        } else {
          // Create new deadline
          await prisma.deadline.create({
            data: {
              userId,
              title: `Apply: ${scholarship.name}`,
              description: scholarship.description || `Application deadline for ${scholarship.name}`,
              type: 'SCHOLARSHIP',
              dueDate: scholarship.applicationDeadline,
              scholarshipId: scholarship.id,
              priority: 'HIGH',
              reminderOffset: 7 * 24 * 60, // 7 days before
            },
          });
          console.log(`✅ Created deadline for user ${userId}`);
        }
      }

      console.log(`✅ Auto-created deadlines for scholarship: ${scholarship.name}`);
    } catch (error) {
      console.error('❌ Error auto-creating deadlines:', error);
    }
  }

  /**
   * Update deadlines when scholarship is updated
   */
  static async updateDeadlinesFromScholarship(scholarshipId: string) {
    try {
      const scholarship = await prisma.scholarship.findUnique({
        where: { id: scholarshipId, deletedAt: null },
      });

      if (!scholarship) {
        console.log('❌ Scholarship not found:', scholarshipId);
        return;
      }

      if (!scholarship.applicationDeadline) {
        // If no deadline, delete all related deadlines
        await prisma.deadline.updateMany({
          where: {
            scholarshipId: scholarship.id,
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        console.log(`🗑️ Removed deadlines for scholarship: ${scholarship.name}`);
        return;
      }

      // Update all existing deadlines
      await prisma.deadline.updateMany({
        where: {
          scholarshipId: scholarship.id,
          deletedAt: null,
        },
        data: {
          dueDate: scholarship.applicationDeadline,
          title: `Apply: ${scholarship.name}`,
          description: scholarship.description || `Application deadline for ${scholarship.name}`,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Updated deadlines for scholarship: ${scholarship.name}`);
    } catch (error) {
      console.error('❌ Error updating deadlines:', error);
    }
  }

  /**
   * Delete deadlines when scholarship is deleted
   */
  static async deleteDeadlinesFromScholarship(scholarshipId: string) {
    try {
      await prisma.deadline.updateMany({
        where: {
          scholarshipId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      console.log(`🗑️ Removed deadlines for scholarship: ${scholarshipId}`);
    } catch (error) {
      console.error('❌ Error deleting deadlines:', error);
    }
  }

  /**
   * Get user's deadlines (including auto-created from scholarships)
   */
  static async getUserDeadlines(userId: string) {
    return prisma.deadline.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        reminders: true,
        scholarship: {
          select: {
            id: true,
            name: true,
            provider: true,
            isVerified: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get upcoming deadlines (including auto-created from scholarships)
   */
  static async getUpcomingDeadlines(userId: string, days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return prisma.deadline.findMany({
      where: {
        userId,
        deletedAt: null,
        isCompleted: false,
        dueDate: {
          gte: now,
          lte: future,
        },
      },
      include: {
        reminders: true,
        scholarship: {
          select: {
            id: true,
            name: true,
            provider: true,
            isVerified: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get a single deadline
   */
  static async getDeadline(id: string, userId: string) {
    return prisma.deadline.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        reminders: true,
        scholarship: true,
        university: true,
      },
    });
  }

  /**
   * Mark deadline as completed
   */
  static async markComplete(id: string, userId: string) {
    const existing = await prisma.deadline.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Deadline not found');
    }

    return prisma.deadline.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
      include: {
        reminders: true,
        scholarship: true,
        university: true,
      },
    });
  }

  /**
   * Delete a deadline
   */
  static async deleteDeadline(id: string, userId: string) {
    const existing = await prisma.deadline.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Deadline not found');
    }

    await prisma.reminder.deleteMany({
      where: { deadlineId: id },
    });

    return prisma.deadline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get deadline statistics for a user
   */
  static async getDeadlineStats(userId: string) {
    const total = await prisma.deadline.count({
      where: { userId, deletedAt: null },
    });

    const completed = await prisma.deadline.count({
      where: { userId, deletedAt: null, isCompleted: true },
    });

    const upcoming = await prisma.deadline.count({
      where: {
        userId,
        deletedAt: null,
        isCompleted: false,
        dueDate: { gte: new Date() },
      },
    });

    const overdue = await prisma.deadline.count({
      where: {
        userId,
        deletedAt: null,
        isCompleted: false,
        dueDate: { lt: new Date() },
      },
    });

    return { total, completed, upcoming, overdue };
  }

  /**
   * Get deadlines for a specific scholarship
   */
  static async getDeadlinesForScholarship(scholarshipId: string) {
    return prisma.deadline.findMany({
      where: {
        scholarshipId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        reminders: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}