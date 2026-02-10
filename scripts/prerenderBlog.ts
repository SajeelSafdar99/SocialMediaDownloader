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

/**
 * Prerender Blog Posts
 * This script fetches all published blog posts and generates static HTML for each
 */

async function fetchPublishedPosts() {
  try {
    // In production, this would fetch from your API
    // For build time, we'll use a direct database query
    const { db } = await import("../server/db.js");
    const { blogPosts } = await import("../shared/schema.js");
    const { eq } = await import("drizzle-orm");

    const posts = await db
      .select({
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        metaTitle: blogPosts.metaTitle,
        metaDescription: blogPosts.metaDescription,
        featuredImage: blogPosts.featuredImage,
      })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));

    return posts;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

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

async function prerenderBlogPost(post: any, templateHtml: string, render: any) {
  const route = `/blog/${post.slug}`;
  const outFile = `blog/${post.slug}/index.html`;

  console.log(`  Rendering: ${route}`);

  try {
    const { appHtml, head } = render(route);
    let html = templateHtml;

    // Replace app placeholder
    html = html.replace('<!--app-html-->', appHtml);

    // Update meta tags with blog post data
    const title = post.metaTitle || `${post.title} | SaveMedia Blog`;
    const description = post.metaDescription || post.excerpt || post.title;
    const imageUrl = post.featuredImage || 'https://savemedia.app/og-image.jpg';

    // Replace title
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${title}</title>`
    );

    // Replace or add description
    if (html.includes('name="description"')) {
      html = html.replace(
        /(<meta name="description" content=").*?(")/,
        `$1${description}$2`
      );
    }

    // Replace or add Open Graph tags
    html = html.replace(
      /(<meta property="og:title" content=").*?(")/,
      `$1${post.title}$2`
    );
    html = html.replace(
      /(<meta property="og:description" content=").*?(")/,
      `$1${description}$2`
    );
    html = html.replace(
      /(<meta property="og:image" content=").*?(")/,
      `$1${imageUrl}$2`
    );
    html = html.replace(
      /(<meta property="og:url" content=").*?(")/,
      `$1https://savemedia.app${route}$2`
    );
    html = html.replace(
      /(<meta property="og:type" content=").*?(")/,
      `$1article$2`
    );

    // Replace Twitter tags
    html = html.replace(
      /(<meta property="twitter:title" content=").*?(")/,
      `$1${post.title}$2`
    );
    html = html.replace(
      /(<meta property="twitter:description" content=").*?(")/,
      `$1${description}$2`
    );
    html = html.replace(
      /(<meta property="twitter:image" content=").*?(")/,
      `$1${imageUrl}$2`
    );
    html = html.replace(
      /(<meta property="twitter:url" content=").*?(")/,
      `$1https://savemedia.app${route}$2`
    );

    // Replace canonical URL
    html = html.replace(
      /(<link rel="canonical" href=").*?(")/,
      `$1https://savemedia.app${route}$2`
    );

    // Replace any head injections from SSR
    if (head.title) {
      html = html.replace(/<title>.*?<\/title>/, `<title>${head.title}</title>`);
    }

    const outPath = path.join(distPublic, outFile);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html, 'utf-8');

    console.log(`    ✓ Written: ${outFile}`);
  } catch (error) {
    console.error(`    ✗ Error rendering ${route}:`, error);
  }
}

async function main() {
  console.log("🚀 Prerendering Blog Posts...\n");

  // Check if build exists
  if (!fs.existsSync(distPublic) || !fs.existsSync(distSsr)) {
    console.error("❌ Error: dist/public or dist/ssr not found. Run 'npm run build' first.");
    process.exit(1);
  }

  // Fetch all published blog posts
  console.log("📄 Fetching published blog posts...");
  const posts = await fetchPublishedPosts();

  if (posts.length === 0) {
    console.log("⚠️  No published blog posts found. Skipping blog post prerendering.\n");
    return;
  }

  console.log(`✓ Found ${posts.length} published blog post(s)\n`);

  // Load template HTML (use blog.html as base)
  const templateHtml = readBuiltHtml('blog.html');

  // Load SSR renderer
  const render = await renderWithSsrModule('entry-server.js');

  // Prerender each blog post
  console.log("🎨 Rendering blog posts:\n");
  for (const post of posts) {
    await prerenderBlogPost(post, templateHtml, render);
  }

  console.log(`\n✅ Successfully prerendered ${posts.length} blog post(s)!\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
