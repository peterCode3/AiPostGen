'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, [params.slug]);

  const fetchBlog = async () => {
    try {
      // First, get all articles
      const res = await fetch('/api/articles/draft');
      if (!res.ok) throw new Error('Failed to load blog');
      const data = await res.json();
      
      // Find article by slug or ID
      const found = data.find((article: any) => {
        const slug = article.title
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return slug === params.slug || article._id === params.slug;
      });

      if (!found || found.status !== 'published') {
        router.push('/blogs');
        return;
      }

      setBlog(found);
    } catch (err) {
      console.error('Error loading blog:', err);
      router.push('/blogs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: '16px' }}>Loading article...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!blog) return null;

  return (
    <>
      <style jsx>{`
        .blog-post-container {
          min-height: 100vh;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        }

        .blog-post-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          color: white;
        }

        .blog-post-header-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .back-link:hover {
          opacity: 1;
        }

        .blog-post-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 64px 20px;
        }

        .blog-post-featured-image {
          width: 100%;
          max-height: 500px;
          object-fit: cover;
          border-radius: 16px;
          margin-bottom: 48px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .blog-post-title {
          font-size: 48px;
          font-weight: 800;
          color: #1a202c;
          margin: 0 0 24px;
          line-height: 1.2;
        }

        .blog-post-meta {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #64748b;
        }

        .blog-post-body {
          font-size: 18px;
          line-height: 1.8;
          color: #334155;
        }

        .blog-post-body :global(h1),
        .blog-post-body :global(h2),
        .blog-post-body :global(h3) {
          color: #1a202c;
          margin-top: 48px;
          margin-bottom: 16px;
          font-weight: 700;
        }

        .blog-post-body :global(h1) {
          font-size: 36px;
        }

        .blog-post-body :global(h2) {
          font-size: 30px;
        }

        .blog-post-body :global(h3) {
          font-size: 24px;
        }

        .blog-post-body :global(p) {
          margin-bottom: 24px;
        }

        .blog-post-body :global(img) {
          width: 100%;
          border-radius: 12px;
          margin: 32px 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .blog-post-body :global(ul),
        .blog-post-body :global(ol) {
          margin: 24px 0;
          padding-left: 32px;
        }

        .blog-post-body :global(li) {
          margin-bottom: 12px;
        }

        .blog-post-body :global(blockquote) {
          border-left: 4px solid #667eea;
          padding-left: 24px;
          margin: 32px 0;
          font-style: italic;
          color: #475569;
        }

        .blog-post-body :global(code) {
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
        }

        .blog-post-body :global(pre) {
          background: #1e293b;
          color: #e2e8f0;
          padding: 24px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 32px 0;
        }

        .blog-post-body :global(pre code) {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        @media (max-width: 768px) {
          .blog-post-title {
            font-size: 32px;
          }

          .blog-post-body {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="blog-post-container">
        <div className="blog-post-header">
          <div className="blog-post-header-content">
            <Link href="/blogs" className="back-link">
              ← Back to Blogs
            </Link>
          </div>
        </div>

        <article className="blog-post-content">
          {blog.featuredImage && (
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="blog-post-featured-image"
            />
          )}

          <h1 className="blog-post-title">{blog.title || 'Untitled'}</h1>

          <div className="blog-post-meta">
            <span>📅 {new Date(blog.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
            {blog.language && (
              <span>• {blog.language === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}</span>
            )}
            {blog.content?.markdown && (
              <span>• 📝 {blog.content.markdown.split(/\s+/).length} words</span>
            )}
          </div>

          <div className="blog-post-body">
            {blog.content?.markdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {blog.content.markdown}
              </ReactMarkdown>
            ) : blog.content?.html ? (
              <div dangerouslySetInnerHTML={{ __html: blog.content.html }} />
            ) : (
              <p>No content available.</p>
            )}
          </div>
        </article>
      </div>
    </>
  );
}

