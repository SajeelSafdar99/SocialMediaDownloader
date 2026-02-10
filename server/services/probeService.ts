import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ytDlpPath = "yt-dlp";

export type ProbePlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "facebook"
  | "telegram"
  | "unknown";

export type ProbeMediaType = "video" | "audio";

export interface ProbeOption {
  /** yt-dlp format_id */
  formatId: string;
  type: ProbeMediaType;
  /** e.g. 1080p, 720p, audio-128k */
  qualityLabel: string;
  /** mp4/webm/m4a/mp3 etc */
  container?: string;
  /** Estimated size in bytes if yt-dlp provides it */
  sizeBytes?: number;
  /** width/height if known */
  width?: number;
  height?: number;
  /** audio bitrate */
  abr?: number;
  /** video bitrate */
  vbr?: number;
}

export interface ProbeResult {
  platform: ProbePlatform;
  canonicalUrl: string;
  title?: string;
  thumbnail?: string;
  options: ProbeOption[];
}

function isValidUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function detectPlatform(url: string): ProbePlatform {
  if (!isValidUrl(url)) return "unknown";
  const lower = url.toLowerCase();

  if (lower.includes("instagram.com") || lower.includes("instagr.am")) return "instagram";
  if (lower.includes("tiktok.com") || lower.includes("vm.tiktok.com")) return "tiktok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("facebook.com") || lower.includes("fb.watch")) return "facebook";
  if (lower.includes("t.me") || lower.includes("telegram.me") || lower.includes("telegram.org")) return "telegram";

  return "unknown";
}

function bytesFromYtDlpFormat(f: any): number | undefined {
  // yt-dlp sometimes provides: filesize, filesize_approx
  const v = f?.filesize ?? f?.filesize_approx;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function optionQualityLabel(f: any, type: ProbeMediaType): string {
  if (type === "audio") {
    const abr = typeof f?.abr === "number" ? Math.round(f.abr) : undefined;
    return abr ? `audio-${abr}k` : "audio";
  }
  const height = typeof f?.height === "number" ? f.height : undefined;
  return height ? `${height}p` : (f?.format_note || "video");
}

function mapFormatToOption(f: any): ProbeOption | null {
  const vcodec = f?.vcodec;
  const acodec = f?.acodec;

  const hasVideo = typeof vcodec === "string" && vcodec !== "none";
  const hasAudio = typeof acodec === "string" && acodec !== "none";

  // We only expose "pure" audio OR "video" formats here.
  // For video, we'll allow video-only or video+audio; yt-dlp can merge later.
  if (!hasVideo && !hasAudio) return null;

  const type: ProbeMediaType = hasVideo ? "video" : "audio";

  return {
    formatId: String(f?.format_id ?? ""),
    type,
    qualityLabel: optionQualityLabel(f, type),
    container: typeof f?.ext === "string" ? f.ext : undefined,
    sizeBytes: bytesFromYtDlpFormat(f),
    width: typeof f?.width === "number" ? f.width : undefined,
    height: typeof f?.height === "number" ? f.height : undefined,
    abr: typeof f?.abr === "number" ? f.abr : undefined,
    vbr: typeof f?.vbr === "number" ? f.vbr : undefined,
  };
}

function sortOptions(options: ProbeOption[]): ProbeOption[] {
  const score = (o: ProbeOption) => {
    if (o.type === "audio") return (o.abr ?? 0) / 1000;
    return 10 + (o.height ?? 0);
  };

  return [...options].sort((a, b) => score(b) - score(a));
}

export async function probeUrl(url: string): Promise<ProbeResult> {
  if (!isValidUrl(url)) {
    return { platform: "unknown", canonicalUrl: url, options: [] };
  }

  const platform = detectPlatform(url);
  if (platform === "unknown") {
    return { platform: "unknown", canonicalUrl: url, options: [] };
  }

  // --dump-single-json returns a single JSON object (good for --no-playlist)
  const args = ["--dump-single-json", "--no-playlist"];

  // Add headers for TikTok and Instagram (without impersonation to avoid curl-cffi dependency)
  if (platform === "tiktok" || platform === "instagram") {
    args.push("--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    if (platform === "tiktok") {
      args.push("--referer", "https://www.tiktok.com/");
    }
  }

  args.push(url);

  try {
    const { stdout } = await execFileAsync(ytDlpPath, args, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60000,
    });

    const info: any = JSON.parse(stdout) as unknown;
    const formats: any[] = Array.isArray(info?.formats) ? info.formats : [];

    const mapped: ProbeOption[] = formats
      .map(mapFormatToOption)
      .filter((x: ProbeOption | null): x is ProbeOption => !!x && !!x.formatId);

    // De-dupe aggressively by (type + qualityLabel) preferring known size and mp4/m4a.
    const byKey = new Map<string, ProbeOption>();
    for (const o of mapped) {
      const key = `${o.type}:${o.qualityLabel}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, o);
        continue;
      }

      const rank = (opt: ProbeOption) => {
        const hasSize = opt.sizeBytes ? 1 : 0;
        const friendly = opt.container === "mp4" || opt.container === "m4a" ? 1 : 0;
        return hasSize * 10 + friendly;
      };

      if (rank(o) > rank(existing)) byKey.set(key, o);
    }

    return {
      platform,
      canonicalUrl: info?.webpage_url || url,
      title: info?.title || info?.fulltitle,
      thumbnail: info?.thumbnail || info?.thumbnails?.[0]?.url,
      options: sortOptions(Array.from(byKey.values())),
    };
  } catch (error: any) {
    // Check if yt-dlp is not installed
    if (error.code === 'ENOENT' || error.message?.includes('spawn yt-dlp')) {
      console.error('❌ yt-dlp is not installed or not found in PATH');
      throw new Error('yt-dlp is not installed. Please install yt-dlp to use this feature. Visit https://github.com/yt-dlp/yt-dlp for installation instructions.');
    }
    
    // Parse stderr for specific error messages
    const stderr = error.stderr || error.message || '';
    const errorStr = String(stderr).toLowerCase();
    
    // TikTok authentication errors
    if (errorStr.includes('tiktok') && (errorStr.includes('log in') || errorStr.includes('cookies') || errorStr.includes('authentication') || errorStr.includes('not comfortable'))) {
      throw new Error('TIKTOK_AUTH_REQUIRED: This TikTok video requires authentication. Some videos are age-restricted or private and need login credentials to download.');
    }
    
    // Age-restricted content
    if (errorStr.includes('age-restricted') || errorStr.includes('not comfortable for some audiences')) {
      throw new Error('AGE_RESTRICTED: This video is age-restricted and requires authentication to download.');
    }
    
    // Private/removed content
    if (errorStr.includes('private') || errorStr.includes('removed') || errorStr.includes('unavailable') || errorStr.includes('not found')) {
      throw new Error('CONTENT_UNAVAILABLE: This video is private, removed, or unavailable.');
    }
    
    // Generic authentication required
    if (errorStr.includes('authentication') || errorStr.includes('login') || errorStr.includes('cookies')) {
      throw new Error('AUTH_REQUIRED: This content requires authentication to download.');
    }
    
    // Re-throw other errors with a more user-friendly message
    const errorMessage = error.message || stderr || 'Unknown error occurred';
    throw new Error(`DOWNLOAD_ERROR: ${errorMessage}`);
  }
}
