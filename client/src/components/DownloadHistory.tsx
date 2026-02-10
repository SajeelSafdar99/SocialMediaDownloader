import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DownloadHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery({
    queryKey: ['/api/downloads'],
    enabled: !!user,
    refetchInterval: (query) => {
      const items = (query.state.data as any[]) || [];
      const hasActive = items.some((d) => d?.status === 'pending' || d?.status === 'processing');
      return hasActive ? 2000 : false;
    },
  });

  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'pending' | 'failed' | 'expired'>('all');

  const filteredDownloads = useMemo(() => {
    if (filter === 'all') return downloads;
    return downloads.filter((d: any) => d.status === filter);
  }, [downloads, filter]);

  const notifyGlobalDownloadStart = (downloadId: string) => {
    try {
      window.dispatchEvent(new CustomEvent('download:start', { detail: { downloadId } }));
    } catch {}
  };

  const redownloadMutation = useMutation({
    mutationFn: async (payload: { url: string; format: string; quality: string }) => {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to start download');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Re-download started', description: 'We’re preparing your file again.' });
      const id = String((data as any)?.id ?? '');
      if (id) notifyGlobalDownloadStart(id);
      qc.invalidateQueries({ queryKey: ['/api/downloads'] });
    },
    onError: (e: any) => {
      toast({ title: 'Re-download failed', description: e?.message || 'Please try again', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/download/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to delete');
      }
      return true;
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Removed from history.' });
      qc.invalidateQueries({ queryKey: ['/api/downloads'] });
    },
    onError: (e: any) => {
      toast({ title: 'Delete failed', description: e?.message || 'Please try again', variant: 'destructive' });
    },
  });

  const handleDownloadClick = async (download: any) => {
    try {
      const res = await fetch(`/api/download/${download.id}/file`, { method: 'GET' });

      // If the server says the file is gone/expired, start a new download automatically.
      if (res.status === 410) {
        redownloadMutation.mutate({
          url: download.originalUrl,
          format: download.format || 'mp4',
          quality: download.quality || '720p',
        });
        return;
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Unable to download this file');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || `download-${download.id}.${download.format === 'mp3' ? 'mp3' : 'mp4'}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      qc.invalidateQueries({ queryKey: ['/api/downloads'] });
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Please try again', variant: 'destructive' });
    }
  };

  const handleShare = async (download: any) => {
    const text = download.originalUrl;
    if (!text) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: download.title || 'Download link', url: text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Link copied', description: 'Original URL copied to clipboard.' });
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Link copied', description: 'Original URL copied to clipboard.' });
      } catch {
        toast({ title: 'Share failed', description: 'Could not share/copy link.', variant: 'destructive' });
      }
    }
  };

  if (!user) {
    return (
        <section id="history" className="py-16 sm:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Download History</h2>
                <p className="text-muted-foreground">Your recent downloads and saved media</p>
              </div>
            </div>

            <Card className="shadow-lg border border-border">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <i className="fas fa-history text-2xl text-muted-foreground"></i>
                </div>
                <h3 className="text-xl font-bold mb-2">Sign in to View History</h3>
                <p className="text-muted-foreground mb-6">Keep track of all your downloads across devices</p>

                {/* UPDATED: Points to new Auth Page */}
                <Button asChild className="btn-primary px-6 py-3 rounded-xl font-semibold">
                  <Link href="/auth">
                    Sign In to Continue
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
    );
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'fab fa-instagram';
      case 'tiktok': return 'fab fa-tiktok';
      case 'youtube': return 'fab fa-youtube';
      default: return 'fas fa-video';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (download: any) => {
    if (download.status === 'expired') {
      return 'bg-amber-500/10 text-amber-600';
    }
    if (download.status === 'completed') {
      return 'bg-secondary/10 text-secondary';
    }
    if (download.status === 'failed') {
      return 'bg-destructive/10 text-destructive';
    }
    return 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (download: any) => {
    if (download.status === 'expired') return 'Expired';
    return download.quality;
  };

  return (
      <section id="history" className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Download History</h2>
              <p className="text-muted-foreground">Your recent downloads and saved media</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
              <Button
                variant={filter === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('failed')}
              >
                Failed
              </Button>
              <Button
                variant={filter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('expired')}
              >
                Expired
              </Button>
            </div>
          </div>

          {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4 animate-pulse">
                          <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-muted rounded w-24"></div>
                              <div className="h-8 bg-muted rounded w-20"></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                ))}
              </div>
          ) : filteredDownloads.length === 0 ? (
              <Card className="shadow-lg border border-border">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <i className="fas fa-download text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Downloads</h3>
                  <p className="text-muted-foreground">No items match this filter.</p>
                </CardContent>
              </Card>
          ) : (
              <div className="space-y-4">
                {filteredDownloads.map((download: any) => (
                    <Card key={download.id} className="shadow border border-border hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          {/* Thumbnail */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {download.thumbnail ? (
                                <img
                                    src={download.thumbnail}
                                    alt="Download thumbnail"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <i className="fas fa-video text-2xl text-muted-foreground"></i>
                                </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-semibold truncate">
                                  {download.title || 'Untitled'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  <i className={`${getPlatformIcon(download.platform)} mr-1`}></i>
                                  {download.platform} • {formatDate(download.createdAt)}
                                  {download.expiresAt && download.status === 'completed' ? (
                                      <span className="ml-2">• Expires {new Date(download.expiresAt).toLocaleString()}</span>
                                  ) : null}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(download)}`}>
                          {getStatusLabel(download)}
                        </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              {download.status === 'completed' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleDownloadClick(download)}
                                >
                                  <i className="fas fa-download text-xs mr-1"></i>
                                  Download
                                </Button>
                              )}

                              {(download.status === 'expired' || download.status === 'failed') && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    redownloadMutation.mutate({
                                      url: download.originalUrl,
                                      format: download.format || 'mp4',
                                      quality: download.quality || '720p',
                                    })
                                  }
                                  disabled={redownloadMutation.isPending}
                                >
                                  <i className="fas fa-rotate-right text-xs mr-1"></i>
                                  Re-download
                                </Button>
                              )}

                              <Button size="sm" variant="outline" onClick={() => handleShare(download)}>
                                <i className="fas fa-share-alt text-xs mr-1"></i>
                                <span className="hidden sm:inline">Share</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMutation.mutate(Number(download.id))}
                                disabled={deleteMutation.isPending}
                                title="Delete from history"
                              >
                                <i className="fas fa-trash text-destructive"></i>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                ))}
              </div>
          )}
        </div>
      </section>
  );
}

