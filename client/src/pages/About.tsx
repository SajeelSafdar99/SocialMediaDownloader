import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  const stats = [
    { label: "Downloads Served", value: "10M+", icon: "fas fa-download" },
    { label: "Active Users", value: "500K+", icon: "fas fa-users" },
    { label: "Supported Platforms", value: "6+", icon: "fas fa-globe" },
    { label: "Countries", value: "150+", icon: "fas fa-map-marker-alt" },
  ];

  const features = [
    {
      icon: "fas fa-bolt",
      title: "Lightning Fast",
      description: "Download videos in seconds with our optimized infrastructure and CDN network.",
    },
    {
      icon: "fas fa-shield-alt",
      title: "Secure & Private",
      description: "Your data is encrypted and files are automatically deleted after download for privacy.",
    },
    {
      icon: "fas fa-mobile-alt",
      title: "Works Everywhere",
      description: "Compatible with all devices - desktop, mobile, tablet. No app installation needed.",
    },
    {
      icon: "fas fa-infinity",
      title: "No Limits",
      description: "Free tier available with premium options for unlimited downloads and 4K quality.",
    },
  ];

  const platforms = [
    { name: "Instagram", icon: "fab fa-instagram", color: "from-purple-500 to-pink-500" },
    { name: "TikTok", icon: "fab fa-tiktok", color: "from-cyan-500 to-blue-600" },
    { name: "YouTube", icon: "fab fa-youtube", color: "from-red-500 to-red-600" },
    { name: "Facebook", icon: "fab fa-facebook", color: "from-blue-500 to-blue-700" },
    { name: "Twitter/X", icon: "fab fa-twitter", color: "from-blue-400 to-blue-500" },
    { name: "Terabox", icon: "fas fa-cloud-download-alt", color: "from-green-500 to-emerald-600" },
  ];

  return (
    <>
      <SEOHead
        title="About VidGrabber - Fast & Free Video Downloader"
        description="Learn about VidGrabber, a fast and simple social media video downloader. Download videos from Instagram, TikTok, YouTube, and more. 10M+ downloads served, 500K+ active users worldwide."
        keywords="about savemedia, video downloader company, social media downloader, instagram downloader, tiktok downloader, youtube downloader"
        canonicalUrl="/about"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About VidGrabber",
          "description": "Learn about VidGrabber, a fast and simple social media video downloader",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/about` : 'https://savemedia.app/about',
          "mainEntity": {
            "@type": "Organization",
            "name": "VidGrabber",
            "description": "The fastest way to download videos from social media platforms",
            "url": typeof window !== 'undefined' ? window.location.origin : 'https://savemedia.app',
            "foundingDate": "2024",
            "numberOfEmployees": {
              "@type": "QuantitativeValue",
              "value": "10+"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "1250"
            }
          }
        }}
      />
      <Helmet>
        <title>About - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-rocket text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  About <span className="gradient-text">VidGrabber</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-8">
                  A modern video downloader built to feel fast, simple, and trustworthy. 
                  We make it easy to save your favorite content from social media platforms.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button asChild size="lg" className="rounded-xl">
                    <Link href="/">Start Downloading</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-xl">
                    <Link href="/subscribe">Go Premium</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <Card key={index} className="text-center border-2 border-border hover:border-primary/50 transition-colors">
                    <CardContent className="p-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.icon.includes('download') ? 'from-blue-500 to-blue-600' : stat.icon.includes('users') ? 'from-green-500 to-green-600' : stat.icon.includes('globe') ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center mx-auto mb-4`}>
                        <i className={`${stat.icon} text-white text-2xl`}></i>
                      </div>
                      <div className="text-3xl font-bold mb-2 gradient-text">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6">Our Mission</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    At VidGrabber, we believe that accessing and saving your favorite content should be simple, 
                    fast, and free. We're committed to providing the best video downloading experience without 
                    compromising on quality or security.
                  </p>
                  <p className="text-lg text-muted-foreground mb-6">
                    Our platform is designed with user privacy in mind. We don't store your personal data, 
                    and all downloaded files are automatically deleted after a short period to ensure your privacy.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                      <i className="fas fa-check-circle mr-2"></i>100% Free
                    </span>
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                      <i className="fas fa-shield-alt mr-2"></i>Secure
                    </span>
                    <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                      <i className="fas fa-lock mr-2"></i>Private
                    </span>
                  </div>
                </div>
                <Card className="shadow-xl border-2 border-primary/20">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold mb-6">What We Do</h3>
                    <ul className="space-y-4">
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check text-primary"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Auto-detect Platform</h4>
                          <p className="text-sm text-muted-foreground">Automatically detect the platform from URL</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check text-primary"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Format & Quality Selection</h4>
                          <p className="text-sm text-muted-foreground">Choose from multiple formats and quality options</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check text-primary"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Real-time Progress</h4>
                          <p className="text-sm text-muted-foreground">Track your downloads with live progress updates</p>
                        </div>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check text-primary"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Clean History</h4>
                          <p className="text-sm text-muted-foreground">Download history with automatic expiry</p>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose VidGrabber?</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We've built VidGrabber with user experience and privacy as our top priorities.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, index) => (
                  <Card key={index} className="border-2 border-border hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                        <i className={`${feature.icon} text-primary text-2xl`}></i>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Supported Platforms */}
          <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Supported Platforms</h2>
                <p className="text-lg text-muted-foreground">
                  Download videos from all major social media platforms
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {platforms.map((platform, index) => (
                  <Card key={index} className="text-center border-2 border-border hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center mx-auto mb-4`}>
                        <i className={`${platform.icon} text-white text-2xl`}></i>
                      </div>
                      <h3 className="font-semibold">{platform.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* File Handling Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <Card className="border-2 border-border shadow-xl">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-info-circle text-primary text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-4">How We Handle Files</h2>
                      <p className="text-muted-foreground mb-4">
                        Files are stored temporarily and may be deleted automatically after a short window, 
                        or right after the download is served. This keeps storage lean and your experience clean.
                      </p>
                      <p className="text-muted-foreground">
                        If your file expires, you can use the Re-download button in your history to regenerate 
                        the file with the same format and quality. We never store your personal information or 
                        track your downloads beyond what's necessary for the service.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-12">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Join millions of users who trust VidGrabber for their video downloading needs.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button asChild size="lg" className="rounded-xl">
                      <Link href="/">Start Downloading</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-xl">
                      <Link href="/faq">View FAQ</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
