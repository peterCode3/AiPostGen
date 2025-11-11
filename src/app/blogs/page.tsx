'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await fetch('/api/articles/draft');
      if (!res.ok) throw new Error('Failed to load blogs');
      const data = await res.json();
      // Filter only published articles
      const published = data.filter((article: any) => article.status === 'published');
      setBlogs(published);
    } catch (err) {
      console.error('Error loading blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const truncateContent = (markdown: string, maxLength: number = 150) => {
    if (!markdown) return '';
    const text = markdown.replace(/[#*\[\]()]/g, '').replace(/\n/g, ' ');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getSlug = (title: string, id: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return slug || id;
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
          <p style={{ color: '#64748b', fontSize: '16px' }}>Loading blogs...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .blogs-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 80px 20px 40px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        }

        .blogs-header {
          max-width: 1200px;
          margin: 0 auto 64px;
          text-align: center;
        }

        .blogs-title {
          font-size: 48px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 16px;
        }

        .blogs-subtitle {
          font-size: 20px;
          color: #64748b;
          margin: 0;
        }

        .blogs-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 32px;
        }

        .blog-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .blog-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
        }

        .blog-card-image {
          width: 100%;
          height: 240px;
          object-fit: cover;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .blog-card-content {
          padding: 24px;
        }

        .blog-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 13px;
          color: #64748b;
        }

        .blog-card-date {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .blog-card-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 12px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blog-card-excerpt {
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blog-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .blog-card-read-more {
          color: #667eea;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: gap 0.2s;
        }

        .blog-card:hover .blog-card-read-more {
          gap: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          max-width: 600px;
          margin: 0 auto;
        }

        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }

        .empty-state-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 12px;
        }

        .empty-state-text {
          font-size: 16px;
          color: #64748b;
          margin: 0;
        }

        @media (max-width: 768px) {
          .blogs-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .blogs-title {
            font-size: 36px;
          }
        }
      `}</style>

      <div className="blogs-container">
        <div className="blogs-header">
          <h1 className="blogs-title">📚 Our Blog</h1>
          <p className="blogs-subtitle">Discover insights, tips, and stories</p>
        </div>

        {blogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h2 className="empty-state-title">No blogs yet</h2>
            <p className="empty-state-text">Check back soon for new articles!</p>
          </div>
        ) : (
          <div className="blogs-grid">
            {blogs.map((blog) => (
              <Link
                key={blog._id}
                href={`/blogs/${getSlug(blog.title, blog._id)}`}
                className="blog-card"
              >
                {blog.featuredImage && (
                  <img
                    src={blog.featuredImage}
                    alt={blog.title}
                    className="blog-card-image"
                  />
                )}
                <div className="blog-card-content">
                  <div className="blog-card-meta">
                    <span className="blog-card-date">
                      📅 {new Date(blog.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {blog.language && (
                      <span>• {blog.language === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}</span>
                    )}
                  </div>
                  <h2 className="blog-card-title">{blog.title || 'Untitled'}</h2>
                  <p className="blog-card-excerpt">
                    {truncateContent(blog.content?.markdown || blog.metaDescription || '')}
                  </p>
                  <div className="blog-card-footer">
                    <span className="blog-card-read-more">
                      Read more →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

