import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface FFprobeResult {
  width: number;
  height: number;
  duration: number;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  size: number;
  formatName: string;
}

export class FFmpegService {
  private static getFfmpegBinary(): string {
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
    return 'ffmpeg';
  }

  private static getFfprobeBinary(): string {
    if (ffprobePath && ffprobePath.path && fs.existsSync(ffprobePath.path)) {
      return ffprobePath.path;
    }
    return 'ffprobe';
  }

  /**
   * Run ffprobe on media file
   */
  public static async probeFile(filePath: string): Promise<FFprobeResult> {
    const ffprobeBin = this.getFfprobeBinary();

    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(ffprobeBin, args);
      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (chunk) => {
        output += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
        }

        try {
          const parsed = JSON.parse(output);
          const streams = parsed.streams || [];
          const format = parsed.format || {};

          const videoStream = streams.find((s: any) => s.codec_type === 'video') || {};
          const audioStream = streams.find((s: any) => s.codec_type === 'audio') || {};

          const width = parseInt(videoStream.width || '0', 10);
          const height = parseInt(videoStream.height || '0', 10);
          const duration = parseFloat(format.duration || videoStream.duration || '0');
          const videoCodec = videoStream.codec_name || 'unknown';
          const audioCodec = audioStream.codec_name || 'unknown';
          const size = parseInt(format.size || '0', 10);
          const bitrate = parseInt(format.bit_rate || '0', 10);
          const formatName = format.format_name || 'mp4';

          resolve({
            width,
            height,
            duration,
            videoCodec,
            audioCodec,
            bitrate,
            size,
            formatName,
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Merge separate video and audio streams into universal H.264/AAC MP4 file
   */
  public static async mergeStreams(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const ffmpegBin = this.getFfmpegBinary();
    logger.info('FFmpeg merging streams', { videoPath, audioPath, outputPath, ffmpegBin });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Inspect input video stream codec using probeFile
    let needsVideoTranscode = false;
    try {
      const probe = await this.probeFile(videoPath);
      // VP9 / AV1 / HEVC in MP4 containers may fail playback on default Windows Media Player unless converted to H.264
      if (probe.videoCodec && (probe.videoCodec.includes('vp9') || probe.videoCodec.includes('av1') || probe.videoCodec.includes('hevc'))) {
        needsVideoTranscode = true;
      }
    } catch {
      // If probe fails, default to safe H.264 transcode
      needsVideoTranscode = true;
    }

    let args: string[];

    if (needsVideoTranscode) {
      logger.info('Transcoding video codec to standard H.264 for maximum media player compatibility');
      args = [
        '-y',
        '-i',
        videoPath,
        '-i',
        audioPath,
        '-c:v',
        'libx264',
        '-preset',
        'superfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        outputPath,
      ];
    } else {
      logger.info('Using lossless video stream copy');
      args = [
        '-y',
        '-i',
        videoPath,
        '-i',
        audioPath,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        outputPath,
      ];
    }

    return new Promise((resolve, reject) => {
      const child = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let errorOutput = '';

      child.stderr?.on('data', (chunk) => {
        errorOutput += chunk.toString();
        const timeMatch = chunk.toString().match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && onProgress) {
          const hours = parseFloat(timeMatch[1]);
          const mins = parseFloat(timeMatch[2]);
          const secs = parseFloat(timeMatch[3]);
          const totalSecs = hours * 3600 + mins * 60 + secs;
          onProgress(Math.min(99, Math.floor(totalSecs * 5)));
        }
      });

      child.on('close', async (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          logger.info('FFmpeg merge completed successfully', { outputPath });
          resolve(outputPath);
        } else {
          logger.error('FFmpeg merge failed', { code, errorOutput });
          reject(new Error(`FFmpeg merge failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (err) => {
        logger.error('FFmpeg spawn error', { error: err.message });
        reject(err);
      });
    });
  }
}
