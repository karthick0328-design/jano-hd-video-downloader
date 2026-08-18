import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { ssrfProtectionMiddleware } from '../middleware/ssrfProtection';

const router = Router();

// Apply rate limiting to all API routes
router.use(apiRateLimiter);

// Media Analysis Endpoint
router.post('/media/analyze', ssrfProtectionMiddleware, MediaController.analyzeMedia);

// Download Job Endpoints
router.post('/download', ssrfProtectionMiddleware, MediaController.createDownload);
router.get('/download/:jobId', MediaController.getDownloadStatus);
router.get('/download/:jobId/file', MediaController.downloadFile);

// Healthcheck endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hd-downloader-backend', timestamp: new Date() });
});

export default router;
