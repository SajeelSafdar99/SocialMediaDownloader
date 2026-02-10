import fs from "fs";
import path from "path";
import { storage } from "../storage";

const DEFAULT_TTL_MS = 60 * 60 * 1000;

function getTtlMs(): number {
  const raw = process.env.DOWNLOAD_FILE_TTL_MS ?? process.env.DOWNLOAD_FILE_TTL_MINUTES;
  if (!raw) return DEFAULT_TTL_MS;

  // Support either ms or minutes.
  if (process.env.DOWNLOAD_FILE_TTL_MS) {
    const v = Number(process.env.DOWNLOAD_FILE_TTL_MS);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_TTL_MS;
  }

  const minutes = Number(process.env.DOWNLOAD_FILE_TTL_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : DEFAULT_TTL_MS;
}

export function getDownloadsDir(): string {
  return path.join(process.cwd(), "downloads");
}

export function findDownloadedFilePath(downloadId: number): { filePath: string; ext: string } | null {
  const downloadDir = getDownloadsDir();
  const possibleExtensions = ["mp4", "mp3", "webm", "mkv", "m4a", "ogg", "opus"];

  for (const ext of possibleExtensions) {
    const p = path.join(downloadDir, `${downloadId}.${ext}`);
    if (fs.existsSync(p)) return { filePath: p, ext };
  }

  return null;
}

export function deleteFileIfExists(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    console.warn("Failed to delete file", filePath, e);
    return false;
  }
}

function extractDownloadIdFromFilename(filename: string): number | null {
  const m = filename.match(/^(\d+)\.[a-z0-9]+$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : null;
}

export function startDownloadFileReaper() {
  const ttlMs = getTtlMs();

  // Run every ~1/4 of TTL, but clamp to sensible values.
  const intervalMs = Math.max(30_000, Math.min(ttlMs / 4, 10 * 60 * 1000));
  const downloadsDir = getDownloadsDir();

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const tick = async () => {
    try {
      const now = Date.now();
      const files = fs.readdirSync(downloadsDir);

      for (const f of files) {
        // Only touch our own download artifacts: {id}.{ext}
        if (!/^\d+\.[a-z0-9]+$/i.test(f)) continue;
        const p = path.join(downloadsDir, f);

        let st: fs.Stats;
        try {
          st = fs.statSync(p);
        } catch {
          continue;
        }

        // Prefer creation time; fall back to mtime.
        const ageMs = now - Math.max(st.birthtimeMs || 0, st.mtimeMs || 0);
        if (ageMs >= ttlMs) {
          const deleted = deleteFileIfExists(p);
          if (deleted) {
            const id = extractDownloadIdFromFilename(f);
            if (id !== null) {
              // Best-effort DB update; ignore failures.
              try {
                await storage.markDownloadExpired(id, new Date());
              } catch (e) {
                console.warn('Failed to mark download expired in DB', id, e);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Download file reaper tick failed", e);
    }
  };

  // Start shortly after boot.
  setTimeout(() => {
    void tick();
  }, 5_000);
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  console.log(`Download file cleanup enabled: TTL=${ttlMs}ms, interval=${intervalMs}ms`);

  return () => clearInterval(timer);
}
