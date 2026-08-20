import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface YtDlpDumpJson {
  id: string;
  display_id?: string;
  webpage_url_basename?: string;
  title: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: number;
  uploader?: string;
  extractor?: string;
  extractor_key?: string;
  formats?: Array<{
    format_id: string;
    ext: string;
    resolution?: string;
    width?: number;
    height?: number;
    vcodec?: string;
    acodec?: string;
    fps?: number;
    filesize?: number;
    filesize_approx?: number;
    tbr?: number;
    format_note?: string;
  }>;
}

export class YtDlpWrapper {
  private static getExtraArgs(additionalArgs: string[] = []): string[] {
    const extra: string[] = [
      '--remote-components',
      'ejs:github',
      ...additionalArgs,
    ];

    // Attach Deno JS runtime if present
    const localDeno = path.join(process.cwd(), 'deno.exe');
    const rootDeno = path.resolve(process.cwd(), '..', 'backend', 'deno.exe');

    if (fs.existsSync(localDeno)) {
      extra.push('--js-runtimes', `deno:${localDeno}`);
    } else if (fs.existsSync(rootDeno)) {
      extra.push('--js-runtimes', `deno:${rootDeno}`);
    }

    // Attach static FFmpeg binary location
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      extra.push('--ffmpeg-location', ffmpegPath);
    }

    return extra;
  }

  /**
   * Fetch video metadata JSON via yt-dlp --dump-json safely
   */
  public static async dumpJson(url: string): Promise<YtDlpDumpJson> {
    const args = [
      ...this.getExtraArgs(),
      '--extractor-args',
      'youtube:player_client=tv_embedded,android',
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      '--',
      url,
    ];

    logger.debug('Executing yt-dlp dumpJson', { url, args });

    return new Promise((resolve, reject) => {
      let pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      let child = spawn(pyCmd, ['-m', 'yt_dlp', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout?.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        const fallbackChild = spawn('yt-dlp', args);
        let fbStdout = '';
        let fbStderr = '';

        fallbackChild.stdout?.on('data', (c) => (fbStdout += c.toString()));
        fallbackChild.stderr?.on('data', (c) => (fbStderr += c.toString()));

        fallbackChild.on('close', (fbCode) => {
          if (fbCode === 0 && fbStdout.trim()) {
            try {
              resolve(JSON.parse(fbStdout.trim()));
            } catch (e: any) {
              reject(new Error(`Failed to parse yt-dlp JSON output: ${e.message}`));
            }
          } else {
            reject(
              new Error(
                `yt-dlp execution failed: ${fbStderr || err.message || 'Unknown error'}`
              )
            );
          }
        });
      });

      child.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            resolve(JSON.parse(stdoutData.trim()));
          } catch (e: any) {
            reject(new Error(`Failed to parse yt-dlp metadata JSON: ${e.message}`));
          }
        } else {
          if (stderrData.includes('Private video') || stderrData.includes('requires authentication')) {
            reject(new Error('This video is private or requires authentication.'));
          } else if (stderrData.includes('Video unavailable') || stderrData.includes('Not Found')) {
            reject(new Error('This video is unavailable or has been deleted.'));
          } else {
            reject(
              new Error(
                `Failed to analyze URL: ${stderrData.trim() || 'Content inaccessible or unsupported.'}`
              )
            );
          }
        }
      });
    });
  }

  private static async executeSingleDownload(
    url: string,
    outputTemplate: string,
    formatSpec: string,
    extraArgs: string[],
    onProgress?: (percent: number) => void
  ): Promise<string[]> {
    const args = [
      ...this.getExtraArgs(extraArgs),
      '-f',
      formatSpec,
      '-o',
      outputTemplate,
      '--no-playlist',
      '--newline',
      '--',
      url,
    ];

    logger.info('Executing yt-dlp downloadMedia', { url, formatSpec, outputTemplate, args });

    return new Promise((resolve, reject) => {
      let pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      let child = spawn(pyCmd, ['-m', 'yt_dlp', ...args]);

      let stderrData = '';

      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        const match = text.match(/\[download\]\s+(\d+\.\d+)%/);
        if (match && onProgress) {
          onProgress(parseFloat(match[1]));
        }
      });

      child.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          const outputDir = path.dirname(outputTemplate);
          const baseName = path.basename(outputTemplate, path.extname(outputTemplate));

          if (fs.existsSync(outputDir)) {
            const files = fs
              .readdirSync(outputDir)
              .filter((f: string) => f.includes(baseName))
              .map((f: string) => path.join(outputDir, f));
            resolve(files);
          } else {
            reject(new Error('Downloaded output directory does not exist.'));
          }
        } else {
          reject(new Error(`yt-dlp download failed with code ${code}: ${stderrData}`));
        }
      });
    });
  }

  /**
   * Download specific format or best video+audio using yt-dlp with progress tracking and automatic 403 fallback
   */
  public static async downloadMedia(
    url: string,
    outputTemplate: string,
    formatId?: string,
    targetQuality?: string,
    onProgress?: (percent: number) => void
  ): Promise<string[]> {
    let formatSpec =
      'bestvideo[protocol^=m3u8]+bestaudio[protocol^=m3u8]/best[protocol^=m3u8]/bestvideo+bestaudio/best';

    if (targetQuality) {
      const heightNum = parseInt(targetQuality.replace('p', ''), 10);
      if (!isNaN(heightNum)) {
        formatSpec = `bestvideo[height<=${heightNum}][protocol^=m3u8]+bestaudio[protocol^=m3u8]/best[height<=${heightNum}][protocol^=m3u8]/bestvideo[height<=${heightNum}]+bestaudio/best[height<=${heightNum}]/bestvideo+bestaudio/best`;
      }
    }

    try {
      // Primary download attempt with tv_embedded,android player clients
      return await this.executeSingleDownload(
        url,
        outputTemplate,
        formatSpec,
        ['--extractor-args', 'youtube:player_client=tv_embedded,android'],
        onProgress
      );
    } catch (err: any) {
      const errStr = String(err.message || err);
      const is403 = errStr.includes('403') || errStr.toLowerCase().includes('forbidden');

      if (is403) {
        logger.warn('Primary download attempt hit 403 Forbidden. Retrying with android client fallback...', {
          url,
          outputTemplate,
        });

        // Fallback retry attempt with android player client
        return await this.executeSingleDownload(
          url,
          outputTemplate,
          'bestvideo+bestaudio/best',
          ['--extractor-args', 'youtube:player_client=android'],
          onProgress
        );
      }
      throw err;
    }
  }
}
