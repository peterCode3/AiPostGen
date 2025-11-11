'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, name?: string) => void;
}

interface ImageItem {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

export default function ImageGallery({ isOpen, onClose, onSelect }: ImageGalleryProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'gallery') {
      fetchImages();
    }
  }, [isOpen, activeTab]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/upload/list');
      const data = await res.json();
      if (res.ok) {
        setImages(data.images || []);
      } else {
        toast.error('Failed to load images');
      }
    } catch (err) {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      toast.success('✅ Image uploaded!');
      
      // Refresh gallery and switch to gallery tab
      await fetchImages();
      setActiveTab('gallery');
      
      // Auto-select the uploaded image
      onSelect(json.url, file.name);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }

        .close-button {
          background: #f1f5f9;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #64748b;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 24px;
        }

        .tab {
          padding: 16px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #1e293b;
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
        }

        .image-item {
          position: relative;
          aspect-ratio: 1;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .image-item:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .image-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          padding: 8px;
          color: white;
          font-size: 11px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-item:hover .image-info {
          opacity: 1;
        }

        .upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 48px;
          text-align: center;
          background: #f8fafc;
          transition: all 0.2s;
        }

        .upload-area:hover {
          border-color: #667eea;
          background: #f1f5f9;
        }

        .upload-area.dragover {
          border-color: #667eea;
          background: #eef2ff;
        }

        .upload-button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 16px;
          transition: all 0.2s;
        }

        .upload-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .upload-button input {
          display: none;
        }

        .loading {
          text-align: center;
          padding: 48px;
          color: #64748b;
        }

        .empty-state {
          text-align: center;
          padding: 48px;
          color: #64748b;
        }

        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">🖼️ Image Gallery</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveTab('gallery')}
            >
              📚 Gallery ({images.length})
            </button>
            <button
              className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              📤 Upload New
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'gallery' && (
              <>
                {loading ? (
                  <div className="loading">Loading images...</div>
                ) : images.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p>No images uploaded yet</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>
                      Switch to Upload tab to add images
                    </p>
                  </div>
                ) : (
                  <div className="gallery-grid">
                    {images.map((img) => (
                      <div
                        key={img.url}
                        className="image-item"
                        onClick={() => {
                          onSelect(img.url, img.name);
                          onClose();
                        }}
                      >
                        <img src={img.url} alt={img.name} />
                        <div className="image-info">
                          <div>{img.name}</div>
                          <div>{formatFileSize(img.size)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'upload' && (
              <div className="upload-area">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                  Upload Image
                </h3>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                  Select an image file from your computer
                </p>
                <label className="upload-button">
                  {uploading ? '⏳ Uploading...' : 'Choose File'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '16px' }}>
                  Supported: JPG, PNG, GIF, WEBP, SVG
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

