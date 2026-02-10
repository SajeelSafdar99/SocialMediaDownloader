import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, User, Eye, ArrowRight, Search } from "lucide-react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  viewCount: number;
  publishedAt?: string;
  author?: {
    username: string;
  };
  category?: {
    name: string;
  };
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPosts();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [search]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: "published",
        limit: "12",
        ...(search && { search }),
      });

      const response = await fetch(`/api/public/blog/posts?${params}`);
      const data = await response.json();

      if (data.ok) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog - VidGrabber | Tips, Tutorials & Insights</title>
        <meta name="description" content="Explore our blog for tips, tutorials, and insights about social media downloading. Learn how to download videos from Instagram, TikTok, YouTube and more." />
        <meta property="og:title" content="VidGrabber Blog - Tips & Tutorials" />
        <meta property="og:description" content="Tips, tutorials, and insights about social media downloading" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-16 hero-gradient">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
                  Blog
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Tips, tutorials, and insights about social media downloading
                </p>
              </div>
            </div>
          </section>

          {/* Search Section */}
          <section className="py-8 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search blog posts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={loadPosts} className="gradient-primary">
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Blog Posts Grid */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardContent className="p-6">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No posts found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or check back later for new content
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group border-border hover:border-primary/50">
                        {post.featuredImage && (
                          <div className="h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={post.featuredImage}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/400x200?text=Blog+Post";
                              }}
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            {post.category && (
                              <Badge variant="secondary" className="gradient-primary text-white border-0">
                                {post.category.name}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {post.viewCount}
                            </div>
                          </div>
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {post.excerpt}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {post.author?.username || "Admin"}
                            </div>
                            {post.publishedAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            Read More
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
