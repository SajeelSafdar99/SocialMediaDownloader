export type DownloadStage =
  | "queued"
  | "fetching_info"
  | "downloading"
  | "postprocessing"
  | "completed"
  | "failed";

export interface DownloadProgressSnapshot {
  downloadId: number;
  stage: DownloadStage;
  /** 0..100 */
  percent?: number;
  /** bytes downloaded so far */
  downloadedBytes?: number;
  /** total bytes if known */
  totalBytes?: number;
  /** seconds, if known */
  etaSeconds?: number;
  /** bytes/sec, if known */
  speedBytesPerSecond?: number;
  /** last status line */
  message?: string;
  updatedAt: number;
}

class DownloadProgressStore {
  private snapshots = new Map<number, DownloadProgressSnapshot>();

  set(snapshot: DownloadProgressSnapshot) {
    this.snapshots.set(snapshot.downloadId, snapshot);
  }

  get(downloadId: number): DownloadProgressSnapshot | undefined {
    return this.snapshots.get(downloadId);
  }

  clear(downloadId: number) {
    this.snapshots.delete(downloadId);
  }
}

export const downloadProgressStore = new DownloadProgressStore();

