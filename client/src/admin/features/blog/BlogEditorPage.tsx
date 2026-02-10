import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blogApi, BlogCategory } from '../../shared/api/blogApi';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { RichTextEditor } from './RichTextEditor';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BlogEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    canonicalUrl: '',
    categoryId: undefined as number | undefined,
    tags: [] as string[],
  });

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadPost();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await blogApi.getCategories();
      if (response.ok) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const loadPost = async () => {
    try {
      const response = await blogApi.getPost(parseInt(id!));
      if (response.ok) {
        const post = response.post;
        setFormData({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          content: post.content,
          featuredImage: post.featuredImage || '',
          status: post.status,
          metaTitle: post.metaTitle || '',
          metaDescription: post.metaDescription || '',
          metaKeywords: post.metaKeywords || '',
          canonicalUrl: post.canonicalUrl || '',
          categoryId: post.categoryId,
          tags: post.tags || [],
        });
      }
    } catch (error) {
      toast.error('Failed to load post');
      navigate('/blog');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: !isEdit && !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSave = async (shouldPublish = false) => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...formData,
        status: shouldPublish ? 'published' as const : formData.status,
      };

      const response = isEdit
        ? await blogApi.updatePost(parseInt(id!), data)
        : await blogApi.createPost(data);

      if (response.ok) {
        toast.success(isEdit ? 'Post updated successfully' : 'Post created successfully');
        navigate('/blog');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/blog')}
          >
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Post' : 'New Post'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => handleSave(false)}
            isLoading={loading}
          >
            Save Draft
          </Button>
          <Button
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={() => handleSave(true)}
            isLoading={loading}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter post title..."
                required
              />

              <Input
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="post-url-slug"
                helperText="URL-friendly version of the title"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary of the post..."
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Write your blog post content here..."
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Meta Title"
                value={formData.metaTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                placeholder="SEO title (leave empty to use post title)"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="SEO description..."
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <Input
                label="Meta Keywords"
                value={formData.metaKeywords}
                onChange={(e) => setFormData(prev => ({ ...prev, metaKeywords: e.target.value }))}
                placeholder="keyword1, keyword2, keyword3"
                helperText="Comma-separated keywords"
              />

              <Input
                label="Canonical URL"
                value={formData.canonicalUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                placeholder="https://example.com/original-post"
                helperText="Set if this is a republished post"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Category */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.featuredImage}
                onChange={(e) => setFormData(prev => ({ ...prev, featuredImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                helperText="Enter image URL"
              />
              {formData.featuredImage && (
                <div className="mt-3">
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-32 object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Invalid+Image';
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
