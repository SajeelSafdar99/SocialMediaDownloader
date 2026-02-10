import { useState } from 'react';
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import DownloadForm from "@/components/DownloadForm";
import DownloadProgress from "@/components/DownloadProgress";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";

export default function YouTubeDownloader() {
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);

  const features = [
    'Download YouTube videos in up to 4K quality',
    'Extract audio as MP3 files',
    'Support for YouTube Shorts',
    'Download entire playlists (Premium)',
    'No ads or interruptions',
    'Works with all YouTube content'
  ];

  const qualityOptions = [
    { quality: '4K (2160p)', description: 'Ultra HD quality for Premium users', premium: true },
    { quality: '1080p', description: 'Full HD quality for all users', premium: false },
    { quality: '720p', description: 'HD quality for all users', premium: false },
    { quality: '480p', description: 'Standard definition', premium: false },
  ];

  return (
    <>
      <SEOHead
        title="YouTube Downloader - Download Videos & Audio in HD/4K | VidGrabber"
        description="Download YouTube videos in HD, 1080p, and 4K quality. Extract audio as MP3. Support for YouTube Shorts and playlists. Fast and free."
        keywords="youtube downloader, download youtube videos, youtube to mp3, youtube video downloader, youtube 4k downloader, youtube downloader free"
        canonicalUrl="/youtube-downloader"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "YouTube Downloader",
            "description": "Download YouTube videos in HD, 1080p, and 4K quality",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Any",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            "featureList": [
              "Download YouTube videos in up to 4K quality",
              "Extract audio as MP3 files",
              "Support for YouTube Shorts",
              "Download entire playlists (Premium)",
              "No ads or interruptions"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "YouTube Downloader - VidGrabber",
            "description": "Download YouTube videos in HD, 1080p, and 4K quality",
            "url": typeof window !== 'undefined' ? `${window.location.origin}/youtube-downloader` : 'https://savemedia.app/youtube-downloader'
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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6">
                  <i className="fab fa-youtube text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="gradient-text">YouTube</span> Video Downloader
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Download YouTube videos in HD, 1080p, and 4K quality. Extract audio as MP3 files. Support for Shorts and playlists.
                </p>
              </div>

              <DownloadForm onDownloadStart={setCurrentDownloadId} defaultPlatform="youtube" />
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

          {/* Secondary Ad Slot */}
          <section className="py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {/* Features Section */}
                  <section className="py-16 bg-muted/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                          <h2 className="text-3xl font-bold mb-6">YouTube Downloader Features</h2>
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
                            <h3 className="text-2xl font-bold mb-4">Quality Options</h3>
                            <div className="space-y-3">
                              {qualityOptions.map((option, index) => (
                                <div
                                  key={index}
                                  className={`p-4 rounded-xl border flex items-center justify-between ${
                                    option.premium 
                                      ? 'bg-accent/5 border-accent/30' 
                                      : 'bg-primary/5 border-primary/20'
                                  }`}
                                >
                                  <div>
                                    <h4 className="font-semibold flex items-center space-x-2">
                                      <span>{option.quality}</span>
                                      {option.premium && (
                                        <span className="px-2 py-1 rounded text-xs bg-accent/20 text-accent font-medium">
                                          Premium
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                  </div>
                                  <i className={`fas ${option.premium ? 'fa-crown text-accent' : 'fa-check text-secondary'} text-xl`}></i>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </section>

                  {/* Content Types Section */}
                  <section className="py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Supported YouTube Content</h2>
                        <p className="text-lg text-muted-foreground">Download any type of YouTube content</p>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="text-center border border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-video text-primary text-2xl"></i>
                            </div>
                            <h3 className="font-semibold mb-2">Regular Videos</h3>
                            <p className="text-sm text-muted-foreground">Long-form YouTube videos of any length</p>
                          </CardContent>
                        </Card>

                        <Card className="text-center border border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-mobile-alt text-primary text-2xl"></i>
                            </div>
                            <h3 className="font-semibold mb-2">YouTube Shorts</h3>
                            <p className="text-sm text-muted-foreground">Vertical short-form videos under 60 seconds</p>
                          </CardContent>
                        </Card>

                        <Card className="text-center border border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-list text-accent text-2xl"></i>
                            </div>
                            <h3 className="font-semibold mb-2">Playlists <span className="text-xs text-accent">(Premium)</span></h3>
                            <p className="text-sm text-muted-foreground">Download entire playlists in batch</p>
                          </CardContent>
                        </Card>

                        <Card className="text-center border border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                              <i className="fas fa-music text-primary text-2xl"></i>
                            </div>
                            <h3 className="font-semibold mb-2">Audio Extraction</h3>
                            <p className="text-sm text-muted-foreground">Extract audio as high-quality MP3 files</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </section>

                  {/* How to Use Section */}
                  <section className="py-16 bg-muted/30">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                      <h2 className="text-3xl font-bold text-center mb-12">How to Download YouTube Videos</h2>

                      <div className="space-y-8">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                            1
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold mb-2">Copy YouTube URL</h3>
                            <p className="text-muted-foreground">Go to YouTube and find the video you want to download. Copy the URL from your browser's address bar or use the share button.</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                            2
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold mb-2">Choose Format & Quality</h3>
                            <p className="text-muted-foreground">Paste the URL above, select MP4 for video or MP3 for audio only, then choose your preferred quality setting.</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                            3
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold mb-2">Download & Enjoy</h3>
                            <p className="text-muted-foreground">Click download and wait for processing. Save the file to your device and enjoy offline viewing or listening.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="lg:col-span-1">
                  <AdSlot variant="square" label="Sponsored" />
                </div>
              </div>
            </div>
          </section>

          {/* ...existing code... */}

        </main>

        <Footer />
      </div>
    </>
  );
}
