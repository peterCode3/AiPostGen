'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import SeoWidget from '@/components/SeoWidget';
import Loading from '@/components/Loading';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@/styles/article.css';

export default function ArticleViewPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'seo'>('preview');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/draft/${params.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load article');
      const json = await res.json();
      setData(json);
      toast.success('Article loaded');
    } catch {
      toast.error('Error loading article ⚠️');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminLayout>
        <div style={{ padding: '64px 32px' }}>
          <Loading />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Toaster position="top-right" />

      <div className="article-page">
        {/* Header */}
        <div className="article-header">
          <div className="article-header-content">
            <h1>👁️ Article Preview</h1>
            <p>Complete preview with SEO metadata</p>
          </div>
          <div className="article-header-actions">
            <a
              href={`/admin/article/${params.id}`}
              className="btn-modern btn-primary"
            >
              ✏️ Edit Article
            </a>
            <a
              href="/admin/drafts"
              className="btn-modern btn-light"
            >
              ← Back
            </a>
          </div>
        </div>

        {/* Status Bar */}
        <div className="article-card">
          <div className="status-grid">
            <div className="status-item">
              <p className="status-item-label">Status</p>
              <span
                className={`meta-badge ${
                  data.status === 'review'
                    ? 'status-review'
                    : data.status === 'scheduled'
                    ? 'status-scheduled'
                    : data.status === 'published'
                    ? 'status-published'
                    : 'status-draft'
                }`}
              >
                {data.status || 'draft'}
              </span>
            </div>

            <div className="status-item">
              <p className="status-item-label">Created</p>
              <p className="status-item-value">
                {new Date(data.createdAt).toLocaleDateString()}
              </p>
            </div>

            {data.scheduledAt && (
              <div className="status-item">
                <p className="status-item-label">Scheduled For</p>
                <p className="status-item-value" style={{ color: '#2563eb' }}>
                  {new Date(data.scheduledAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('preview')}
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          >
            👁️ Preview
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`tab-button ${activeTab === 'seo' ? 'active' : ''}`}
          >
            📊 SEO Data
          </button>
        </div>

        {/* Content */}
        {activeTab === 'preview' && (
          <div className="content-area">
            <article className="content-preview">
              {/* Featured Image */}
              {data.featuredImage && (
                <div style={{ marginBottom: '32px' }}>
                  <img 
                    src={data.featuredImage} 
                    alt={data.title || 'Featured'} 
                    style={{ 
                      width: '100%',
                      maxHeight: '500px',
                      objectFit: 'cover',
                      borderRadius: '16px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }} 
                  />
                </div>
              )}

              {/* Title */}
              <h1>{data.title || 'Untitled Article'}</h1>

              {/* Meta Info */}
              <div className="meta-info-bar">
                <span className="meta-item">
                  📅 {new Date(data.createdAt).toLocaleDateString()}
                </span>
                {data.language && (
                  <span className={`meta-badge lang-${data.language}`}>
                    {data.language === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}
                  </span>
                )}
                {data.content?.markdown && (
                  <span className="meta-item">
                    📝 {data.content.markdown.split(/\s+/).length} words
                  </span>
                )}
              </div>

              {/* Content */}
              {data.content?.markdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.content.markdown}
                </ReactMarkdown>
              ) : data.content?.html ? (
                <div dangerouslySetInnerHTML={{ __html: data.content.html }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
                  <p style={{ fontSize: '18px' }}>No content available</p>
                </div>
              )}
            </article>
          </div>
        )}

        {activeTab === 'seo' && (
          <div>
            {/* SEO Widget */}
            <div className="article-card">
              <h3 className="article-card-title">📊 SEO Metadata</h3>
              <SeoWidget metadata={data} />
            </div>

            {/* Prompt (if available) */}
            {data.prompt && (
              <div className="article-card">
                <h3 className="article-card-title">🤖 Generation Prompt</h3>
                <div className="prompt-box">
                  {data.prompt}
                </div>
              </div>
            )}

            {/* Sources (if available) */}
            {data.sourceRefs && data.sourceRefs.length > 0 && (
              <div className="article-card">
                <h3 className="article-card-title">📚 Source References</h3>
                <div style={{ marginTop: '16px' }}>
                  {data.sourceRefs.map((ref: any, i: number) => (
                    <a
                      key={i}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      <p className="source-link-title">
                        {ref.title || 'Source'}
                      </p>
                      <p className="source-link-url">{ref.url}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons at Bottom */}
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a
            href={`/admin/article/${params.id}`}
            className="btn-modern btn-primary"
            style={{ paddingLeft: '48px', paddingRight: '48px' }}
          >
            ✏️ Edit This Article
          </a>
          <a
            href="/admin/drafts"
            className="btn-modern btn-light"
            style={{ paddingLeft: '48px', paddingRight: '48px' }}
          >
            ← Back to Drafts
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}
