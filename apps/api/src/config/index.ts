import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default('gemini-pro'),
  
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  
  CHAPA_SECRET_KEY: z.string(),
  CHAPA_WEBHOOK_SECRET: z.string(),
  
  CORS_ORIGINS: z.string().transform(s => s.split(',')),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export const config = configSchema.parse(process.env);
