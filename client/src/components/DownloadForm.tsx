import { useState, useMemo, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ToastAction } from "@/components/ui/toast";

interface DownloadFormProps {
  onDownloadStart: (downloadId: string) => void;
  defaultPlatform?: string;
}

export default function DownloadForm({ onDownloadStart, defaultPlatform }: DownloadFormProps) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState(defaultPlatform || 'instagram');
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const { toast } = useToast();

  const detectedPlatform = useMemo(() => detectPlatformFromUrl(url.trim()), [url]);

  const hasAudioInProbe = useMemo(() => (probe?.options || []).some(o => o.type === 'audio'), [probe]);
  const hasVideoInProbe = useMemo(() => (probe?.options || []).some(o => o.type === 'video'), [probe]);

  useEffect(() => {
    // keep the pill selection in sync with what the user pasted
    if (detectedPlatform !== 'unknown') {
      setSelectedPlatform(detectedPlatform);
    }
  }, [detectedPlatform]);

  useEffect(() => {
    // probe debounce-ish: only probe if URL looks valid-ish
    const trimmed = url.trim();
    if (!trimmed) {
      setProbe(null);
      setQuality('');
      return;
    }
    if (detectedPlatform === 'unknown') {
      setProbe(null);
      setQuality('');
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsProbing(true);
        const res = await apiRequest('POST', '/api/probe', { url: trimmed });
        const data = (await res.json()) as ProbeResult;
        setProbe(data);

        // Auto-pick sensible defaults from probe
        const hasAudio = data.options.some(o => o.type === 'audio');
        const hasVideo = data.options.some(o => o.type === 'video');
        if (format === 'mp3' && !hasAudio && hasVideo) setFormat('mp4');
        if (format === 'mp4' && !hasVideo && hasAudio) setFormat('mp3');

        const desiredType: ProbeMediaType = (format === 'mp3') ? 'audio' : 'video';
        const candidates = data.options.filter(o => o.type === desiredType);
        if (candidates.length) {
          // pick the first (already sorted best-first by server)
          const best = candidates[0];
          setQuality(best.qualityLabel);
        } else {
          setQuality('');
        }
      } catch (e: any) {
        setProbe(null);
        setQuality('');
      } finally {
        setIsProbing(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [url, detectedPlatform, format]);

  const videoOptions = useMemo(() => {
    const opts = (probe?.options || []).filter(o => o.type === 'video');
    // build unique quality labels
    const by = new Map<string, ProbeOption>();
    for (const o of opts) {
      if (!by.has(o.qualityLabel)) by.set(o.qualityLabel, o);
    }
    return Array.from(by.values());
  }, [probe]);

  const audioOptions = useMemo(() => {
    const opts = (probe?.options || []).filter(o => o.type === 'audio');
    const by = new Map<string, ProbeOption>();
    for (const o of opts) {
      if (!by.has(o.qualityLabel)) by.set(o.qualityLabel, o);
    }
    return Array.from(by.values());
  }, [probe]);

  const downloadMutation = useMutation({
    mutationFn: async (data: { url: string; format: string; quality: string }) => {
      const response = await apiRequest('POST', '/api/download', data);
      return await response.json();
    },
    onSuccess: (data) => {
      const downloadId = String(data.id);

      toast({
        title: "Download started",
        description: "We’re fetching the best available format and preparing your file.",
        action: (
          <ToastAction
            altText="View progress"
            onClick={() => {
              onDownloadStart(downloadId);
              // ensure progress area is brought into view
              window.setTimeout(() => {
                document.getElementById('download-progress')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
          >
            View progress
          </ToastAction>
        ),
      });

      // still set current download immediately (so progress shows even if toast is ignored)
      onDownloadStart(downloadId);

      setUrl('');
      setProbe(null);
      setQuality('');
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast({
        title: "URL required",
        description: "Paste a valid link to continue.",
        variant: "destructive",
      });
      return;
    }

    // If we have probe options but no selection yet, block with a helpful message.
    if (probe?.options?.length && !quality) {
      toast({
        title: "Choose a quality",
        description: "Select a quality before starting the download.",
        variant: "destructive",
      });
      return;
    }

    // If probing is still running, avoid starting a download with stale defaults.
    if (isProbing) {
      toast({
        title: "Detecting formats…",
        description: "Please wait a moment while we fetch available qualities.",
      });
      return;
    }

    downloadMutation.mutate({ url: trimmed, format, quality: quality || (format === 'mp3' ? 'audio-best' : 'video-best') });
  };

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', color: 'from-purple-500 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', color: 'from-cyan-500 to-blue-600' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', color: 'from-red-500 to-red-600' },
    { id: 'twitter', name: 'Twitter/X', icon: 'fab fa-x-twitter', color: 'from-gray-800 to-black' },
    { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook', color: 'from-blue-600 to-blue-700' },
    { id: 'terabox', name: 'Terabox', icon: 'fas fa-cloud-download-alt', color: 'from-green-500 to-emerald-600' },
  ];

  useEffect(() => {
    // If the user chose MP3 but this URL does not expose audio-only formats,
    // keep the UI honest: switch back to MP4 and tell the user why.
    if (format === 'mp3' && probe && !hasAudioInProbe) {
      setFormat('mp4');
      toast({
        title: 'Audio-only not available',
        description: 'This link does not provide an audio-only stream. Downloading video instead.',
      });
      setQuality('');
    }

    // If the user chose MP4 but only audio exists (rare), switch and inform.
    if (format === 'mp4' && probe && !hasVideoInProbe && hasAudioInProbe) {
      setFormat('mp3');
      toast({
        title: 'Video not available',
        description: 'Only an audio stream is available for this link.',
      });
      setQuality('');
    }
  }, [format, probe, hasAudioInProbe, hasVideoInProbe, toast]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Platform Selector Pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {platforms.map((platform) => (
          <Button
            key={platform.id}
            variant={selectedPlatform === platform.id ? "default" : "outline"}
            onClick={() => setSelectedPlatform(platform.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full touch-manipulation active:scale-95 transition-transform ${
              selectedPlatform === platform.id 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'hover:border-primary hover:text-primary'
            }`}
            data-testid={`button-platform-${platform.id}`}
          >
            <i className={`${platform.icon} text-xl`}></i>
            <span>{platform.name}</span>
          </Button>
        ))}
      </div>
      
      {/* Download Form Card */}
      <Card className="shadow-2xl border border-border">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <i className="fas fa-link absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"></i>
                <Input
                  type="text"
                  inputMode="url"
                  placeholder="Paste any social media video link here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-12 pr-4 py-4 rounded-xl border-2 font-mono text-sm relative z-20 w-full touch-manipulation"
                  data-testid="input-url"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                disabled={downloadMutation.isPending}
                className="btn-primary px-8 py-4 rounded-xl font-semibold text-base flex items-center justify-center space-x-2 whitespace-nowrap min-h-[56px] touch-manipulation active:scale-95 transition-transform w-full sm:w-auto"
                data-testid="button-download"
              >
                {downloadMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>Download</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Format & Quality Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Format</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={format === 'mp4' ? 'default' : 'outline'}
                    onClick={() => setFormat('mp4')}
                    className="flex-1 touch-manipulation active:scale-95 transition-transform"
                    data-testid="button-format-mp4"
                  >
                    <i className="fas fa-video mr-2"></i>MP4
                  </Button>
                  <Button
                    type="button"
                    variant={format === 'mp3' ? 'default' : 'outline'}
                    onClick={() => setFormat('mp3')}
                    disabled={!!probe && !hasAudioInProbe}
                    className="flex-1 touch-manipulation active:scale-95 transition-transform"
                    data-testid="button-format-mp3"
                    title={!!probe && !hasAudioInProbe ? 'Audio-only is not available for this link' : undefined}
                  >
                    <i className="fas fa-music mr-2"></i>MP3
                  </Button>
                </div>
                {!!probe && !hasAudioInProbe && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Audio-only isn’t available for this link.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Quality</label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger className="w-full" data-testid="select-quality">
                    <SelectValue placeholder={isProbing ? "Detecting formats…" : "Select quality"} />
                  </SelectTrigger>
                  <SelectContent>
                    {format === 'mp3' ? (
                      audioOptions.length ? (
                        audioOptions.map((o) => (
                          <SelectItem key={o.qualityLabel} value={o.qualityLabel}>
                            {o.qualityLabel}{o.container ? ` • ${o.container}` : ''}{` • ${formatBytes(o.sizeBytes)}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={quality || 'audio-best'}>
                          {isProbing ? 'Detecting audio formats…' : 'Best available audio'}
                        </SelectItem>
                      )
                    ) : (
                      videoOptions.length ? (
                        videoOptions.map((o) => (
                          <SelectItem key={o.qualityLabel} value={o.qualityLabel}>
                            {o.qualityLabel}{o.container ? ` • ${o.container}` : ''}{` • ${formatBytes(o.sizeBytes)}`}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="video-best">Best available video</SelectItem>
                          <SelectItem value="480p">SD • 480p</SelectItem>
                          <SelectItem value="720p">HD • 720p</SelectItem>
                          <SelectItem value="1080p">Full HD • 1080p</SelectItem>
                        </>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Probe hint */}
            <div className="text-xs text-muted-foreground">
              {url.trim() && detectedPlatform === 'unknown' && (
                <span>Unsupported link. Try Instagram, TikTok, YouTube, Twitter/X, Facebook, or Terabox.</span>
              )}
              {url.trim() && detectedPlatform !== 'unknown' && (
                <span>
                  Detected: <span className="font-medium capitalize">{detectedPlatform}</span>
                  {isProbing
                    ? ' • Detecting available formats…'
                    : probe?.options?.length
                      ? ` • ${probe.options.length} format${probe.options.length === 1 ? '' : 's'} found`
                      : ' • Ready'}
                </span>
              )}
            </div>
          </form>
          
          {/* Quick Info */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-secondary"></i>
              <span>No Watermarks</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-secondary"></i>
              <span>Fast Downloads</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-check-circle text-secondary"></i>
              <span>All Devices</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type ProbePlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook' | 'terabox' | 'unknown';
type ProbeMediaType = 'video' | 'audio';
interface ProbeOption {
  formatId: string;
  type: ProbeMediaType;
  qualityLabel: string;
  container?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  abr?: number;
}
interface ProbeResult {
  platform: ProbePlatform;
  canonicalUrl: string;
  title?: string;
  thumbnail?: string;
  options: ProbeOption[];
}

function detectPlatformFromUrl(input: string): ProbePlatform {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host.endsWith('instagram.com') || host.endsWith('instagr.am')) return 'instagram';
    if (host.endsWith('tiktok.com') || host.endsWith('vm.tiktok.com')) return 'tiktok';
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'youtube';
    if (host.endsWith('twitter.com') || host.endsWith('x.com')) return 'twitter';
    if (host.endsWith('facebook.com') || host === 'fb.watch') return 'facebook';
    // Terabox multiple domains
    if (host.endsWith('terabox.com') || host.endsWith('1024tera.com') ||
        host.endsWith('4funbox.com') || host.endsWith('mirrobox.com') ||
        host.endsWith('nephobox.com') || host.endsWith('teraboxapp.com')) return 'terabox';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
