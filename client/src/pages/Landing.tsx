import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import DownloadForm from "@/components/DownloadForm";
import DownloadProgress from "@/components/DownloadProgress";
import DownloadHistory from "@/components/DownloadHistory";
import PremiumModal from "@/components/PremiumModal";
import PWAInstall from "@/components/PWAInstall";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SafePayPlan {
  token: string;
  name: string;
  amount: string;
  currency: string;
  interval_count: number;
  interval: string;
  product: string;
  trial_period_days: number;
  description: string;
  active: boolean;
}

export default function Landing() {
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [plans, setPlans] = useState<SafePayPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const platformFeatures = [
    {
      id: 'instagram',
      name: 'Instagram Downloader',
      icon: 'fab fa-instagram',
      gradient: 'from-purple-500 to-pink-500',
      description: 'Download Reels, Stories, IGTV, and posts in high quality. No login required.',
      features: ['Reels & Stories', 'Photos & Videos', 'No Watermarks'],
      href: '/instagram-downloader',
    },
    {
      id: 'tiktok',
      name: 'TikTok Downloader',
      icon: 'fab fa-tiktok',
      gradient: 'from-cyan-500 to-blue-600',
      description: 'Save TikTok videos without watermarks. Download with or without music.',
      features: ['Watermark-free', 'With/Without Sound', 'HD Quality'],
      href: '/tiktok-downloader',
    },
    {
      id: 'youtube',
      name: 'YouTube Downloader',
      icon: 'fab fa-youtube',
      gradient: 'from-red-500 to-red-600',
      description: 'Download videos or extract audio. Support for playlists and 4K quality.',
      features: ['Video & Audio', 'Up to 4K Quality', 'Playlist Support'],
      href: '/youtube-downloader',
    },
  ];

  // Fetch available plans for pricing display
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const response = await fetch('/api/payment/safepay/available-plans');
        const data = await response.json();

        if (data.ok && data.plans && data.plans.length > 0) {
          console.log('Fetched plans:', data.plans);
          setPlans(data.plans);
        } else {
          console.error('No plans available:', data);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const howItWorksSteps = [
    { step: 1, title: 'Paste URL', description: 'Copy the video link from Instagram, TikTok, or YouTube and paste it in the input field' },
    { step: 2, title: 'Choose Quality', description: 'Select your preferred video quality and format (MP4 or MP3 audio)' },
    { step: 3, title: 'Download', description: 'Click download and save the video to your device instantly' },
  ];

  const faqItems = [
    {
      question: 'Is VidGrabber free to use?',
      answer: 'Yes! VidGrabber offers a free tier with 5 downloads per day. Upgrade to Premium for unlimited downloads and additional features.',
    },
    {
      question: 'Do I need to install any software?',
      answer: 'No installation required! VidGrabber works directly in your web browser on any device.',
    },
    {
      question: 'What video quality options are available?',
      answer: 'We support SD (480p), HD (720p), Full HD (1080p), and 4K (2160p) quality options. 4K is available for Premium users.',
    },
    {
      question: 'Can I download private videos?',
      answer: 'No, we can only download publicly accessible videos due to privacy and platform restrictions.',
    },
    {
      question: 'Is it legal to download videos?',
      answer: 'Downloading is legal for personal use. Please respect copyright and only download content you have permission to use.',
    },
  ];

  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.downloadId;
      if (id) setCurrentDownloadId(String(id));
    };
    window.addEventListener('download:start', handler as any);
    return () => window.removeEventListener('download:start', handler as any);
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('telegramLinked') === '1') {
        toast({ title: 'Telegram linked', description: 'Your Telegram account is now linked to your VidGrabber profile.' });
        params.delete('telegramLinked');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', next);
      }
      if (params.get('whatsappLinked') === '1') {
        toast({ title: 'WhatsApp linked', description: 'Your WhatsApp account is now linked to your VidGrabber profile.' });
        params.delete('whatsappLinked');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', next);
      }
    } catch {
      // ignore
    }
  }, [toast]);

  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;
  const telegramStartPayload = import.meta.env.VITE_TELEGRAM_START_PAYLOAD as string | undefined;
  const telegramUrl = telegramBotUsername ? `https://t.me/${telegramBotUsername}` : undefined;
  const telegramStartUrl = telegramBotUsername
    ? `https://t.me/${telegramBotUsername}?start=${encodeURIComponent(telegramStartPayload || 'start')}`
    : undefined;
  
  const whatsappEnabled = import.meta.env.VITE_WHATSAPP_ENABLED === 'true';
  const whatsappPhoneNumber = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER as string | undefined;
  // WhatsApp deep link: wa.me/phone?text=message (sends /start command)
  const whatsappUrl = whatsappPhoneNumber 
    ? `https://wa.me/${whatsappPhoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('/start')}` 
    : undefined;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareText = encodeURIComponent('VidGrabber — fast, free video downloads from Instagram, TikTok, YouTube, X, Facebook and more.');

  const openShare = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
    }
  };

  const handleShareTwitter = () => {
    const u = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}`;
    openShare(u);
  };

  const handleShareFacebook = () => {
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openShare(u);
  };

  const handleShareWhatsApp = () => {
    const u = `https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(shareUrl)}`;
    openShare(u);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Copied', description: 'Link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the URL from your browser.', variant: 'destructive' });
    }
  };

  return (
    <>
      <SEOHead
        title="VidGrabber - Download Instagram, TikTok & YouTube Videos | Fast & Free"
        description="Download videos and audio from Instagram, TikTok, and YouTube instantly. Multiple quality options, fast downloads, no watermarks. Free & Premium plans available."
        keywords="video downloader, instagram downloader, tiktok downloader, youtube downloader, social media downloader, download videos, no watermark"
        canonicalUrl="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "VidGrabber",
          "description": "Download videos from Instagram, TikTok, and YouTube instantly",
          "url": typeof window !== 'undefined' ? window.location.origin : 'https://savemedia.app',
          "applicationCategory": "MultimediaApplication",
          "operatingSystem": "Any",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "featureList": [
            "Instagram video downloader",
            "TikTok video downloader", 
            "YouTube video downloader",
            "HD quality downloads",
            "No watermarks"
          ]
        }}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 sm:py-24 hero-gradient overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  {user?.username ? (
                    <>Welcome back, {user.username}!</>
                  ) : (
                    <>
                      Download Videos from{" "}
                      <span className="gradient-text">Instagram, TikTok & YouTube</span>
                    </>
                  )}
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
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
                    <>Fast, free, and easy. Paste a link, choose quality, and download instantly. No watermarks, no signup required.</>
                  )}
                </p>

                {(telegramUrl || whatsappUrl) && (
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {telegramUrl && (
                      <>
                        <Button asChild variant="secondary" className="rounded-xl" data-testid="button-add-telegram-bot">
                          <a href={telegramUrl} target="_blank" rel="noreferrer">
                            <i className="fab fa-telegram-plane mr-2"></i>
                            Open Telegram Bot
                          </a>
                        </Button>

                        {telegramStartUrl && (
                          <Button asChild className="rounded-xl" data-testid="button-start-telegram-bot">
                            <a href={telegramStartUrl} target="_blank" rel="noreferrer">
                              <i className="fas fa-bolt mr-2"></i>
                              Start Bot
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                    
                    {whatsappUrl && (
                      <Button asChild variant="secondary" className="rounded-xl bg-green-600 hover:bg-green-700" data-testid="button-add-whatsapp-bot">
                        <a href={whatsappUrl} target="_blank" rel="noreferrer">
                          <i className="fab fa-whatsapp mr-2"></i>
                          Open WhatsApp Bot
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <DownloadForm onDownloadStart={setCurrentDownloadId} />
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
          </section>

          {/* Ad Zone for Free Users */}
          <section className="py-4 bg-muted/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdSlot 
                variant="banner" 
                label="Advertisement"
                adId="landing-hero"
                adsenseClientId={import.meta.env.VITE_ADSENSE_CLIENT_ID}
                adsenseSlotId={import.meta.env.VITE_ADSENSE_SLOT_LANDING}
                adsenseFormat="auto"
              />
            </div>
          </section>

          {/* Download Progress */}
          {currentDownloadId && (
            <DownloadProgress
              downloadId={currentDownloadId}
              onComplete={() => setCurrentDownloadId(null)}
            />
          )}

          {/* Platform Features */}
          <section id="features" className="py-16 sm:py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Download from Your Favorite Platforms</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Specialized downloaders optimized for each platform
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {platformFeatures.map((platform) => (
                  <Card key={platform.id} className="shadow-lg border border-border overflow-hidden card-hover">
                    <CardContent className="p-6 sm:p-8">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center mb-6`}>
                        <i className={`${platform.icon} text-white text-2xl`}></i>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{platform.name}</h3>
                      <p className="text-muted-foreground mb-6">{platform.description}</p>
                      <ul className="space-y-3 mb-6">
                        {platform.features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <i className="fas fa-check text-secondary mt-1"></i>
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href={platform.href} className="inline-flex items-center space-x-2 text-primary font-semibold hover:underline" data-testid={`link-${platform.id}`}>
                        <span>Try Now</span>
                        <i className="fas fa-arrow-right"></i>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Premium Section */}
          <section id="pricing" className="py-16 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-4">
                  ⚡ Go Premium
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Unlock Advanced Features</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Get unlimited downloads, remove ads, and access exclusive features
                </p>
              </div>

              {plansLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading plans...</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-exclamation-circle text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No subscription plans available at the moment.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {/* Free Plan - Always show first */}
                  <Card className="shadow-lg border-2 border-border">
                    <CardContent className="p-8">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <div className="flex items-baseline space-x-2 mb-4">
                          <span className="text-4xl font-bold">$0</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="space-y-4 mb-8">
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-check text-secondary mt-1"></i>
                          <span>5 downloads per day</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-check text-secondary mt-1"></i>
                          <span>SD & HD quality</span>
                        </li>
                        <li className="flex items-start space-x-3">
                          <i className="fas fa-check text-secondary mt-1"></i>
                          <span>All platforms</span>
                        </li>
                        <li className="flex items-start space-x-3 text-muted-foreground">
                          <i className="fas fa-times mt-1"></i>
                          <span>Contains ads</span>
                        </li>
                        <li className="flex items-start space-x-3 text-muted-foreground">
                          <i className="fas fa-times mt-1"></i>
                          <span>No batch downloads</span>
                        </li>
                      </ul>
                      <Button variant="outline" className="w-full" data-testid="button-free-plan">
                        Current Plan
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Dynamic Premium Plans */}
                  {plans.map((plan, index) => {
                    const price = parseFloat(plan.amount) / 100;
                    const intervalText = plan.interval_count === 1
                      ? plan.interval.toLowerCase()
                      : `${plan.interval_count} ${plan.interval.toLowerCase()}s`;
                    const isPopular = index === 0 || plan.interval === 'YEAR';

                    return (
                      <Card key={plan.token} className={`shadow-2xl relative overflow-hidden ${isPopular ? 'gradient-primary' : 'border-2 border-border'}`}>
                        {isPopular && (
                          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold text-white">
                            POPULAR
                          </div>
                        )}
                        <CardContent className={`p-8 ${isPopular ? 'text-white' : ''}`}>
                          <div className="mb-6">
                            <h3 className="text-2xl font-bold mb-2">{plan.name || plan.product}</h3>
                            <div className="flex items-baseline space-x-2 mb-4">
                              <span className="text-4xl font-bold">
                                {plan.currency === 'PKR' ? 'PKR ' : '$'}{price.toFixed(2)}
                              </span>
                              <span className={isPopular ? 'opacity-80' : 'text-muted-foreground'}>/{intervalText}</span>
                            </div>
                            {plan.trial_period_days > 0 && (
                              <div className={`text-sm font-medium ${isPopular ? 'text-white/90' : 'text-green-600'}`}>
                                🎉 {plan.trial_period_days} days free trial
                              </div>
                            )}
                            {plan.description && (
                              <p className={`text-sm mt-2 ${isPopular ? 'opacity-90' : 'text-muted-foreground'}`}>
                                {plan.description}
                              </p>
                            )}
                          </div>
                          <ul className="space-y-4 mb-8">
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>Unlimited</strong> downloads</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>4K & 1080p</strong> quality</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>No ads</strong> experience</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>Batch downloads</strong></span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>Priority</strong> support</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <i className="fas fa-check mt-1"></i>
                              <span><strong>Download history</strong></span>
                            </li>
                          </ul>
                          <Button
                            onClick={() => window.location.href = '/subscribe'}
                            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all pulse-animation touch-manipulation active:scale-95 ${
                              isPopular 
                                ? 'bg-white text-primary hover:bg-opacity-90' 
                                : 'gradient-primary text-white'
                            }`}
                            data-testid="button-upgrade-premium"
                          >
                            <i className="fas fa-crown mr-2"></i>
                            Upgrade to Premium
                          </Button>
                          <p className={`text-center text-sm mt-4 ${isPopular ? 'opacity-80' : 'text-muted-foreground'}`}>
                            <i className="fas fa-lock mr-1"></i>
                            Secure payment via SafePay
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Download History */}
          <DownloadHistory />

          {/* Social Share */}
          <section className="py-16 bg-gradient-to-r from-primary to-purple-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Love VidGrabber? Share with Friends!</h2>
              <p className="text-lg mb-8 opacity-90">Help others discover easy video downloads</p>

              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={handleShareTwitter}
                  variant="ghost"
                  className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white social-share-btn touch-manipulation active:scale-95 transition-transform"
                  data-testid="button-share-twitter"
                >
                  <i className="fab fa-twitter text-xl mr-2"></i>
                  Share on Twitter
                </Button>
                <Button
                  onClick={handleShareFacebook}
                  variant="ghost"
                  className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white social-share-btn touch-manipulation active:scale-95 transition-transform"
                  data-testid="button-share-facebook"
                >
                  <i className="fab fa-facebook text-xl mr-2"></i>
                  Share on Facebook
                </Button>
                <Button
                  onClick={handleShareWhatsApp}
                  variant="ghost"
                  className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white social-share-btn touch-manipulation active:scale-95 transition-transform"
                  data-testid="button-share-whatsapp"
                >
                  <i className="fab fa-whatsapp text-xl mr-2"></i>
                  Share on WhatsApp
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="ghost"
                  className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white social-share-btn touch-manipulation active:scale-95 transition-transform"
                  data-testid="button-copy-link"
                >
                  <i className="fas fa-link text-xl mr-2"></i>
                  Copy Link
                </Button>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-lg text-muted-foreground">Download videos in 3 simple steps</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {howItWorksSteps.map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl font-bold text-white">{step.step}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 sm:py-24 bg-muted/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <Card key={index} className="border border-border overflow-hidden">
                    <CardContent className="p-0">
                      <details className="group">
                        <summary className="w-full px-6 py-4 text-left flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors font-semibold">
                          {item.question}
                          <i className="fas fa-chevron-down text-muted-foreground group-open:rotate-180 transition-transform"></i>
                        </summary>
                        <div className="px-6 pb-4 text-muted-foreground">
                          {item.answer}
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* (Footer moved outside main) */}
        </main>

        <Footer />

        {/* Premium Modal */}
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

        {/* PWA Install Prompt */}
        <PWAInstall />
      </div>
    </>
  );
}
