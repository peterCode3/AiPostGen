/**
 * ============================================
 * GENERATE CONTENT - Manual Article Generation
 * ============================================
 * 
 * Beautiful UI matching Auto Dentist design
 * Select keywords + sources manually
 * Generate articles with AI
 */

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
const Select = dynamic(() => import('react-select'), { ssr: false });

export default function GenerateContent() {
  const [keywords, setKeywords] = useState<{ _id: string; term: string }[]>([]);
  const [sources, setSources] = useState<{ _id: string; url: string }[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [language, setLanguage] = useState('en');
  const [wordCount, setWordCount] = useState(1500);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch keywords
  useEffect(() => {
    if (!token) return;
    fetch('/api/keywords/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Keywords fetched:', data);
        setKeywords(data);
      })
      .catch(console.error);
  }, [token]);

  // Fetch sources
  useEffect(() => {
    if (!token) return;
    fetch('/api/sources/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Sources fetched:', data);
        setSources(data);
      })
      .catch(console.error);
  }, [token]);

  const handleGenerate = async () => {
    if (!selectedKeywords.length) {
      toast.error('❌ Please select at least one keyword');
      return;
    }

    setLoading(true);
    toast.loading('🤖 Generating articles...', { id: 'gen' });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          keywordIds: selectedKeywords.map(k => k.value),
          sourceIds,
          language,
          wordCount
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      setResult(data);
      toast.success(`✅ Generated ${data.summary.succeeded} articles!`, { id: 'gen' });
      
      // Redirect to drafts after 2 seconds
      setTimeout(() => {
        window.location.href = '/admin/drafts';
      }, 2000);

    } catch (err: any) {
      console.error(err);
      toast.error(`❌ ${err.message || 'Generation failed'}`, { id: 'gen' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-content-container">
      {/* Hero Header */}
      <div className="generate-hero">
        <div className="generate-hero-icon">✍️</div>
        <h1 className="generate-hero-title">Manual Article Generation</h1>
        <p className="generate-hero-description">
          Create high-quality, SEO-optimized articles by selecting keywords and reference sources. 
          Our AI will generate comprehensive content tailored to your needs.
        </p>
      </div>

      {/* Main Card */}
      <div className="generate-main-card">
        
        {/* Section 1: Keywords */}
        <div className="generate-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📝</span>
              Keywords Selection
            </h2>
            <span className="required-badge">Required</span>
          </div>
          <p className="section-description">
            Choose the keywords or topics you want to generate articles about. You can select multiple keywords to create several articles at once.
          </p>
          
          <div className="input-wrapper">
            <Select
              isMulti
              options={keywords.map(k => ({ value: k._id, label: k.term }))}
              value={selectedKeywords}
              onChange={(val) => setSelectedKeywords(val || [])}
              placeholder="🔍 Search and select keywords..."
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '52px',
                  borderColor: '#e5e7eb',
                  borderWidth: '2px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  '&:hover': { borderColor: '#2563eb' },
                  boxShadow: 'none'
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#dbeafe',
                  borderRadius: '6px',
                  padding: '2px 4px'
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: '#1e40af',
                  fontWeight: '500',
                  fontSize: '14px'
                })
              }}
            />
          </div>
          
          <div className="hint-box">
            <span className="hint-icon">💡</span>
            <span className="hint-text">Each keyword will generate one unique article</span>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* Section 2: Sources */}
        <div className="generate-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📚</span>
              Reference Sources
            </h2>
            <span className="optional-badge">Optional</span>
          </div>
          <p className="section-description">
            Select reference articles to improve content quality. Our AI will use these sources to create more accurate and comprehensive articles.
          </p>

          
          <div className="input-wrapper">
            {sources.length === 0 ? (
              <div className="sources-empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-title">No Sources Available</p>
                <p className="empty-text">
                  Scrape articles first from the "Generate Blog Dentist" tab to use as references.
                </p>
              </div>
            ) : (
              <div className="sources-checklist-new">
                <div className="sources-header-info">
                  <span className="sources-count">{sourceIds.length} of {sources.length} selected</span>
                  {sourceIds.length > 0 && (
                    <button 
                      className="sources-clear"
                      onClick={() => setSourceIds([])}
                      type="button"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                <div className="sources-list">
                  {sources.map((source) => (
                    <label key={source._id} className="source-item-new">
                      <input
                        type="checkbox"
                        value={source._id}
                        checked={sourceIds.includes(source._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSourceIds([...sourceIds, source._id]);
                          } else {
                            setSourceIds(sourceIds.filter(id => id !== source._id));
                          }
                        }}
                        className="source-checkbox-new"
                      />
                      <div className="source-content">
                        <span className="source-icon-new">🔗</span>
                        <span className="source-url-new">{source.url}</span>
                      </div>
                      <div className="source-checkmark">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="hint-box">
            <span className="hint-icon">💡</span>
            <span className="hint-text">Adding sources improves article accuracy and SEO quality</span>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* Section 3: Settings */}
        <div className="generate-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">⚙️</span>
              Generation Settings
            </h2>
          </div>
          <p className="section-description">
            Customize your article generation preferences including language and word count.
          </p>

          <div className="settings-grid-new">
            <div className="setting-item">
              <label className="setting-label">
                <span className="label-icon">🌐</span>
                <span className="label-text">Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="setting-select"
              >
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇸🇦 Arabic</option>
                <option value="ur">🇵🇰 Urdu</option>
              </select>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <span className="label-icon">📏</span>
                <span className="label-text">Word Count</span>
              </label>
              <input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                min="500"
                max="5000"
                step="100"
                className="setting-input"
                placeholder="1500"
              />
              <span className="setting-hint">Recommended: 1500-2000 words</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider"></div>

        {/* Summary Cards */}
        <div className="generate-summary">
          <h3 className="summary-title">Generation Summary</h3>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <span className="summary-label">Articles</span>
                <span className="summary-value">{selectedKeywords.length || 0}</span>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">📝</div>
              <div className="summary-content">
                <span className="summary-label">Words Each</span>
                <span className="summary-value">{wordCount}</span>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">🔗</div>
              <div className="summary-content">
                <span className="summary-label">Sources</span>
                <span className="summary-value">{sourceIds.length || 0}</span>
              </div>
            </div>

            <div className="summary-card highlight">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <span className="summary-label">Total Words</span>
                <span className="summary-value">
                  {(selectedKeywords.length * wordCount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="info-banner">
          <div className="info-icon-wrapper">
            <span className="info-icon">💡</span>
          </div>
          <div className="info-content">
            <p className="info-title">What happens next?</p>
            <p className="info-text">
              Generated articles will appear in the <strong>Drafts</strong> tab where you can review, edit, and publish them.
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || selectedKeywords.length === 0}
          className="generate-action-button"
        >
          {loading ? (
            <>
              <span className="button-spinner pulse">⏳</span>
              <span className="button-text">Generating Articles...</span>
              <span className="button-subtext">Please wait, this may take 1-2 minutes</span>
            </>
          ) : (
            <>
              <span className="button-icon">🚀</span>
              <span className="button-text">
                Generate {selectedKeywords.length} Article{selectedKeywords.length !== 1 ? 's' : ''}
              </span>
              <span className="button-subtext">Click to start AI generation</span>
            </>
          )}
        </button>

        {loading && (
          <div className="loading-status">
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <p className="loading-text">
              🤖 AI is analyzing your keywords and creating high-quality content...
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="autodentist-results">
          <h3 className="results-title">✅ Generation Complete!</h3>
          <div className="results-summary">
            <div className="summary-stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{result.summary.total}</span>
            </div>
            <div className="summary-stat success">
              <span className="stat-label">Succeeded:</span>
              <span className="stat-value">{result.summary.succeeded}</span>
            </div>
            <div className="summary-stat error">
              <span className="stat-label">Failed:</span>
              <span className="stat-value">{result.summary.failed}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Total Words:</span>
              <span className="stat-value">{result.summary.totalWords.toLocaleString()}</span>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <div className="results-list">
              <h4 style={{marginBottom: '12px', color: '#374151', fontSize: '14px', fontWeight: '600'}}>
                📄 Generated Articles:
              </h4>
              <ul>
                {result.results.map((item: any, idx: number) => (
                  <li key={idx}>
                    <strong>{item.title}</strong>
                    <span style={{color: '#6b7280', fontSize: '13px'}}>
                      {' '}• {item.wordCount} words • {item.slug}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="alert alert-success" style={{marginTop: '16px'}}>
            <span style={{fontSize: '20px'}}>🎉</span>
            <strong>Success!</strong> Redirecting to Drafts page...
          </div>
        </div>
      )}
    </div>
  );
}
