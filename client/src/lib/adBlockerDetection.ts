/**
 * Ad Blocker Detection Utility
 * Detects if an ad blocker is active and prompts users to disable it
 */

/**
 * Check if ad blocker is likely active
 */
export function detectAdBlocker(): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a fake ad element that ad blockers will target
    const fakeAd = document.createElement('div');
    fakeAd.innerHTML = '&nbsp;';
    fakeAd.className = 'adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
    fakeAd.setAttribute('id', 'advertisement');
    fakeAd.setAttribute('name', 'advertisement');
    // Position it off-screen but make it visible
    fakeAd.style.position = 'absolute';
    fakeAd.style.left = '-9999px';
    fakeAd.style.top = '-9999px';
    fakeAd.style.width = '1px';
    fakeAd.style.height = '1px';
    fakeAd.style.visibility = 'visible';
    fakeAd.style.display = 'block';
    fakeAd.style.opacity = '1';
    
    // Store original state
    const originalDisplay = fakeAd.style.display;
    const originalVisibility = fakeAd.style.visibility;
    
    document.body.appendChild(fakeAd);
    
    // Check after a short delay
    setTimeout(() => {
      const isRemoved = !document.body.contains(fakeAd);
      const computedStyle = window.getComputedStyle(fakeAd);
      
      // Check if ad blocker changed the styles we set
      const displayChanged = computedStyle.display === 'none' && originalDisplay === 'block';
      const visibilityChanged = computedStyle.visibility === 'hidden' && originalVisibility === 'visible';
      const opacityChanged = computedStyle.opacity === '0';
      
      // Check if element has zero dimensions (but we set it to 1px)
      const hasZeroSize = fakeAd.offsetHeight === 0 && fakeAd.offsetWidth === 0;
      
      // Ad blocker is active if element was removed OR styles were changed by blocker
      const isBlocked = isRemoved || displayChanged || visibilityChanged || (opacityChanged && hasZeroSize);
      
      // Clean up
      if (document.body.contains(fakeAd)) {
        document.body.removeChild(fakeAd);
      }
      
      resolve(isBlocked);
    }, 250);
  });
}

/**
 * Check if Google AdSense script is loaded
 */
export function checkAdSenseLoaded(): boolean {
  return typeof (window as any).adsbygoogle !== 'undefined';
}

/**
 * Monitor for ad blocker and return detection result
 */
export async function checkAdBlocker(): Promise<{
  isBlocked: boolean;
  method: 'dom' | 'fetch' | 'adsense';
}> {
  // Check AdSense only if configured
  const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;
  const adsenseScriptExists = document.querySelector('script[src*="adsbygoogle"]') !== null;
  
  // Only use AdSense check if script tag exists (meaning we're trying to load it)
  if (adsenseClientId && adsenseScriptExists) {
    // Give AdSense time to load (up to 2 seconds)
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (checkAdSenseLoaded()) {
        // AdSense loaded successfully, no ad blocker
        break;
      }
      if (i === 3 && !checkAdSenseLoaded()) {
        // AdSense script exists but didn't load after 2 seconds - likely blocked
        return { isBlocked: true, method: 'adsense' };
      }
    }
  }

  // DOM-based detection (primary method)
  const isBlocked = await detectAdBlocker();
  return { isBlocked, method: isBlocked ? 'dom' : 'fetch' };
}
