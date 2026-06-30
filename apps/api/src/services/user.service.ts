import prisma from '../lib/prisma.js';
import { User } from '@prisma/client';

export class UserService {
  /**
   * Find or create a user from Firebase data
   */
  static async findOrCreateUser(firebaseUser: any): Promise<User | null> {
    console.log('🔍 Finding or creating user:', firebaseUser.uid);

    // Check if user exists in database using uid
    let user = await prisma.user.findUnique({
      where: { uid: firebaseUser.uid }, // ← This works because uid is @unique
      include: { profile: true },
    });

    if (!user) {
      console.log('👤 User not found, creating new user...');

      // Create new user
      user = await prisma.user.create({
        data: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          emailVerified: firebaseUser.emailVerified || false,
          lastLoginAt: new Date(),
        },
        include: { profile: true },
      });
      console.log('✅ User created:', user.id);

      // Also create a profile for the user
      await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: firebaseUser.displayName?.split(' ')[0] || null,
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || null,
          countryOfResidence: null,
          educationLevel: null,
          fieldsOfInterest: [],
          targetCountries: [],
        },
      });
      console.log('✅ Profile created for user');

      // Reload user with profile
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      });
    } else {
      console.log('👤 User found, updating last login...');

      // Update existing user's last login
      user = await prisma.user.update({
        where: { uid: firebaseUser.uid }, // ← This works because uid is @unique
        data: {
          lastLoginAt: new Date(),
          displayName: firebaseUser.displayName || user.displayName,
          photoURL: firebaseUser.photoURL || user.photoURL,
          emailVerified: firebaseUser.emailVerified || user.emailVerified,
        },
        include: { profile: true },
      });
      console.log('✅ User updated:', user.id);
    }

    return user || null;
  }

  /**
   * Get user by Firebase UID
   */
  static async getUserByUid(uid: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { uid }, // ← This works because uid is @unique
      include: { profile: true },
    });
  }
}
