import { useState } from 'react';
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import DownloadForm from "@/components/DownloadForm";
import DownloadProgress from "@/components/DownloadProgress";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";

export default function TikTokDownloader() {
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);

  const features = [
    'Remove TikTok watermarks automatically',
    'Download videos with or without sound',
    'Support for HD quality downloads',
    'Works with all TikTok video types',
    'Fast processing and download speeds',
    'No registration or login required'
  ];

  return (
    <>
      <SEOHead
        title="TikTok Downloader - Download Videos Without Watermark | VidGrabber"
        description="Download TikTok videos without watermarks in HD quality. Remove TikTok watermarks automatically. Fast, free, and easy to use."
        keywords="tiktok downloader, download tiktok videos, tiktok video downloader, remove tiktok watermark, save tiktok videos, tiktok downloader free"
        canonicalUrl="/tiktok-downloader"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "TikTok Downloader",
            "description": "Download TikTok videos without watermarks in HD quality",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Any",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "featureList": [
              "Remove TikTok watermarks automatically",
              "Download videos with or without sound",
              "Support for HD quality downloads",
              "Works with all TikTok video types",
              "Fast processing and download speeds"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "TikTok Downloader - VidGrabber",
            "description": "Download TikTok videos without watermarks in HD quality",
            "url": typeof window !== 'undefined' ? `${window.location.origin}/tiktok-downloader` : 'https://savemedia.app/tiktok-downloader'
          }
        ]}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-16 sm:py-24 hero-gradient">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
                  <i className="fab fa-tiktok text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="gradient-text">TikTok</span> Video Downloader
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Download TikTok videos without watermarks in HD quality. Choose to download with or without sound.
                </p>
              </div>

              <DownloadForm onDownloadStart={setCurrentDownloadId} defaultPlatform="tiktok" />
            </div>
          </section>

          {/* Ad Slot */}
          <section className="py-4 bg-muted/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdSlot label="Sponsored" />
            </div>
          </section>

          {/* Download Progress */}
          {currentDownloadId && (
            <DownloadProgress
              downloadId={currentDownloadId}
              onComplete={() => setCurrentDownloadId(null)}
            />
          )}

          {/* Features Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-6">TikTok Downloader Features</h2>
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-check text-secondary text-xs"></i>
                        </div>
                        <p className="text-foreground">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="shadow-xl border-2 border-primary/20">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold mb-4">Download Options</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <i className="fas fa-video text-primary text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold">Video with Sound</h4>
                          <p className="text-sm text-muted-foreground">Original TikTok video with audio</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <i className="fas fa-video-slash text-primary text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold">Video without Sound</h4>
                          <p className="text-sm text-muted-foreground">Silent version for GIF-like content</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <i className="fas fa-music text-primary text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold">Audio Only</h4>
                          <p className="text-sm text-muted-foreground">Extract just the audio as MP3</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How to Use Section */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-center mb-12">How to Download TikTok Videos</h2>

              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Find Your TikTok Video</h3>
                    <p className="text-muted-foreground">Open TikTok app or website and navigate to the video you want to download. Tap the share button.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Copy Video Link</h3>
                    <p className="text-muted-foreground">Select "Copy Link" from the share options. The TikTok video URL will be copied to your clipboard.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Download Without Watermark</h3>
                    <p className="text-muted-foreground">Paste the URL above, choose your format (video or audio), and click download. The watermark will be automatically removed.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
