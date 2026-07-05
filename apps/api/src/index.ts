import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';
import { logger } from './utils/logger.js';
import { healthRouter } from './routes/health.js';
import { scholarshipRouter } from './routes/scholarships.js';
import { authRouter } from './routes/auth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { employeeRouter } from './routes/employee.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { matchingRouter } from './routes/matching.routes.js';
import { userRouter } from './routes/users.routes.js';
import { paymentRouter } from './routes/payment.routes.js';

const app: express.Application = express();
const port = config.PORT;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use('/api', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Weapply API',
    version: '0.1.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/v1',
    },
  });
});

// Health check endpoint
app.use('/health', healthRouter);

// API routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/scholarships', scholarshipRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/employee', employeeRouter);
app.use('/api/v1/favorites', favoritesRouter);
app.use('/api/v1/matches', matchingRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/payment', paymentRouter);

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(` Server running on port ${port}`);
  logger.info(` Environment: ${config.NODE_ENV}`);
  logger.info(` Health check: http://localhost:${port}/health`);
  logger.info(`📍 Scholarships API: http://localhost:${port}/api/v1/scholarships`);
});

export { app };
