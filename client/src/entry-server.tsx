import React from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { Router } from "wouter";
import App from "@/App";

export function render(routePath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const helmetContext: any = {};

  // Wouter SSR: provide a static location hook so it doesn't touch window.
  let current = routePath;
  const staticLocationHook = () => {
    const navigate = (to: string) => {
      current = to;
    };
    return [current, navigate] as const;
  };

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <ThemeProvider>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Router hook={staticLocationHook}>
                <App />
              </Router>
            </AuthProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  );

  const helmet = helmetContext.helmet;

  return {
    appHtml,
    head: {
      title: helmet?.title?.toString?.() || "",
      meta: helmet?.meta?.toString?.() || "",
      link: helmet?.link?.toString?.() || "",
      script: helmet?.script?.toString?.() || "",
    },
  };
}
