import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import AdBlockerWarning from "@/components/AdBlockerWarning";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import ToastDownloadProgress from "@/components/ToastDownloadProgress";

// Lazy load pages for better performance - reduces initial bundle size
const Landing = lazy(() => import("@/pages/Landing"));
const InstagramDownloader = lazy(() => import("@/pages/InstagramDownloader"));
const TikTokDownloader = lazy(() => import("@/pages/TikTokDownloader"));
const YouTubeDownloader = lazy(() => import("@/pages/YouTubeDownloader"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/AuthPage.tsx"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const DMCA = lazy(() => import("@/pages/DMCA"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const RequestRefund = lazy(() => import("@/pages/RequestRefund"));
const FlexCheckout = lazy(() => import("@/pages/FlexCheckout"));
const ThreeDSChallenge = lazy(() => import("@/pages/ThreeDSChallenge"));
const Profile = lazy(() => import("@/pages/Profile"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function RouterComponent() {
  const [location] = useLocation();
  
  try {
    const { user, isLoading, error } = useAuth();

    // If auth is loading or errored, still render routes (just without user context)
    // This prevents white screen when backend is unavailable
    const safeUser = isLoading || error ? null : user;

    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Switch>
        {/* Public routes */}
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Info pages */}
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/dmca" component={DMCA} />

        {/* Blog */}
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />

        {/* Refund Request */}
        <Route path="/request-refund" component={RequestRefund} />

        {/* Downloaders */}
        <Route path="/instagram-downloader" component={InstagramDownloader} />
        <Route path="/tiktok-downloader" component={TikTokDownloader} />
        <Route path="/youtube-downloader" component={YouTubeDownloader} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/checkout/flex" component={FlexCheckout} />
        <Route path="/checkout/3ds" component={ThreeDSChallenge} />
        {/* WhatsApp setup page removed - QR code is admin-only and shown in terminal */}

        {/* Profile (auth) - only show if user is loaded and exists */}
        {safeUser && <Route path="/profile" component={Profile} />}

        <Route component={NotFound} />
      </Switch>
        </Suspense>
      </>
    );
  } catch (error) {
    console.error('Router error:', error);
    // Even on error, try to render routes
    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/dmca" component={DMCA} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/request-refund" component={RequestRefund} />
        <Route path="/instagram-downloader" component={InstagramDownloader} />
        <Route path="/tiktok-downloader" component={TikTokDownloader} />
        <Route path="/youtube-downloader" component={YouTubeDownloader} />
        <Route component={NotFound} />
      </Switch>
        </Suspense>
      </>
    );
  }
}

function App() {
  try {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <ToastDownloadProgress />
              <ErrorBoundary>
                <AdBlockerWarning 
                  showOnPages={['/', '/instagram-downloader', '/tiktok-downloader', '/youtube-downloader', '/dashboard', '/about', '/contact', '/faq', '/privacy', '/terms', '/dmca', '/subscribe']}
                />
              </ErrorBoundary>
              <ErrorBoundary>
                <RouterComponent />
              </ErrorBoundary>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App error:', error);
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>App Error</h1>
        <pre>{error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    );
  }
}

export default App;
