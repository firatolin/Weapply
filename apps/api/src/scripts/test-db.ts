import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Connecting to Neon database...');

    // Test the connection by counting users
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected!`);
    console.log(`📊 Current users: ${userCount}`);

    // Create a test user
    const newUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      },
    });
    console.log(`✅ Created test user: ${newUser.email}`);
    console.log(`🆔 User ID: ${newUser.id}`);

    // Create a profile for the user
    const profile = await prisma.profile.create({
      data: {
        userId: newUser.id,
        firstName: 'Test',
        lastName: 'User',
        countryOfResidence: 'Ethiopia',
        educationLevel: 'BACHELORS',
        fieldsOfInterest: ['Computer Science', 'Data Science'],
      },
    });
    console.log(`✅ Created profile for user: ${profile.firstName} ${profile.lastName}`);

    // Read all users with their profiles
    const allUsers = await prisma.user.findMany({
      include: {
        profile: true,
      },
    });
    console.log(`📊 All users with profiles:`, JSON.stringify(allUsers, null, 2));
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
