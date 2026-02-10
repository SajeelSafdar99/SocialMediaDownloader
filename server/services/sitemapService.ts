type SitemapRoute = {
  path: string;
  priority: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
};

function normalizeBaseUrl(raw?: string): string {
  const v = (raw || "").trim();
  if (!v) return "https://savemedia.app";
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

export async function generateSitemap(): Promise<string> {
  // Prefer custom domain env, fallback to previous behavior/default.
  // Example: PUBLIC_BASE_URL=https://yourdomain.com
  const baseUrl = normalizeBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.SITE_URL || process.env.APP_URL
  );

  const routes: SitemapRoute[] = [
    // Main pages - highest priority
    { path: '/', priority: '1.0', changefreq: 'daily' },

    // Downloaders - high priority for SEO
    { path: '/instagram-downloader', priority: '0.9', changefreq: 'weekly' },
    { path: '/tiktok-downloader', priority: '0.9', changefreq: 'weekly' },
    { path: '/youtube-downloader', priority: '0.9', changefreq: 'weekly' },

    // Info pages - medium priority
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/faq', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },

    // Legal pages - lower priority but still indexed
    { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms', priority: '0.4', changefreq: 'yearly' },
    { path: '/dmca', priority: '0.4', changefreq: 'yearly' },
  ];

  const now = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const path = normalizePath(route.path);
    return `  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <lastmod>${now}</lastmod>
  </url>`;
  })
  .join('\n')}
</urlset>`;
}
