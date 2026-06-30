import prisma from '../lib/prisma.js';

async function testUserCreation() {
  try {
    console.log('🔄 Creating test user...');

    const user = await prisma.user.create({
      data: {
        uid: 'test-firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ User created:', user);
    console.log('🆔 User ID:', user.id);
    console.log('🔑 UID:', user.uid);
    console.log('📧 Email:', user.email);
    console.log('⏰ Last Login:', user.lastLoginAt);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCreation();
