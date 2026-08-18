import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import apiRouter from './routes/api';
import { logger } from './utils/logger';

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS setup
app.use(
  cors({
    origin: '*', // Allow all origins for dev/production integration
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// JSON body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Register API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Server Error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred. Please try again later.',
  });
});

export default app;
