# Production-Ready HD Video Downloader Web Application

A modern, production-grade full-stack web application that allows users to analyze YouTube (videos & Shorts) and Instagram (Reels & posts) URLs and download the highest available quality media stream.

---

## 🌟 Key Features

- **Multi-Platform Support**: YouTube Videos, YouTube Shorts, Instagram Reels, and Instagram video posts.
- **True HD Quality Extraction**: Inspects media formats using `yt-dlp` to present genuine resolutions (2160p 4K, 1440p, 1080p, 720p, 480p) without false upscaling.
- **FFmpeg Stream Merging**: Merges video and audio streams seamlessly using FFmpeg (`-c:v copy`) to avoid lossy re-encoding.
- **ffprobe Stream Validation**: Validates resolution, duration, video/audio codecs, and file sizes post-merge.
- **Background Processing**: Redis + BullMQ worker architecture handles asynchronous downloads, preventing HTTP request timeouts.
- **Fallback Worker**: In-memory background execution fallback when running without Redis/MongoDB in local dev.
- **SSRF & Security Shield**: Hostname whitelist validation, private IP blocking, input sanitization, rate limiting, and Helmet HTTP security headers.
- **SaaS UI/UX**: Built with Next.js 14, Tailwind CSS, Lucide icons, Framer Motion animations, quality selector pills, real-time progress polling, and download history.
- **Auto TTL Cleanup**: Configurable automatic temporary media file cleanup.

---

## 🏗️ Backend Architecture

```text
backend/
├── src/
│   ├── config/          # Environment variables & constants
│   ├── controllers/     # Express API handlers
│   ├── downloader/      # Downloader strategy interface & platform handlers
│   │   ├── youtube/     # YouTube & Shorts analyzer/downloader
│   │   └── instagram/   # Instagram Reels/Posts analyzer/downloader
│   ├── ffmpeg/          # FFmpeg merging & ffprobe validation service
│   ├── metadata/        # Format parsing & quality resolution
│   ├── middleware/      # SSRF protection, rate limiting & global error handling
│   ├── models/          # MongoDB Download model
│   ├── queues/          # BullMQ queue configuration
│   ├── routes/          # API router
│   ├── services/        # Job persistence & cleanup services
│   ├── utils/           # Spawner, logger, sanitizers
│   ├── workers/         # BullMQ worker process
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
```

---

## 📡 API Reference

### 1. Analyze Media URL
`POST /api/media/analyze`

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "platform": "youtube",
  "title": "Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 213,
  "maxAvailableQuality": "1080p",
  "formats": [
    { "quality": "1080p", "height": 1080, "format": "mp4", "formatId": "137" },
    { "quality": "720p", "height": 720, "format": "mp4", "formatId": "22" }
  ]
}
```

### 2. Initiate HD Download Job
`POST /api/download`

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "1080p",
  "format": "mp4",
  "title": "Never Gonna Give You Up"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_1724025000_abc123",
  "message": "Download job queued successfully."
}
```

### 3. Check Job Status
`GET /api/download/:jobId`

**Response:**
```json
{
  "success": true,
  "jobId": "job_1724025000_abc123",
  "status": "completed",
  "progress": 100,
  "quality": "1080p",
  "format": "mp4",
  "fileSize": 45210920,
  "downloadUrl": "/api/download/job_1724025000_abc123/file",
  "error": null
}
```

### 4. Download File Stream
`GET /api/download/:jobId/file`

Serves the processed MP4 file with `Content-Disposition: attachment`.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js v18+
- Python 3.10+ (with `yt-dlp` installed or available via npm)
- FFmpeg installed locally (or via `ffmpeg-static`)

### 1. Install Backend Dependencies
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## 🧪 Testing

Run backend unit and integration tests:
```bash
cd backend
npm test
```

---

## 🐳 Docker Production Setup

To launch the full stack with MongoDB, Redis, API Backend, Background Worker, and Next.js Frontend:

```bash
docker-compose up --build -d
```

Services exposed:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

---

## ⚖️ Legal & Privacy Notice

This application is designed solely for downloading videos that you own or have explicit authorization to download. It does not circumvent DRM, paywalls, or private account restrictions.
