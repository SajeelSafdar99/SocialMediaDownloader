import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const distPublic = path.join(rootDir, "dist", "public");
const distSsr = path.join(rootDir, "dist", "ssr");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

type RouteSpec = {
  route: string;
  templateHtml: string; // relative to dist/public
  ssrEntry: string; // relative to dist/ssr
  outFile: string; // relative to dist/public
};

const routes: RouteSpec[] = [
  { route: '/', templateHtml: 'index.html', ssrEntry: 'entry-server.js', outFile: 'index.html' },
  { route: '/instagram-downloader', templateHtml: 'instagram-downloader.html', ssrEntry: 'entry-server.js', outFile: 'instagram-downloader/index.html' },
  { route: '/tiktok-downloader', templateHtml: 'tiktok-downloader.html', ssrEntry: 'entry-server.js', outFile: 'tiktok-downloader/index.html' },
  { route: '/youtube-downloader', templateHtml: 'youtube-downloader.html', ssrEntry: 'entry-server.js', outFile: 'youtube-downloader/index.html' },

  { route: '/about', templateHtml: 'about.html', ssrEntry: 'entry-server.js', outFile: 'about/index.html' },
  { route: '/contact', templateHtml: 'contact.html', ssrEntry: 'entry-server.js', outFile: 'contact/index.html' },
  { route: '/faq', templateHtml: 'faq.html', ssrEntry: 'entry-server.js', outFile: 'faq/index.html' },
  { route: '/privacy', templateHtml: 'privacy.html', ssrEntry: 'entry-server.js', outFile: 'privacy/index.html' },
  { route: '/terms', templateHtml: 'terms.html', ssrEntry: 'entry-server.js', outFile: 'terms/index.html' },
  { route: '/dmca', templateHtml: 'dmca.html', ssrEntry: 'entry-server.js', outFile: 'dmca/index.html' },

  // Blog routes
  { route: '/blog', templateHtml: 'blog.html', ssrEntry: 'entry-server.js', outFile: 'blog/index.html' },
];

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readBuiltHtml(rel: string): string {
  return fs.readFileSync(path.join(distPublic, rel), 'utf-8');
}

async function renderWithSsrModule(ssrRelEntry: string) {
  const modulePath = path.join(distSsr, ssrRelEntry);
  const mod = await import(modulePath);
  const render = mod?.render as undefined | ((url: string) => { appHtml: string; head: Record<string, string> });
  if (!render) throw new Error(`SSR module ${ssrRelEntry} must export render(url)`);
  return render;
}

function inject(template: string, head: Record<string, string>, appHtml: string) {
  const headTags = `${head.title || ''}${head.meta || ''}${head.link || ''}${head.script || ''}`;

  // Insert into </head> (case-insensitive) and fail if missing.
  const headCloseRe = /<\/head>/i;
  if (!headCloseRe.test(template)) {
    throw new Error('Template is missing </head>');
  }
  let html = template.replace(headCloseRe, `${headTags}</head>`);

  // Inject app HTML into root
  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
  return html;
}

async function main() {
  if (!fs.existsSync(distPublic)) throw new Error('dist/public not found. Run Vite build first.');

  // Build SSR bundle for each page
  // We rely on Vite SSR output so react-helmet-async works in Node.

  for (const spec of routes) {
    const template = readBuiltHtml(spec.templateHtml);
    const render = await renderWithSsrModule(spec.ssrEntry);

    const { appHtml, head } = render(spec.route);
    const finalHtml = inject(template, head, appHtml);

    const outPath = path.join(distPublic, spec.outFile);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, finalHtml, 'utf-8');
  }

  // Provide a basic 404.html for static hosts
  const notFound = path.join(distPublic, '404.html');
  if (!fs.existsSync(notFound)) {
    fs.copyFileSync(path.join(distPublic, 'index.html'), notFound);
  }

  console.log(`Prerendered ${routes.length} routes into ${distPublic}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
