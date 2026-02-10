import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    server: {
      middlewareMode: true,
      // hmr: false is set in vite.config.ts - don't override it here
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Don't exit on file not found errors during development
        if (msg.includes('Does the file exist?') || msg.includes('Pre-transform error')) {
          console.error(`[Vite Error] ${msg}`);
        } else {
          viteLogger.error(msg, options);
        }
      },
    },
    appType: "custom",
  });

  // Use Vite's middleware - it handles HMR, module transformation, and static files
  app.use(vite.middlewares);

  // Only add our custom handler for HTML serving
  // This runs AFTER Vite middleware, so only catches requests Vite didn't handle
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Vite middleware already handled file requests (/src/, /@vite/, etc.)
    // We only need to serve index.html for SPA page routes

    try {
      // Check if this is an admin route
      const isAdminRoute = url.startsWith('/admin') || url === '/admin';

      const clientTemplate = isAdminRoute
        ? path.resolve(import.meta.dirname, "..", "client", "admin", "index.html")
        : path.resolve(import.meta.dirname, "..", "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Set correct MIME types for module scripts
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
