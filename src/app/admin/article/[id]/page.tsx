'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Loading from '@/components/Loading';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import '@/styles/article.css';

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'seo'>('edit');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  const fetchArticle = async () => {
    try {
      const res = await fetch(`/api/articles/draft/${params.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load article');
      const json = await res.json();
      setData(json);
      setMarkdownContent(json.content?.markdown || '');
    } catch (err) {
      toast.error('Error loading article ⚠️');
    }
  };

  const saveArticle = async (regenerate = false) => {
    setLoading(true);
    toast.loading(regenerate ? '🤖 Regenerating...' : '💾 Saving...', { id: 'save' });

    try {
      const res = await fetch(`/api/articles/${params.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          prompt: data.prompt, 
          regenerate, 
          language: data.language,
          content: { markdown: markdownContent }
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();
      setMarkdownContent(updated.content.markdown);
      setData(updated);
      toast.success(regenerate ? '✅ Regenerated!' : '✅ Saved!', { id: 'save' });
    } catch (err) {
      toast.error('Failed to update', { id: 'save' });
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!confirm('Are you sure you want to reject this article?')) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/articles/draft/${params.id}/reject`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Reject failed');
      toast.success('❌ Article rejected');
      setTimeout(() => window.location.href = '/admin/drafts', 1500);
    } catch (err) {
      toast.error('Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!scheduleDate) {
      toast.error('Please select a schedule date first');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/articles/draft/${params.id}/schedule`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduledAt: scheduleDate }),
      });
      if (!res.ok) throw new Error('Schedule failed');
      toast.success(`✅ Scheduled for ${new Date(scheduleDate).toLocaleString()}`);
      setData({ ...data, scheduledAt: scheduleDate });
    } catch (err) {
      toast.error('Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!confirm('Publish this article now?')) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/articles/draft/${params.id}/publish`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Publish failed');
      toast.success('🚀 Article published!');
      setTimeout(() => window.location.href = '/admin/published', 1500);
    } catch (err) {
      toast.error('Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
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
            <h1>✏️ Edit Article</h1>
            <p>Make changes, regenerate with Google Gemini AI, or publish</p>
          </div>
          <div className="article-header-actions">
            <a href="/admin/drafts" className="btn-modern btn-light">
              ← Back to Drafts
            </a>
          </div>
        </div>

        {/* Title Input */}
        <div className="article-card">
          <div className="article-card-header">
            <h3 className="article-card-title">📝 Article Title</h3>
            <p className="article-card-subtitle">This will be the main heading</p>
          </div>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            className="form-input-modern form-input-large"
            placeholder="Enter article title..."
          />
        </div>

        {/* Prompt Input */}
        <div className="article-card">
          <div className="article-card-header">
            <h3 className="article-card-title">🤖 AI Instructions</h3>
            <p className="article-card-subtitle">Edit this to give Google Gemini new instructions when regenerating</p>
          </div>
          <textarea
            value={data.prompt || ''}
            onChange={(e) => setData({ ...data, prompt: e.target.value })}
            className="form-textarea-modern"
            rows={4}
            placeholder="Enter custom instructions for AI regeneration..."
          />
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab('edit')}
            className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          >
            👁️ Preview
          </button>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'edit' && (
            <div>
              <h3 className="article-card-title" style={{ marginBottom: '20px' }}>
                Markdown Content
              </h3>
              <textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="form-textarea-modern form-textarea-tall"
                placeholder="Edit your markdown content here..."
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="content-preview">
              <h1>{data.title || 'Untitled Article'}</h1>
              <div className="meta-info-bar">
                <span className="meta-item">📅 {new Date(data.createdAt).toLocaleDateString()}</span>
                {data.language && (
                  <span className={`meta-badge lang-${data.language}`}>
                    {data.language === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}
                  </span>
                )}
              </div>
              <ReactMarkdown>{markdownContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="article-card">
          <div className="action-grid">
            {/* Save */}
            <button
              onClick={() => saveArticle(false)}
              disabled={loading}
              className="btn-modern btn-dark"
            >
              {loading ? '⏳ Processing...' : '💾 Save Changes'}
            </button>

            {/* Regenerate */}
            <button
              onClick={() => saveArticle(true)}
              disabled={loading}
              className="btn-modern btn-ai"
            >
              {loading ? '⏳ Processing...' : '🤖 Regenerate with AI'}
            </button>

            {/* Publish Now */}
            <button
              onClick={publish}
              disabled={loading}
              className="btn-modern btn-success"
            >
              {loading ? '⏳ Processing...' : '🚀 Publish Now'}
            </button>

            {/* Schedule */}
            <div className="action-group action-grid-full">
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="form-input-modern"
              />
              <button
                onClick={approve}
                disabled={loading || !scheduleDate}
                className="btn-modern btn-schedule"
              >
                📅 Schedule
              </button>
            </div>

            {/* Reject */}
            <button
              onClick={reject}
              disabled={loading}
              className="btn-modern btn-danger action-grid-full"
            >
              {loading ? '⏳ Processing...' : '❌ Reject'}
            </button>
          </div>

          {/* Schedule Info */}
          {data.scheduledAt && (
            <div className="schedule-alert">
              <span className="schedule-alert-icon">📅</span>
              <p className="schedule-alert-text">
                <strong>Scheduled for:</strong> {new Date(data.scheduledAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
