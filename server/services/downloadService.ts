import { storage } from "../storage";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { downloadProgressStore } from "./downloadProgressStore";
import { detectPlatform } from "./probeService";

const execFileAsync = promisify(execFile);
// Use 'yt-dlp' path directly since it should be installed globally
const ytDlpPath = "yt-dlp";

// List of extensions yt-dlp might use for various formats/qualities
const POSSIBLE_EXTENSIONS = ['mp4', 'webm', 'mkv', 'mp3', 'm4a', 'ogg', 'opus'];

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function getTtlMs(): number {
  const raw = process.env.DOWNLOAD_FILE_TTL_MS ?? process.env.DOWNLOAD_FILE_TTL_MINUTES;
  if (!raw) return 60 * 60 * 1000;
  if (process.env.DOWNLOAD_FILE_TTL_MS) {
    const v = Number(process.env.DOWNLOAD_FILE_TTL_MS);
    return Number.isFinite(v) && v > 0 ? v : 60 * 60 * 1000;
  }
  const minutes = Number(process.env.DOWNLOAD_FILE_TTL_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 60 * 60 * 1000;
}

export class DownloadService {
  private downloadDir = path.join(process.cwd(), "downloads");

  constructor() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  detectPlatform(url: string): string | null {
    if (!isValidUrl(url)) {
      return null;
    }

    if (url.includes('instagram.com') || url.includes('instagr.am')) {
      return 'instagram';
    }
    if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
      return 'tiktok';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter';
    }
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return 'facebook';
    }
    if (url.includes('t.me') || url.includes('telegram.me') || url.includes('telegram.org')) {
      return 'telegram';
    }
    return null;
  }

  async processDownload(downloadId: number, url: string, format: string, quality: string, formatId?: string) {
    // Normalize to a number for progress store + DB calls
    const id = Number(downloadId);

    if (!Number.isFinite(id)) {
      throw new Error('Invalid download id');
    }

    if (!isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Initialize progress snapshot
    downloadProgressStore.set({
      downloadId: id,
      stage: 'queued',
      percent: 0,
      message: 'Queued',
      updatedAt: Date.now(),
    });

    try {
      await storage.updateDownloadStatus(id, 'processing');

      downloadProgressStore.set({
        downloadId: id,
        stage: 'fetching_info',
        percent: 1,
        message: 'Fetching info…',
        updatedAt: Date.now(),
      });

      const { title, thumbnail } = await this.getVideoInfo(url);

      await storage.updateDownloadInfo(id, {
        title,
        thumbnail,
      });

      const { finalPath } = await this.downloadMedia(url, id, format, quality, formatId);

      let fileSize = 0;
      if (fs.existsSync(finalPath)) {
        const stats = fs.statSync(finalPath);
        fileSize = stats.size;
      }

      // The final download URL points to the route handler which serves the file
      const downloadUrl = `/api/download/${id}/file`;

      const expiresAt = new Date(Date.now() + getTtlMs());

      await storage.updateDownloadInfo(id, { fileSize, expiresAt });
      await storage.updateDownloadStatus(id, 'completed', downloadUrl);

      downloadProgressStore.set({
        downloadId: id,
        stage: 'completed',
        percent: 100,
        message: 'Completed',
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Download processing failed:', error);
      await storage.updateDownloadStatus(id, 'failed');
      downloadProgressStore.set({
        downloadId: id,
        stage: 'failed',
        percent: 100,
        message: 'Failed',
        updatedAt: Date.now(),
      });
      throw error;
    }
  }

  private async getVideoInfo(url: string): Promise<{ title: string; thumbnail: string }> {
    try {
      const platform = detectPlatform(url);
      const args = ['--dump-json', '--no-download'];

      // Add headers for TikTok and Instagram (impersonation disabled - requires curl-cffi)
      if (platform === 'tiktok' || platform === 'instagram') {
        // args.push('--impersonate', 'chrome');  // Disabled: requires curl-cffi
        args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        if (platform === 'tiktok') {
          args.push('--referer', 'https://www.tiktok.com/');
        }
      }

      args.push(url);

      const { stdout } = await execFileAsync(ytDlpPath, args, {
        maxBuffer: 50 * 1024 * 1024
      });

      const info = JSON.parse(stdout);
      return {
        title: info.title || info.fulltitle || 'Untitled Video',
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      return {
        title: 'Video Download',
        thumbnail: '',
      };
    }
  }

  private async downloadMedia(
    url: string,
    downloadId: number,
    format: string,
    quality: string,
    formatId?: string,
  ): Promise<{finalExt: string, finalPath: string}> {
    // Output path template: ID.ext. yt-dlp replaces %(ext)s with the actual file extension.
    const outputPath = path.join(this.downloadDir, `${downloadId}.%(ext)s`);

    const args: string[] = [];

    // Detect platform and add headers if needed (without impersonation)
    const platform = detectPlatform(url);
    if (platform === 'tiktok' || platform === 'instagram') {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      if (platform === 'tiktok') {
        args.push('--referer', 'https://www.tiktok.com/');
      }
    }

    // If formatId is provided, prefer exact selection.
    // We still support the existing quality-based logic as fallback.
    const hasFormatId = typeof formatId === 'string' && formatId.trim().length > 0;

    if (format === 'mp3') {
      // Extract audio only, convert to mp3
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');

      if (hasFormatId) {
        args.push('-f', formatId!.trim());
      }
    } else {
      if (hasFormatId) {
        args.push('-f', formatId!.trim());
      } else {
        // Determine height limit based on quality selection
        let heightLimit = '720';
        switch (quality) {
          case '2160p':
          case '4k':
            heightLimit = '2160';
            break;
          case '1080p':
            heightLimit = '1080';
            break;
          case '720p':
            heightLimit = '720';
            break;
          case '480p':
            heightLimit = '480';
            break;
          case '360p':
            heightLimit = '360';
            break;
        }
        // Select best quality video+audio up to height limit, and ensure it's merged to mp4
        args.push('-f', `bestvideo[height<=${heightLimit}]+bestaudio/best[height<=${heightLimit}]/best`);
      }

      // Ensure it's merged to mp4 for consistent serving.
      args.push('--merge-output-format', 'mp4');
    }

    // Progress-friendly flags
    // --newline prints progress updates as lines.
    // --progress-template lets us output machine-parseable progress.
    args.push('--newline');
    args.push('--progress-template', 'download:{"p":%(progress._percent_str)s,"d":%(progress.downloaded_bytes)s,"t":%(progress.total_bytes)s,"ta":%(progress.total_bytes_estimate)s,"s":%(progress.speed)s,"e":%(progress.eta)s}');

    args.push('-o', outputPath);
    args.push('--no-playlist');
    args.push(url);

    const updateFromJsonLine = (line: string) => {
      // Expect: download:{"p":"12.3%",...}
      const idx = line.indexOf('download:');
      if (idx === -1) return;
      const jsonPart = line.slice(idx + 'download:'.length).trim();
      try {
        const payload = JSON.parse(jsonPart);
        const pStr = typeof payload.p === 'string' ? payload.p : '';
        const percent = parseFloat(String(pStr).replace('%', ''));
        const downloadedBytes = typeof payload.d === 'number' ? payload.d : undefined;
        const totalBytes = typeof payload.t === 'number' ? payload.t : (typeof payload.ta === 'number' ? payload.ta : undefined);
        const speedBytesPerSecond = typeof payload.s === 'number' ? payload.s : undefined;
        const etaSeconds = typeof payload.e === 'number' ? payload.e : undefined;

        downloadProgressStore.set({
          downloadId,
          stage: 'downloading',
          percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : undefined,
          downloadedBytes,
          totalBytes,
          speedBytesPerSecond,
          etaSeconds,
          message: 'Downloading…',
          updatedAt: Date.now(),
        });
      } catch {
        // ignore parse errors
      }
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ytDlpPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdoutBuf = '';
        let stderrBuf = '';

        child.stdout.on('data', (chunk) => {
          stdoutBuf += chunk.toString();
          let nl;
          while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
            const line = stdoutBuf.slice(0, nl).trim();
            stdoutBuf = stdoutBuf.slice(nl + 1);
            if (line) updateFromJsonLine(line);
            if (line.includes('Post-processing') || line.toLowerCase().includes('merging')) {
              downloadProgressStore.set({
                downloadId,
                stage: 'postprocessing',
                percent: Math.max(downloadProgressStore.get(downloadId)?.percent ?? 90, 90),
                message: 'Finalizing…',
                updatedAt: Date.now(),
              });
            }
          }
        });

        child.stderr.on('data', (chunk) => {
          stderrBuf += chunk.toString();
        });

        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(stderrBuf || `yt-dlp exited with code ${code}`));
        });
      });

      let finalExt = format === 'mp3' ? 'mp3' : 'mp4';
      let finalPath = path.join(this.downloadDir, `${downloadId}.${finalExt}`);

      for (const ext of POSSIBLE_EXTENSIONS) {
        const testPath = path.join(this.downloadDir, `${downloadId}.${ext}`);
        if (fs.existsSync(testPath)) {
          finalPath = testPath;
          finalExt = ext;
          break;
        }
      }

      const targetPath = path.join(this.downloadDir, `${downloadId}.${format === 'mp3' ? 'mp3' : 'mp4'}`);

      if (finalPath !== targetPath) {
        fs.renameSync(finalPath, targetPath);
        finalPath = targetPath;
      }

      return { finalExt, finalPath };

    } catch (error: any) {
      console.error('yt-dlp download failed:', error.message);
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

export const downloadService = new DownloadService();

