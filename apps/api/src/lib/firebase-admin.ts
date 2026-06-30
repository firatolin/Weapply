import { config } from '../config/index.js';

// Dynamically import firebase-admin to handle ES module issues
const admin = await import('firebase-admin');

console.log('🔧 Initializing Firebase Admin...');

// Check if config values exist
if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL || !config.FIREBASE_PRIVATE_KEY) {
  console.error('❌ Missing Firebase credentials in .env file');
  console.error('Please check: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Initialize Firebase Admin SDK safely
let adminApp: any = null;

try {
  // Check if already initialized
  if (admin.apps && admin.apps.length > 0) {
    adminApp = admin.apps[0];
    console.log('✅ Firebase Admin already initialized');
  } else {
    // Format the private key correctly (replace escaped newlines)
    const privateKey = config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
    console.log(`📊 Project: ${config.FIREBASE_PROJECT_ID}`);
  }
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  console.error('Please check your Firebase credentials in .env');
  process.exit(1);
}

// Export auth and db
import type { Auth } from 'firebase-admin/auth';

export const adminAuth: Auth | null = adminApp ? admin.auth(adminApp) : null;
export const adminDb = adminApp ? admin.firestore(adminApp) : null;
export default adminApp || admin;