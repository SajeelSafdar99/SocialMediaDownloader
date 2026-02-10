import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * ScrollToTop component - Scrolls to top of page on route change
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return null;
}
