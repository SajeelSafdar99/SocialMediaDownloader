import { useState } from 'react';
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import DownloadForm from "@/components/DownloadForm";
import DownloadProgress from "@/components/DownloadProgress";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";

export default function InstagramDownloader() {
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);

  const features = [
    'Download Instagram Reels in HD quality',
    'Save Stories before they expire',
    'Download IGTV videos and regular posts',
    'No watermarks on downloaded content',
    'Support for both photos and videos',
    'Works with public Instagram content'
  ];

  return (
    <>
      <SEOHead
        title="Instagram Downloader - Download Reels, Stories & Posts | VidGrabber"
        description="Download Instagram Reels, Stories, and posts in high quality. No watermarks, fast downloads, completely free. Works with all Instagram content types."
        keywords="instagram downloader, download instagram reels, download instagram stories, instagram video downloader, save instagram posts, instagram downloader free"
        canonicalUrl="/instagram-downloader"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Instagram Downloader",
            "description": "Download Instagram Reels, Stories, and posts in high quality",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Any",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "featureList": [
              "Download Instagram Reels in HD quality",
              "Save Stories before they expire",
              "Download IGTV videos and regular posts",
              "No watermarks on downloaded content",
              "Support for both photos and videos"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Instagram Downloader - VidGrabber",
            "description": "Download Instagram Reels, Stories, and posts in high quality",
            "url": typeof window !== 'undefined' ? `${window.location.origin}/instagram-downloader` : 'https://savemedia.app/instagram-downloader'
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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                  <i className="fab fa-instagram text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="gradient-text">Instagram</span> Video Downloader
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Download Instagram Reels, Stories, IGTV, and posts in high quality. Fast, free, and no watermarks.
                </p>
              </div>

              <DownloadForm onDownloadStart={setCurrentDownloadId} defaultPlatform="instagram" />
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
                  <h2 className="text-3xl font-bold mb-6">Why Choose Our Instagram Downloader?</h2>
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
                    <h3 className="text-2xl font-bold mb-4">Instagram Content Types</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <i className="fas fa-video text-primary text-2xl mb-2"></i>
                        <p className="font-semibold text-sm">Reels</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <i className="fas fa-clock text-primary text-2xl mb-2"></i>
                        <p className="font-semibold text-sm">Stories</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <i className="fas fa-tv text-primary text-2xl mb-2"></i>
                        <p className="font-semibold text-sm">IGTV</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <i className="fas fa-image text-primary text-2xl mb-2"></i>
                        <p className="font-semibold text-sm">Posts</p>
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
              <h2 className="text-3xl font-bold text-center mb-12">How to Download Instagram Videos</h2>

              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Copy Instagram URL</h3>
                    <p className="text-muted-foreground">Open Instagram and find the Reel, Story, or post you want to download. Tap the three dots and select "Copy Link"</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Paste URL Above</h3>
                    <p className="text-muted-foreground">Return to this page and paste the Instagram URL in the input field above. Select your preferred quality.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Download & Save</h3>
                    <p className="text-muted-foreground">Click the download button and save the video to your device. No watermarks, full quality preserved.</p>
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
