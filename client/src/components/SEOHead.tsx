import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: object | object[];
  faqData?: Array<{ question: string; answer: string }>;
  noindex?: boolean;
}

export default function SEOHead({
  title = "VidGrabber - Download Instagram, TikTok & YouTube Videos | Fast & Free",
  description = "Download videos and audio from Instagram, TikTok, and YouTube instantly. Multiple quality options, fast downloads, no watermarks. Free & Premium plans available.",
  keywords = "video downloader, instagram downloader, tiktok downloader, youtube downloader, social media downloader, download videos, no watermark",
  canonicalUrl,
  ogType = 'website',
  ogImage = '/og-image.png',
  twitterCard = 'summary_large_image',
  structuredData,
  faqData,
  noindex = false
}: SEOHeadProps) {
  
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.VITE_PUBLIC_BASE_URL
        ? String(process.env.VITE_PUBLIC_BASE_URL)
        : 'https://vidgrabber.online');

  const fullCanonicalUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Robots Meta */}
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="VidGrabber" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Additional Meta Tags */}
      <meta name="author" content="VidGrabber" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="theme-color" content="#8b5cf6" />
      <meta name="application-name" content="VidGrabber" />
      
      {/* Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="VidGrabber" />
      
      {/* Microsoft Meta Tags */}
      <meta name="msapplication-TileColor" content="#8b5cf6" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
      
      {/* DNS Prefetch for performance */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      
      {/* Structured Data */}
      {structuredData && (
        Array.isArray(structuredData) ? (
          structuredData.map((data, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(data)}
            </script>
          ))
        ) : (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )
      )}
      
      {/* FAQ Structured Data */}
      {faqData && faqData.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
      )}
      
      {/* Default Structured Data for Website */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "VidGrabber",
          "description": "Download videos from Instagram, TikTok, and YouTube",
          "url": baseUrl,
          "applicationCategory": "MultimediaApplication",
          "operatingSystem": "Any",
          "browserRequirements": "Requires JavaScript. Requires HTML5.",
          "softwareVersion": "1.0",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1250"
          },
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
            "No watermarks",
            "Multiple format support"
          ],
          "screenshot": `${baseUrl}/screenshot-wide.png`,
          "downloadUrl": baseUrl,
          "installUrl": baseUrl
        })}
      </script>
      
      {/* Organization Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "VidGrabber",
          "url": baseUrl,
          "logo": `${baseUrl}/icon-512x512.png`,
          "description": "The fastest way to download videos from social media platforms",
          "foundingDate": "2024",
          "applicationCategory": "Multimedia",
          "sameAs": [
            "https://twitter.com/savemedia",
            "https://facebook.com/savemedia"
          ]
        })}
      </script>
      
      {/* Breadcrumb Structured Data */}
      {canonicalUrl && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
              },
              ...(canonicalUrl !== '/' ? [{
                "@type": "ListItem",
                "position": 2,
                "name": title.split(' - ')[0],
                "item": fullCanonicalUrl
              }] : [])
            ]
          })}
        </script>
      )}
    </Helmet>
  );
}
