import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { trackAdImpression, trackAdClick } from "@/lib/analytics";

type AdSlotProps = {
  variant?: "banner" | "square" | "toast";
  className?: string;
  label?: string;
  adId?: string;
  adsenseClientId?: string;
  adsenseSlotId?: string;
  adsenseFormat?: "auto" | "horizontal" | "vertical" | "rectangle";
};

export default function AdSlot({ 
  variant = "banner", 
  className, 
  label,
  adId,
  adsenseClientId,
  adsenseSlotId,
  adsenseFormat = "auto",
}: AdSlotProps) {
  const { user } = useAuth();
  const adSlotRef = useRef<HTMLDivElement>(null);
  const adInsRef = useRef<HTMLDivElement>(null);
  const [adsenseLoaded, setAdsenseLoaded] = useState(false);
  const adSlotName = `ad-${variant}-${adId || 'default'}`;
  const hasAdsense = adsenseClientId && adsenseSlotId;
  const globalAdsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;

  // Load AdSense ad
  useEffect(() => {
    if (user?.isPremium || !hasAdsense || adsenseLoaded) return;

    const clientId = adsenseClientId || globalAdsenseClientId;
    if (!clientId || !adsenseSlotId) return;

    // Wait for AdSense script to load
    const checkAdsense = setInterval(() => {
      if (typeof (window as any).adsbygoogle !== 'undefined' && adInsRef.current) {
        clearInterval(checkAdsense);
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          setAdsenseLoaded(true);
        } catch (e) {
          console.error('AdSense error:', e);
        }
      }
    }, 100);

    return () => clearInterval(checkAdsense);
  }, [user, hasAdsense, adsenseLoaded, adsenseClientId, adsenseSlotId, globalAdsenseClientId]);

  useEffect(() => {
    if (user?.isPremium) return;

    // Track impression when ad slot is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const finalAdId = hasAdsense && adsenseSlotId 
              ? `adsense-${adsenseSlotId}` 
              : adId;
            trackAdImpression(adSlotName, finalAdId);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (adSlotRef.current) {
      observer.observe(adSlotRef.current);
    }

    return () => observer.disconnect();
  }, [user, adSlotName, adId, adsenseSlotId, hasAdsense]);

  // Track AdSense clicks
  useEffect(() => {
    if (!hasAdsense || user?.isPremium) return;

    const handleAdsenseClick = () => {
      // AdSense revenue is tracked by Google, but we can track clicks
      const finalAdId = `adsense-${adsenseSlotId}`;
      trackAdClick(adSlotName, finalAdId);
    };

    const adElement = adInsRef.current;
    if (adElement) {
      adElement.addEventListener('click', handleAdsenseClick);
      return () => adElement.removeEventListener('click', handleAdsenseClick);
    }
  }, [hasAdsense, user, adSlotName, adsenseSlotId]);

  if (user?.isPremium) return null;

  const base =
    variant === "toast"
      ? "rounded-lg border bg-muted/40 p-3"
      : "ad-zone rounded-xl";

  const inner =
    variant === "square"
      ? "min-h-[200px]"
      : variant === "toast"
        ? "min-h-[56px]"
        : "min-h-[120px]";

  // Google AdSense ad (required)
  if (!hasAdsense) {
    // If AdSense is not configured, show placeholder
    return (
      <div 
        ref={adSlotRef}
        className={cn(base, inner, "flex items-center justify-center", className)} 
        data-testid="ad-slot"
      >
        <div className="text-center">
          <i className="fas fa-ad text-2xl mb-1" />
          <p className="text-xs text-muted-foreground">{label || "Advertisement"}</p>
          <p className="text-xs text-muted-foreground mt-1">Configure AdSense to display ads</p>
        </div>
      </div>
    );
  }

  const clientId = adsenseClientId || globalAdsenseClientId;
  
  return (
    <div 
      ref={adSlotRef}
      className={cn(base, inner, className)} 
      data-testid="ad-slot"
    >
      <ins
        ref={adInsRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={adsenseSlotId}
        data-ad-format={adsenseFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
