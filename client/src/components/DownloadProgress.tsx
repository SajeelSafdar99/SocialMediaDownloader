import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DownloadProgressProps {
  downloadId: string;
  onComplete?: () => void;
}

type DownloadStatus = "pending" | "processing" | "completed" | "failed";

interface DownloadStatusResponse {
  id: number;
  status: DownloadStatus;
  title?: string;
  thumbnail?: string;
  downloadUrl?: string;
  fileSize?: number;
}

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

type DownloadStage =
  | "queued"
  | "fetching_info"
  | "downloading"
  | "postprocessing"
  | "completed"
  | "failed";

interface DownloadProgressSnapshot {
  downloadId: number;
  stage: DownloadStage;
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  etaSeconds?: number;
  speedBytesPerSecond?: number;
  message?: string;
  updatedAt: number;
}

type WsServerMessage =
  | { type: "progress"; snapshot: DownloadProgressSnapshot }
  | { type: "error"; message: string };

export default function DownloadProgress({ downloadId, onComplete }: DownloadProgressProps) {
  const { toast } = useToast();
  const [data, setData] = useState<DownloadStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DownloadProgressSnapshot | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasNotifiedCompleteRef = useRef(false);

  const progressValue = useMemo(() => {
    const p = snapshot?.percent;
    if (typeof p === "number" && Number.isFinite(p)) return Math.max(0, Math.min(100, p));

    // fallback if we don't have a real percentage yet
    switch (snapshot?.stage ?? data?.status) {
      case "queued":
      case "pending":
        return 5;
      case "fetching_info":
        return 10;
      case "downloading":
      case "processing":
        return 35;
      case "postprocessing":
        return 90;
      case "completed":
        return 100;
      case "failed":
        return 100;
      default:
        return 5;
    }
  }, [snapshot?.percent, snapshot?.stage, data?.status]);

  const statusLabel = useMemo(() => {
    if (snapshot?.message) return snapshot.message;

    switch (snapshot?.stage ?? data?.status) {
      case "queued":
      case "pending":
        return "Queued…";
      case "fetching_info":
        return "Fetching info…";
      case "downloading":
      case "processing":
        return "Downloading…";
      case "postprocessing":
        return "Finalizing…";
      case "completed":
        return "Ready to download";
      case "failed":
        return "Failed";
      default:
        return "Starting…";
    }
  }, [snapshot?.message, snapshot?.stage, data?.status]);

  const detailsLabel = useMemo(() => {
    const parts: string[] = [];
    if (typeof snapshot?.downloadedBytes === "number") {
      parts.push(formatBytes(snapshot.downloadedBytes));
    }
    if (typeof snapshot?.totalBytes === "number") {
      parts.push(`/ ${formatBytes(snapshot.totalBytes)}`);
    }
    if (typeof snapshot?.speedBytesPerSecond === "number" && snapshot.speedBytesPerSecond > 0) {
      parts.push(`• ${formatBytes(snapshot.speedBytesPerSecond)}/s`);
    }
    if (typeof snapshot?.etaSeconds === "number" && snapshot.etaSeconds >= 0) {
      const m = Math.floor(snapshot.etaSeconds / 60);
      const s = Math.floor(snapshot.etaSeconds % 60);
      parts.push(`• ETA ${m}:${String(s).padStart(2, "0")}`);
    }
    return parts.join(" ");
  }, [snapshot?.downloadedBytes, snapshot?.totalBytes, snapshot?.speedBytesPerSecond, snapshot?.etaSeconds]);

  // WebSocket subscription for real-time progress
  useEffect(() => {
    const idNum = Number(downloadId);
    if (!Number.isFinite(idNum)) return;

    let cancelled = false;

    const url = new URL(window.location.href);
    const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${url.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", downloadId: idNum }));
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as WsServerMessage;
      if (cancelled) return;
      if (msg.type === "error") {
        setError(msg.message);
        return;
      }
      if (msg.type === "progress") {
        setSnapshot(msg.snapshot);
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      // don't spam; just set a readable error and allow status polling to continue
      setError((prev) => prev || "Live progress unavailable (WebSocket error)");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      cancelled = true;
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "unsubscribe", downloadId: idNum }));
        }
      } catch {}
      try {
        ws.close();
      } catch {}
    };
  }, [downloadId]);

  // Status polling to get download URL + final fileSize
  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    async function poll() {
      try {
        setError(null);
        const res = await apiRequest("GET", `/api/download/${downloadId}/status`);
        const json = (await res.json()) as DownloadStatusResponse;
        if (cancelled) return;
        setData(json);

        if (json.status === "completed") {
          if (!hasNotifiedCompleteRef.current) {
            hasNotifiedCompleteRef.current = true;
            toast({ title: "Ready", description: "Your file is ready to download." });
          }
          if (interval) window.clearInterval(interval);
        }

        if (json.status === "failed") {
          if (interval) window.clearInterval(interval);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to fetch status");
      }
    }

    poll();
    interval = window.setInterval(poll, 1200);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [downloadId, toast]);

  const isFailed = (snapshot?.stage === "failed") || data?.status === "failed";
  const isCompleted = (snapshot?.stage === "completed") || data?.status === "completed";

  return (
    <section id="download-progress" className="py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg border border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {data?.thumbnail ? (
                  <img src={data.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <i className="fas fa-video text-2xl"></i>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{data?.title || "Preparing download"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {statusLabel}
                      {data?.fileSize ? ` • ${formatBytes(data.fileSize)}` : ""}
                      {detailsLabel ? ` • ${detailsLabel}` : ""}
                    </p>
                  </div>

                  {onComplete && (
                    <Button variant="ghost" size="sm" onClick={onComplete}>
                      Close
                    </Button>
                  )}
                </div>

                <div className="mt-3">
                  <Progress value={progressValue} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{`${Math.round(progressValue)}%`}</span>
                    <span>{snapshot?.stage === "postprocessing" ? "Finalizing" : "Downloading"}</span>
                    <span>{isCompleted ? "Ready" : ""}</span>
                  </div>
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isCompleted && data?.downloadUrl && (
                    <Button asChild className="btn-primary">
                      <a href={data.downloadUrl} download>
                        <i className="fas fa-download mr-2"></i>
                        Download file
                      </a>
                    </Button>
                  )}

                  {isFailed && (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        toast({
                          title: "Download failed",
                          description: "Please try again with a different link or quality.",
                          variant: "destructive",
                        })
                      }
                    >
                      <i className="fas fa-triangle-exclamation mr-2"></i>
                      Download failed
                    </Button>
                  )}

                  {!isCompleted && !isFailed && (
                    <Button variant="outline" disabled>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Working…
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}