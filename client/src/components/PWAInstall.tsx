import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
    } catch (error) {
      console.error('PWA: Error during installation', error);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleClosePrompt = () => {
    setShowPrompt(false);
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 pwa-prompt rounded-2xl shadow-2xl"
      data-testid="pwa-install-prompt"
    >
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClosePrompt}
            className="absolute top-4 right-4 p-2"
            data-testid="button-close-pwa"
          >
            <i className="fas fa-times text-muted-foreground"></i>
          </Button>
          
          <div className="flex items-start space-x-4 pr-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <i className="fas fa-mobile-alt text-white text-xl"></i>
            </div>
            <div className="flex-1">
              <h4 className="font-bold mb-1" data-testid="text-pwa-title">
                Install VidGrabber
              </h4>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-pwa-description">
                Add to your home screen for quick access and offline downloads
              </p>
              <Button 
                onClick={handleInstallClick}
                className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm"
                data-testid="button-install-pwa"
              >
                Install Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
