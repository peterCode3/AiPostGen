'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import Loading from '@/components/Loading';
import ImageGallery from '@/components/ImageGallery';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import '@/styles/article.css';

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'seo'>('edit');
  const [showGallery, setShowGallery] = useState(false);
  const [showFeaturedGallery, setShowFeaturedGallery] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      setFeaturedImage(json.featuredImage || '');
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
          content: { markdown: markdownContent },
          featuredImage: featuredImage
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();
      setMarkdownContent(updated.content.markdown);
      setData(updated);
      setFeaturedImage(updated.featuredImage || '');
      toast.success(regenerate ? '✅ Regenerated!' : '✅ Saved!', { id: 'save' });
    } catch (err) {
      toast.error('Failed to update', { id: 'save' });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) {
      if (json.code === 'READ_ONLY_FILESYSTEM') {
        throw new Error('⚠️ This hosting platform does not support file uploads. Please use Railway, Render, or DigitalOcean for file system writes.');
      }
      throw new Error(json.error || 'Upload failed');
    }
    return json.url;
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
      toast.success('✅ Featured image uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      insertImageMarkdown(url, file.name);
      toast.success('✅ Image inserted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const insertImageMarkdown = (url: string, name: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const imageMarkdown = `![${name}](${url})`;
      const newContent = 
        markdownContent.substring(0, start) + 
        imageMarkdown + 
        markdownContent.substring(end);
      
      setMarkdownContent(newContent);
      
      // Set cursor position after inserted image
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + imageMarkdown.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Fallback: append to end
      setMarkdownContent(prev => prev + `\n\n![${name}](${url})\n`);
    }
  };

  const handleGallerySelect = (url: string, name?: string) => {
    insertImageMarkdown(url, name || 'image');
    toast.success('✅ Image inserted!');
  };

  const handleFeaturedGallerySelect = (url: string, name?: string) => {
    setFeaturedImage(url);
    toast.success('✅ Featured image selected!');
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

        {/* Featured Image Upload */}
        <div className="article-card">
          <div className="article-card-header">
            <h3 className="article-card-title">🖼️ Featured Image</h3>
            <p className="article-card-subtitle">Upload a featured image for this article</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowFeaturedGallery(true)}
                style={{ 
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }}
              >
                🖼️ Choose from Gallery
              </button>
              <label style={{ 
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: '8px',
                cursor: uploadingImage ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                fontWeight: 600,
                opacity: uploadingImage ? 0.6 : 1,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}>
                {uploadingImage ? '⏳ Uploading...' : '📤 Upload New'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {featuredImage && (
              <div style={{ 
                position: 'relative',
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                <img 
                  src={featuredImage} 
                  alt="Featured" 
                  style={{ 
                    width: '100%',
                    maxWidth: '600px',
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #e2e8f0'
                  }} 
                />
                <button
                  onClick={() => {
                    setFeaturedImage('');
                    toast.success('Featured image removed');
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px' 
              }}>
                <h3 className="article-card-title" style={{ margin: 0 }}>
                  Markdown Content
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowGallery(true)}
                    style={{ 
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                    }}
                  >
                    🖼️ Gallery
                  </button>
                  <label style={{ 
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '14px',
                    opacity: uploadingImage ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }}>
                    {uploadingImage ? '⏳ Uploading...' : '📤 Upload & Insert'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInsertImage}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="form-textarea-modern form-textarea-tall"
                placeholder="Edit your markdown content here... Use the 'Insert Image' button to add images."
              />
              <p style={{ 
                marginTop: '12px', 
                fontSize: '13px', 
                color: '#718096',
                fontStyle: 'italic'
              }}>
                💡 Tip: Use "Gallery" to browse uploaded images or "Upload & Insert" to upload a new image
              </p>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="content-preview">
              {featuredImage && (
                <div style={{ marginBottom: '24px' }}>
                  <img 
                    src={featuredImage} 
                    alt="Featured" 
                    style={{ 
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h1>{data.title || 'Untitled Article'}</h1>
              <div className="meta-info-bar">
                <span className="meta-item">📅 {new Date(data.createdAt).toLocaleDateString()}</span>
                {data.language && (
                  <span className={`meta-badge lang-${data.language}`}>
                    {data.language === 'en' ? '🇬🇧 English' : '🇸🇦 Arabic'}
                  </span>
                )}
              </div>
              <ReactMarkdown 
                components={{
                  img: ({ node, ...props }) => (
                    <img 
                      {...props} 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto',
                        borderRadius: '8px',
                        margin: '16px 0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }} 
                    />
                  )
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Image Gallery Modal for Inline Images */}
        <ImageGallery
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSelect={handleGallerySelect}
        />

        {/* Image Gallery Modal for Featured Image */}
        <ImageGallery
          isOpen={showFeaturedGallery}
          onClose={() => setShowFeaturedGallery(false)}
          onSelect={handleFeaturedGallerySelect}
        />

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
