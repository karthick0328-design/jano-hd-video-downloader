import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/hd_downloader'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TEMP_DOWNLOAD_DIR: z
    .string()
    .default(path.join(process.cwd(), 'tmp', 'downloads')),
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),
  MAX_DOWNLOAD_TIME_SECONDS: z.coerce.number().default(300),
  MAX_CONCURRENT_JOBS: z.coerce.number().default(5),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(30),
  TEMP_FILE_TTL_SECONDS: z.coerce.number().default(3600), // 1 hour
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
