import prisma from '../lib/prisma.js';
import { Deadline, Reminder, Priority } from '@prisma/client';

export class DeadlineService {
  /**
   * Create a new deadline
   */
  static async createDeadline(data: {
    userId: string;
    title: string;
    description?: string;
    type: string;
    dueDate: Date;
    dueTimezone?: string;
    reminderOffset?: number;
    scholarshipId?: string;
    universityId?: string;
    priority?: string;
    notes?: string;
  }) {
    const deadline = await prisma.deadline.create({
      data: {
        ...data,
        dueTimezone: data.dueTimezone || 'UTC',
        priority: data.priority as Priority || 'MEDIUM',
      },
      include: {
        scholarship: true,
        university: true,
      },
    });

    // Create reminder if reminderOffset is set
    if (data.reminderOffset && data.reminderOffset > 0) {
      const reminderDate = new Date(data.dueDate);
      reminderDate.setMinutes(reminderDate.getMinutes() - data.reminderOffset);
      
      await prisma.reminder.create({
        data: {
          deadlineId: deadline.id,
          scheduledAt: reminderDate,
          channel: 'EMAIL',
          status: 'PENDING',
        },
      });
    }

    return deadline;
  }

  /**
   * Get user's deadlines
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
   * Get upcoming deadlines
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
   * Update a deadline
   */
  static async updateDeadline(
    id: string,
    userId: string,
    data: Partial<{
      title: string;
      description: string;
      type: string;
      dueDate: Date;
      dueTimezone: string;
      reminderOffset: number;
      priority: string;
      notes: string;
      isCompleted: boolean;
    }>
  ) {
    const existing = await prisma.deadline.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Deadline not found');
    }

    return prisma.deadline.update({
      where: { id },
      data,
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
    return this.updateDeadline(id, userId, {
      isCompleted: true,
      completedAt: new Date(),
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
   * Auto-create deadlines from scholarship
   */
  static async createFromScholarship(userId: string, scholarshipId: string) {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id: scholarshipId, deletedAt: null },
    });

    if (!scholarship || !scholarship.applicationDeadline) {
      throw new Error('Scholarship not found or no deadline');
    }

    const existing = await prisma.deadline.findFirst({
      where: {
        userId,
        scholarshipId,
        deletedAt: null,
      },
    });

    if (existing) {
      return existing;
    }

    return this.createDeadline({
      userId,
      title: `Apply: ${scholarship.name}`,
      description: `Application deadline for ${scholarship.name}`,
      type: 'SCHOLARSHIP',
      dueDate: scholarship.applicationDeadline,
      scholarshipId: scholarship.id,
      reminderOffset: 7 * 24 * 60,
    });
  }
}