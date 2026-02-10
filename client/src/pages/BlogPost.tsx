import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Eye, ArrowLeft, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  viewCount: number;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  author?: {
    username: string;
  };
  category?: {
    name: string;
  };
}

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (params?.slug) {
      loadPost(params.slug);
    }
  }, [params?.slug]);

  const loadPost = async (slug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/blog/posts/${slug}`);
      const data = await response.json();

      if (data.ok) {
        setPost(data.post);
      }
    } catch (error) {
      console.error("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Blog post link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Blog post link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading... | VidGrabber Blog</title>
        </Helmet>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <Card className="animate-pulse">
                <div className="h-64 bg-muted" />
            <CardContent className="p-8">
              <div className="h-8 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-1/2 mb-8" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Helmet>
          <title>Post Not Found | VidGrabber Blog</title>
        </Helmet>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-12 text-center">
                <h2 className="text-2xl font-bold mb-2">Post Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The blog post you're looking for doesn't exist or has been removed.
                </p>
                <Link href="/blog">
                  <Button className="gradient-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Blog
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || `${post.title} | VidGrabber Blog`}</title>
        <meta name="description" content={post.metaDescription || post.excerpt || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ""} />
        {post.featuredImage && <meta property="og:image" content={post.featuredImage} />}
        <meta property="og:type" content="article" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <Link href="/blog">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>

            <Card className="border-border">
              {/* Featured Image */}
              {post.featuredImage && (
                <div className="h-96 overflow-hidden rounded-t-lg">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <CardHeader className="space-y-4">
                {/* Category and Meta */}
                <div className="flex flex-wrap items-center gap-3">
                  {post.category && (
                    <Badge variant="secondary" className="gradient-primary text-white border-0">
                      {post.category.name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {post.author?.username || "Admin"}
                    </div>
                    {post.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.viewCount} views
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold gradient-text">{post.title}</h1>

                {/* Share Button */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Share this article
                  </div>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="prose prose-lg dark:prose-invert max-w-none p-8">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </CardContent>
            </Card>

            {/* Back to Blog */}
            <div className="mt-12 text-center">
              <Link href="/blog">
                <Button className="gradient-primary">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Read More Articles
                </Button>
              </Link>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
}
