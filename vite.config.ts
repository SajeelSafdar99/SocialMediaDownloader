import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to replace environment variables in HTML
function htmlEnvPlugin(): Plugin {
  return {
    name: 'html-env-plugin',
    transformIndexHtml(html, ctx) {
      // Replace environment variable placeholders in HTML
      return html
        .replace(/__VITE_GA_MEASUREMENT_ID__/g, ctx.server?.config.env?.VITE_GA_MEASUREMENT_ID || '')
        .replace(/__VITE_ADSENSE_CLIENT_ID__/g, ctx.server?.config.env?.VITE_ADSENSE_CLIENT_ID || '');
    },
  };
}

// Plugin to handle client-side routing in dev server
function handleClientSideRouting() {
  return {
    name: "handle-client-side-routing",
    configureServer(server: any) {
      // Add middleware that runs early to catch all requests
        server.middlewares.use((req: any, res: any, next: any) => {
          const fullUrl = req.url || "";
          // Parse URL to get pathname (without query params)
          const urlPath = fullUrl.split('?')[0].split('#')[0];
          
          // Skip API routes (they're proxied)
          if (urlPath.startsWith("/api")) {
            return next();
          }
          
          // Skip Vite internal requests (HMR, client, node_modules, etc.)
          const isViteInternal = 
            urlPath.startsWith("/@") || 
            urlPath.startsWith("/node_modules") ||
            urlPath.startsWith("/@fs/") ||
            urlPath.includes("/.vite/") ||
            urlPath.includes("/@react-refresh") ||
            urlPath.includes("/@id/") ||
            urlPath.startsWith("/src/"); // Source files
          
          if (isViteInternal) {
            return next();
          }
          
          // Handle admin routes
          if (urlPath.startsWith("/admin")) {
            req.url = "/admin/index.html";
            return next();
          }

          // Skip if already requesting index.html or root
          if (urlPath === "/index.html" || urlPath === "/") {
            return next();
          }
          
          // Skip file requests (has extension and not ending with /)
          const hasExtension = /\.\w+$/i.test(urlPath);
          if (hasExtension && !urlPath.endsWith("/")) {
            return next();
          }
          
          // Skip if it's a static asset request (check common asset extensions)
          const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map', '.webp', '.avif'];
          const isStaticAsset = staticExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
          if (isStaticAsset) {
            return next();
          }
          
          // For all other routes (like /about, /contact, etc.), serve index.html
          // Vite will handle the transformation
          req.url = "/index.html";
          next();
        });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env from repo root (this file's directory)
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react(), htmlEnvPlugin(), handleClientSideRouting()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
    root: path.resolve(__dirname, "client"),
    // Expose env to the client build
    envDir: __dirname,
    define: {
      "process.env": env,
    },
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "client/index.html"),
          admin: path.resolve(__dirname, "client/admin/index.html"),
          instagram: path.resolve(__dirname, "client/instagram-downloader.html"),
          tiktok: path.resolve(__dirname, "client/tiktok-downloader.html"),
          youtube: path.resolve(__dirname, "client/youtube-downloader.html"),
          about: path.resolve(__dirname, "client/about.html"),
          contact: path.resolve(__dirname, "client/contact.html"),
          faq: path.resolve(__dirname, "client/faq.html"),
          privacy: path.resolve(__dirname, "client/privacy.html"),
          terms: path.resolve(__dirname, "client/terms.html"),
          dmca: path.resolve(__dirname, "client/dmca.html"),
          subscribe: path.resolve(__dirname, "client/subscribe.html"),
          blog: path.resolve(__dirname, "client/blog.html"),
        },
      },
    },
    ssr: {
      noExternal: ["react-helmet-async"],
    },
    optimizeDeps: {
      // Force re-optimization to fix missing dependency files
      force: true,
      // Include commonly used dependencies to reduce chunk requests
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'wouter',
        '@tanstack/react-query',
        'react-helmet-async',
      ],
      // Exclude problematic dependencies from optimization
      exclude: [],
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: [
        "vidgrabber.online",
        "www.vidgrabber.online",
        "admin.vidgrabber.online",
        "localhost",
        ".local",
        ".ngrok.io",
        ".trycloudflare.com",
      ],
      // Disable HMR - Cloudflare Tunnel doesn't support WebSocket properly
      // Manual page refresh needed for development through tunnel
      hmr: false,
      proxy: {
        "/api": {
          target: "http://localhost:5006",
          changeOrigin: true,
          secure: false,
        },
      },
      // Enable strict mode to prevent @fs paths and improve security
      fs: {
        strict: true,
        allow: [
          // Only allow access to project directory
          path.resolve(__dirname),
        ],
      },
      // Optimize dependency pre-bundling to reduce requests
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
  };
});