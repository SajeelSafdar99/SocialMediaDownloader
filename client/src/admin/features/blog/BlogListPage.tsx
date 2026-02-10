import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogApi, BlogPost } from '../../shared/api/blogApi';
import { Button } from '../../shared/components/Button';
import { Card, CardContent } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Input } from '../../shared/components/Input';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BlogListPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [statusFilter, search]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await blogApi.getPosts({
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 20,
      });

      if (response.ok) {
        setPosts(response.posts);
        setTotal(response.total);
      }
    } catch (error) {
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await blogApi.deletePost(id);
      if (response.ok) {
        toast.success('Post deleted successfully');
        loadPosts();
      }
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning'> = {
      published: 'success',
      draft: 'warning',
      archived: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-gray-500 mt-1">Manage your blog content</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/blog/new')}
        >
          New Post
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first blog post</p>
            <Button onClick={() => navigate('/blog/new')}>
              Create Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {post.title}
                      </h3>
                      {getStatusBadge(post.status)}
                    </div>
                    {post.excerpt && (
                      <p className="text-gray-600 text-sm mb-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>By {post.author?.username || 'Unknown'}</span>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.viewCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {post.viewCount} views
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Edit className="h-4 w-4" />}
                      onClick={() => navigate(`/blog/edit/${post.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDelete(post.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {total > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {posts.length} of {total} posts
        </div>
      )}
    </div>
  );
}
