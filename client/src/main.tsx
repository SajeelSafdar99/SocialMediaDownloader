import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";

// Suppress extension-related errors in console
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    // Ignore extension-related errors
    if (
      message.includes('NetworkMonitor') ||
      message.includes('extension port') ||
      message.includes('inject_main') ||
      message.includes('back/forward cache')
    ) {
      return; // Silently ignore
    }
    originalError.apply(console, args);
  };

  // Handle unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.toString() || '';
    if (
      reason.includes('NetworkMonitor') ||
      reason.includes('extension') ||
      reason.includes('inject_main') ||
      reason.includes('port is moved')
    ) {
      event.preventDefault(); // Prevent error from showing
    }
  });

}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </QueryClientProvider>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>App Failed to Load</h1>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}
