/**
 * Analytics and tracking utilities
 * Note: Renamed from adTracking.ts to avoid ad blocker interference
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export type AdEvent = {
  type: 'impression' | 'click' | 'view';
  adSlot: string;
  adId?: string;
  revenue?: number;
  currency?: string;
};

/**
 * Track ad impression
 */
export function trackAdImpression(adSlot: string, adId?: string) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ad_impression', {
      ad_slot: adSlot,
      ad_id: adId,
      value: 0,
      currency: 'USD',
    });
  }

  // Send to backend for server-side tracking
  if (typeof fetch !== 'undefined') {
    fetch('/api/analytics/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'impression',
        adSlot,
        adId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail - analytics should not break the app
    });
  }
}

/**
 * Track ad click
 */
export function trackAdClick(adSlot: string, adId?: string) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ad_click', {
      ad_slot: adSlot,
      ad_id: adId,
      value: 0,
      currency: 'USD',
    });
  }

  // Track AdSense clicks (if AdSense ad) - additional tracking for AdSense
  if (adId && adId.startsWith('adsense-') && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'adsense_click', {
      ad_unit: adId,
      ad_slot: adSlot,
    });
  }

  // Send to backend for server-side tracking
  if (typeof fetch !== 'undefined') {
    fetch('/api/analytics/ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'click',
        adSlot,
        adId,
        revenue: 0, // AdSense revenue is tracked by Google
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail - analytics should not break the app
    });
  }
}

/**
 * Track ad view (when ad is fully loaded/visible)
 */
export function trackAdView(adSlot: string, adId?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ad_view', {
      ad_slot: adSlot,
      ad_id: adId,
    });
  }
}
