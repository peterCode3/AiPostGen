'use client';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

type GeneratedItem = {
  url?: string;
  title?: string;
  status: string;
};

type AutoDentistProps = {
  onSuccess?: () => void;
};

export default function AutoDentist({ onSuccess }: AutoDentistProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedItem[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    toast.loading('🦷 Finding top dental articles... This may take 2-3 minutes', { id: 'gen-toast' });

    try {
      const res = await fetch('/api/auto-dentist', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await res.json();
      setResults(data.results || []);

      toast.success(`✅ Success! Redirecting to Article List...`, { 
        id: 'gen-toast',
        duration: 2000
      });
      
      // Redirect to article list after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ ${err.message || 'Generation failed'}`, { id: 'gen-toast' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="autodentist-container">
      <Toaster position="top-right" />
      
      <div className="autodentist-header">
        <h1 className="autodentist-title">
          <span>🦷</span>
          <span>Auto Dentist Generator</span>
        </h1>
        <p className="autodentist-subtitle">
          Automatically find, scrape, and prepare top dental articles for AI content generation
        </p>
      </div>

      <div className="autodentist-card">
        <h2 className="autodentist-card-title">
          <span>🤖</span>
          <span>What Auto Dentist Does:</span>
        </h2>

        <div className="autodentist-flow">
          <div className="flow-step">
            <div className="flow-step-number">1</div>
            <h3 className="flow-step-title">Find Top 10 Articles</h3>
            <p style={{fontSize: '14px', color: '#6b7280', marginTop: '8px'}}>
              Uses SerperAPI to search Google for dental industry articles
            </p>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">2</div>
            <h3 className="flow-step-title">Scrape & Save</h3>
            <p style={{fontSize: '14px', color: '#6b7280', marginTop: '8px'}}>
              Downloads each article → Saved in "Article List"
            </p>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">3</div>
            <h3 className="flow-step-title">Extract Keywords</h3>
            <p style={{fontSize: '14px', color: '#6b7280', marginTop: '8px'}}>
              AI extracts SEO keywords from scraped content
            </p>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">4</div>
            <h3 className="flow-step-title">Generate Articles</h3>
            <p style={{fontSize: '14px', color: '#6b7280', marginTop: '8px'}}>
              Creates SEO-optimized articles → Drafts
            </p>
          </div>
        </div>

        <div className="autodentist-estimates">
          <div className="estimate-card">
            <div className="estimate-icon">⏱️</div>
            <div className="estimate-label">Time:</div>
            <div className="estimate-value">2-3 minutes</div>
          </div>

          <div className="estimate-card">
            <div className="estimate-icon">📊</div>
            <div className="estimate-label">Articles:</div>
            <div className="estimate-value">10</div>
          </div>
        </div>

        <div className="alert alert-info" style={{marginBottom: '24px'}}>
          <span style={{fontSize: '20px'}}>📌</span>
          <strong>Next Step:</strong> After completion, you'll be automatically redirected to the "Article List" tab!
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="autodentist-button"
        >
          {loading ? (
            <>
              <span className="pulse">⏳</span>
              <span>Generating... Please wait</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Start Auto Generation</span>
            </>
          )}
        </button>

        {loading && (
          <div className="autodentist-status">
            <p className="status-text">
              🔍 Finding top dental articles... This may take 2-3 minutes
            </p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="autodentist-results">
          <h3 className="results-title">✅ Scraping Results:</h3>
          <div className="results-list">
            <ul>
              {results.map((item, idx) => (
                <li key={idx}>
                  {item.title || item.url} - <strong>{item.status}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
