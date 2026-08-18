import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: `Rate limit exceeded. Maximum ${env.RATE_LIMIT_PER_MINUTE} requests per minute allowed.`,
  },
});
