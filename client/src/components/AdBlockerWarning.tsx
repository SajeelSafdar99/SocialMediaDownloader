import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { checkAdBlocker } from '@/lib/adBlockerDetection';

interface AdBlockerWarningProps {
  showOnPages?: string[]; // Pages where warning should show
  excludePages?: string[]; // Pages to exclude (like auth pages)
}

export default function AdBlockerWarning({ showOnPages, excludePages = ['/auth', '/forgot-password', '/reset-password'] }: AdBlockerWarningProps) {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [location] = useLocation(); // Use wouter's useLocation hook

  useEffect(() => {
    // Reset state when location changes
    setIsBlocked(null);
    setIsChecking(false);

    // Check if current page should be excluded
    const isExcluded = excludePages.some(page => location.startsWith(page));
    if (isExcluded) {
      setIsBlocked(false);
      return;
    }

    // Check if we should show on this page
    if (showOnPages && showOnPages.length > 0) {
      const shouldShow = showOnPages.some(page => 
        page === '/' ? location === '/' : location.includes(page)
      );
      if (!shouldShow) {
        setIsBlocked(false);
        return;
      }
    }

    // Wait a bit for page to load before checking
    const timer = setTimeout(() => {
      performCheck();
    }, 1500); // Wait 1.5 seconds after page load to allow scripts to load

    return () => clearTimeout(timer);
  }, [location, showOnPages, excludePages]);

  const performCheck = async () => {
    setIsChecking(true);
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<{ isBlocked: boolean; method: string }>((_, reject) => {
        setTimeout(() => reject(new Error('Ad blocker check timeout')), 5000);
      });
      
      const result = await Promise.race([
        checkAdBlocker(),
        timeoutPromise
      ]);
      
      setIsBlocked(result.isBlocked);
    } catch (error) {
      console.error('Ad blocker check error:', error);
      // On error or timeout, assume no blocker (don't block user)
      setIsBlocked(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    setIsBlocked(null); // Reset state
    await performCheck();
  };

  // Don't show if not blocked
  if (isBlocked === false) {
    return null;
  }

  // Show loading state while checking - don't block the page
  if (isBlocked === null || isChecking) {
    return null; // Don't show anything while checking to avoid flicker
  }

  // Block the entire site with overlay
  return (
    <>
      {/* Blurred background overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-[9998]"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Blocking modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-2xl max-w-lg w-full">
          <CardContent className="p-6">
            <div className="flex items-start justify-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-exclamation-triangle text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-yellow-900 dark:text-yellow-100">
                    Ad Blocker Detected
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-yellow-900 dark:text-yellow-100 text-center">
              <p className="text-base leading-relaxed">
                We've detected that you're using an ad blocker. To continue using VidGrabber and support our free service, 
                please disable your ad blocker for this site.
              </p>

              <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-lg p-4 space-y-2 text-left">
                <p className="text-sm font-semibold mb-2">How to disable ad blocker:</p>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Look for the ad blocker icon in your browser toolbar (usually in the top-right corner)</li>
                  <li>Click on the ad blocker icon</li>
                  <li>Select "Disable on this site" or "Allow ads on this site"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  size="lg"
                  onClick={handleRecheck}
                  disabled={isChecking}
                  variant="outline"
                  className="w-full border-yellow-600 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-base py-6"
                >
                  {isChecking ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Checking...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-redo mr-2"></i>
                      Re-check Ad Blocker
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    localStorage.removeItem('adBlockerWarningDismissed');
                    window.location.reload();
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-base py-6"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  I've Disabled My Ad Blocker - Reload Page
                </Button>
              </div>

              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-4">
                This site requires ads to remain free. Thank you for your understanding!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
