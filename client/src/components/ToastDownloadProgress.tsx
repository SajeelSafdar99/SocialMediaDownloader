import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import AdSlot from "@/components/AdSlot";

type DownloadStage =
  | "queued"
  | "fetching_info"
  | "downloading"
  | "postprocessing"
  | "completed"
  | "failed";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Expand snapshot to include bytes for nicer toast
interface DownloadProgressSnapshot {
  downloadId: number;
  stage: DownloadStage;
  percent?: number;
  message?: string;
  updatedAt: number;
  downloadedBytes?: number;
  totalBytes?: number;
}

type WsServerMessage =
  | { type: "progress"; snapshot: DownloadProgressSnapshot }
  | { type: "error"; message: string };

function isProgressVisible(): boolean {
  const el = document.getElementById("download-progress");
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh && rect.bottom > 0;
}

export default function ToastDownloadProgress() {
  const [currentDownloadId, setCurrentDownloadId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<DownloadProgressSnapshot | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const hasShownToastRef = useRef(false);
  const completedRef = useRef(false);

  // Listen for any download starts across the app
  useEffect(() => {
    const handler = (e: any) => {
      const id = Number(e?.detail?.downloadId);
      if (Number.isFinite(id)) {
        setCurrentDownloadId(id);
        setSnapshot(null);
        setDownloadUrl(null);
        setTitle(null);
        setThumbnail(null);
        toastIdRef.current = null;
        hasShownToastRef.current = false;
      }
    };
    window.addEventListener("download:start", handler as any);
    return () => window.removeEventListener("download:start", handler as any);
  }, []);

  // Subscribe to WS progress events
  useEffect(() => {
    if (!currentDownloadId) return;

    let cancelled = false;

    const url = new URL(window.location.href);
    const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${url.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", downloadId: currentDownloadId }));
    };

    ws.onmessage = (ev) => {
      if (cancelled) return;
      const msg = JSON.parse(ev.data) as WsServerMessage;
      if (msg.type === "progress") setSnapshot(msg.snapshot);
    };

    return () => {
      cancelled = true;
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "unsubscribe", downloadId: currentDownloadId }));
        }
      } catch {}
      try {
        ws.close();
      } catch {}
    };
  }, [currentDownloadId]);

  // Poll status so we can show a Download button when completed + show title/thumbnail.
  useEffect(() => {
    if (!currentDownloadId) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const res = await fetch(`/api/download/${currentDownloadId}/status`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        setDownloadUrl(json?.downloadUrl ?? null);
        setTitle(json?.title ?? null);
        setThumbnail(json?.thumbnail ?? null);

        if (json?.status === 'completed') {
          completedRef.current = true;
          if (timer) window.clearInterval(timer);
        }
        if (json?.status === 'failed') {
          if (timer) window.clearInterval(timer);
        }
      } catch {}
    };

    completedRef.current = false;
    poll();
    timer = window.setInterval(poll, 1500);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [currentDownloadId]);

  const percent = useMemo(() => {
    const p = snapshot?.percent;
    if (typeof p === "number" && Number.isFinite(p) && p > 0) return Math.max(0, Math.min(100, p));

    // fallback staged progress so UI doesn't look stuck at 0%
    switch (snapshot?.stage) {
      case 'queued':
        return 3;
      case 'fetching_info':
        return 8;
      case 'downloading':
        return 25;
      case 'postprocessing':
        return 92;
      case 'completed':
        return 100;
      case 'failed':
        return 100;
      default:
        return 0;
    }
  }, [snapshot?.percent, snapshot?.stage]);

  // Show / update toast when progress card isn't visible
  useEffect(() => {
    if (!currentDownloadId) return;
    if (!snapshot) return;

    const label = snapshot.message ||
      (snapshot.stage === "completed" ? "Ready" : snapshot.stage === "failed" ? "Failed" : "Downloading");

    const details = [
      typeof snapshot.downloadedBytes === 'number' ? formatBytes(snapshot.downloadedBytes) : '',
      typeof snapshot.totalBytes === 'number' ? ` / ${formatBytes(snapshot.totalBytes)}` : '',
    ].join('');

    const render = () => ({
      title: snapshot.stage === 'completed' ? 'Ready to download' : `Downloading… ${Math.round(percent)}%`,
      description: (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {thumbnail ? (
              <img src={thumbnail} alt="Thumbnail" className="h-10 w-10 rounded object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{title || 'Download in progress'}</div>
              <div className="text-xs text-muted-foreground">{label}{details ? ` • ${details}` : ''}</div>
            </div>
          </div>
          <Progress value={percent} className="h-2" />

          {/* Toast ad (only while working) */}
          {snapshot.stage !== 'completed' && snapshot.stage !== 'failed' ? (
            <AdSlot variant="toast" label="Sponsored" />
          ) : null}

          <div className="flex gap-2">
            {downloadUrl && snapshot.stage === 'completed' ? (
              <a
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                href={downloadUrl}
                download
              >
                Download
              </a>
            ) : null}
            <button
              className="inline-flex h-8 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium hover:bg-secondary"
              onClick={() => {
                document.getElementById("download-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              type="button"
            >
              View
            </button>
          </div>
        </div>
      ),
    });

    const ensureToast = () => {
      if (isProgressVisible()) return;

      if (!toastIdRef.current) {
        const t = toast(render());
        toastIdRef.current = t.id;
        return;
      }

      // Update existing toast
      toast({ id: toastIdRef.current, ...render() });
    };

    ensureToast();

    const onScroll = () => ensureToast();
    const onResize = () => ensureToast();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", ensureToast);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", ensureToast);
    };
  }, [currentDownloadId, snapshot, percent, downloadUrl, title, thumbnail]);

  // When a download starts, show an initial toast immediately (0%) if progress UI is off-screen.
  useEffect(() => {
    if (!currentDownloadId) return;

    const renderInitial = () => ({
      title: title ? 'Preparing…' : 'Preparing… 0%',
      description: (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {thumbnail ? (
              <img src={thumbnail} alt="Thumbnail" className="h-10 w-10 rounded object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{title || 'Preparing download'}</div>
              <div className="text-xs text-muted-foreground">Starting download…</div>
            </div>
          </div>
          <Progress value={0} className="h-2" />
          <div className="flex gap-2">
            <button
              className="inline-flex h-8 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium hover:bg-secondary"
              onClick={() => {
                document.getElementById("download-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              type="button"
            >
              View
            </button>
          </div>
        </div>
      ),
    });

    const ensure = () => {
      if (isProgressVisible()) return;
      if (hasShownToastRef.current) return;
      const t = toast(renderInitial());
      toastIdRef.current = t.id;
      hasShownToastRef.current = true;
    };

    ensure();
  }, [currentDownloadId, title, thumbnail]);

  // Reset toast id when a new download starts
  useEffect(() => {
    toastIdRef.current = null;
    completedRef.current = false;
  }, [currentDownloadId]);

  return null;
}
