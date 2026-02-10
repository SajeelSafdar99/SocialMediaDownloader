import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import DownloadForm from "@/components/DownloadForm";
import DownloadProgress from "@/components/DownloadProgress";
import DownloadHistory from "@/components/DownloadHistory";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.downloadId;
      if (id) setCurrentDownloadId(String(id));
    };
    window.addEventListener('download:start', handler as any);
    return () => window.removeEventListener('download:start', handler as any);
  }, []);

  return (
    <>
      <Helmet>
        <title>VidGrabber - Download Videos from Instagram, TikTok & YouTube</title>
        <meta name="description" content="Download videos from Instagram, TikTok, YouTube and more. Fast, free, and easy to use." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section with Download Form */}
          <section className="py-16 hero-gradient">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  {user?.username ? (
                    <>Welcome back, {user.username}!</>
                  ) : (
                    <>Download Videos from Any Platform</>
                  )}
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                  {user?.isPremium ? (
                    <>
                      Enjoy unlimited downloads with your Premium membership
                      {user.premiumExpiresAt && (
                        <>
                          {' '}- Premium active until{' '}
                          <span className="font-semibold text-orange-500">
                            {new Date(user.premiumExpiresAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <>Fast, free, and easy. Download Instagram Reels, TikTok videos, YouTube content and more in high quality.</>
                  )}
                </p>
              </div>

              <DownloadForm onDownloadStart={(id: string) => setCurrentDownloadId(id)} />
            </div>
          </section>

          {/* Download Progress */}
          {currentDownloadId && (
            <DownloadProgress downloadId={currentDownloadId} />
          )}

          {/* Download History */}
          <DownloadHistory />
        </main>

        <Footer />
      </div>
    </>
  );
}
