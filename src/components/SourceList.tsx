/**
 * ============================================
 * SOURCE LIST - Step 1: Admin Reviews Scraped Articles
 * ============================================
 * 
 * FLOW:
 * 1. Auto Dentist scrapes top 10 articles → Saved here
 * 2. Admin reviews list
 * 3. Admin clicks "Generate Article" for selected sources
 * 4. AI generates → Goes to Drafts
 * 
 * This is the FIRST STEP in the correct flow!
 */

'use client';
import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import Pagination from '@/components/Pagination';
import SearchFilter from '@/components/SearchFilter';
import toast, { Toaster } from 'react-hot-toast';

type Source = {
  _id: string;
  url: string;
  domain: string;
  text?: string;
  metadata?: {
    title?: string;
  };
  fetchedAt?: string;
};

export default function SourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sources/list', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch sources');
      const data = await res.json();
      setSources(data || []);
    } catch (err) {
      toast.error('Failed to load sources ❌');
    } finally {
      setLoading(false);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    try {
      const res = await fetch(`/api/sources/delete/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('🗑️ Source deleted successfully');
      setSources(prev => prev.filter(s => s._id !== id));
    } catch {
      toast.error('Failed to delete source ❌');
    }
  };

  const generateFromSource = async (sourceId: string, title: string) => {
    if (!confirm(`Generate article from: "${title}"?`)) return;
    
    setGenerating(sourceId);
    toast.loading('🤖 Generating article... This may take 30-60 seconds', { id: 'gen' });

    try {
      const keyword = title.split(' ').slice(0, 5).join(' ') || 'dental article';
      
      const kwRes = await fetch('/api/keywords/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          keywords: [{ term: keyword, locale: 'en' }]
        })
      });
      
      if (!kwRes.ok) {
        const errText = await kwRes.text();
        console.error('Keyword creation failed:', errText);
        throw new Error(`Failed to create keyword: ${errText}`);
      }
      
      const kwData = await kwRes.json();
      console.log('Keyword response:', kwData);
      
      const keywordId = kwData.keywords?.[0]?._id;

      if (!keywordId) {
        console.error('No keyword ID in response:', kwData);
        throw new Error('No keyword ID returned');
      }

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          keywordIds: [keywordId],
          sourceIds: [sourceId],
          language: 'en',
          wordCount: 1500
        })
      });

      if (!genRes.ok) throw new Error('Generation failed');
      const genData = await genRes.json();

      toast.success(`✅ Article generated! Check drafts.`, { id: 'gen' });
      
      setTimeout(() => {
        window.location.href = '/admin/drafts';
      }, 2000);

    } catch (err: any) {
      toast.error(`❌ ${err.message || 'Generation failed'}`, { id: 'gen' });
    } finally {
      setGenerating(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const generateFromSelected = async () => {
    if (selectedSources.length === 0) {
      toast.error('Please select at least one source');
      return;
    }

    if (!confirm(`Generate ${selectedSources.length} articles?`)) return;

    toast.loading(`🤖 Generating ${selectedSources.length} articles...`, { id: 'bulk' });

    try {
      const selectedSourceObjects = sources.filter(s => selectedSources.includes(s._id));
      const keywords = selectedSourceObjects.map(s => ({
        term: s.metadata?.title?.split(' ').slice(0, 5).join(' ') || 'dental article',
        locale: 'en'
      }));

      const kwRes = await fetch('/api/keywords/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ keywords })
      });

      if (!kwRes.ok) {
        const errText = await kwRes.text();
        console.error('Bulk keywords creation failed:', errText);
        throw new Error(`Failed to create keywords: ${errText}`);
      }
      
      const kwData = await kwRes.json();
      console.log('Bulk keywords response:', kwData);
      
      const keywordIds = kwData.keywords?.map((k: any) => k._id) || [];
      
      if (keywordIds.length === 0) {
        console.error('No keyword IDs in response:', kwData);
        throw new Error('No keyword IDs returned');
      }

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          keywordIds,
          sourceIds: selectedSources,
          language: 'en',
          wordCount: 1500
        })
      });

      if (!genRes.ok) throw new Error('Batch generation failed');

      toast.success(`✅ ${selectedSources.length} articles generated! Redirecting...`, { id: 'bulk' });
      
      setTimeout(() => {
        window.location.href = '/admin/drafts';
      }, 2000);

    } catch (err: any) {
      toast.error(`❌ ${err.message}`, { id: 'bulk' });
    }
  };

  // Filter by search query
  const searchedSources = sources.filter(source => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      source.metadata?.title?.toLowerCase().includes(query) ||
      source.url.toLowerCase().includes(query) ||
      source.domain.toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(searchedSources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSources = searchedSources.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (loading) return (
    <div className="loading-container">
      <Loading />
    </div>
  );

  return (
    <div className="sources-container">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="sources-header">
        <div className="sources-header-content">
          <h1>📚 Scraped Articles</h1>
          <p>Review scraped articles and generate content from them</p>
        </div>
        <button
          onClick={fetchSources}
          className="btn btn-light"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="sources-stats">
        <div className="sources-stat-item">
          <span className="sources-stat-label">Total Sources:</span>
          <span className="sources-stat-value">{sources.length}</span>
        </div>
        <div className="sources-stat-item">
          <span className="sources-stat-label">Selected:</span>
          <span className="sources-stat-value">{selectedSources.length}</span>
        </div>
      </div>

      {/* Search Filter */}
      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search by title, URL, or domain..."
      />

      {/* Bulk Action Bar */}
      {selectedSources.length > 0 && (
        <div className="sources-bulk-bar">
          <span className="sources-bulk-text">
            {selectedSources.length} source(s) selected
          </span>
          <button
            onClick={generateFromSelected}
            className="sources-bulk-button"
          >
            🤖 Generate {selectedSources.length} Article(s)
          </button>
        </div>
      )}

      {/* Sources Table */}
      {searchedSources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-title">No sources found</p>
          <p className="empty-state-text">
            {searchQuery 
              ? `No sources match "${searchQuery}"`
              : 'Run "Auto Dentist" to scrape articles first'
            }
          </p>
        </div>
      ) : (
        <div className="sources-table-wrapper">
          <table className="sources-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSources(paginatedSources.map(s => s._id));
                      } else {
                        setSelectedSources([]);
                      }
                    }}
                    checked={paginatedSources.length > 0 && paginatedSources.every(s => selectedSources.includes(s._id))}
                    className="source-checkbox"
                  />
                </th>
                <th>TITLE</th>
                <th>DOMAIN</th>
                <th>FETCHED</th>
                <th style={{textAlign: 'right'}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSources.map((source) => (
                <tr 
                  key={source._id} 
                  className={selectedSources.includes(source._id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source._id)}
                      onChange={() => toggleSelection(source._id)}
                      className="source-checkbox"
                    />
                  </td>
                  <td className="source-title-cell">
                    <div className="source-title">
                      {source.metadata?.title || 'Untitled'}
                    </div>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="source-url"
                    >
                      {source.url}
                    </a>
                  </td>
                  <td>
                    <span className="source-domain">{source.domain}</span>
                  </td>
                  <td>
                    <span className="source-date">
                      {source.fetchedAt 
                        ? new Date(source.fetchedAt).toLocaleDateString()
                        : '—'
                      }
                    </span>
                  </td>
                  <td>
                    <div className="source-actions">
                      <button
                        onClick={() => generateFromSource(source._id, source.metadata?.title || 'Article')}
                        disabled={generating === source._id}
                        className="source-generate-btn"
                      >
                        {generating === source._id ? '⏳ Generating...' : '🤖 Generate'}
                      </button>
                      <button
                        onClick={() => deleteSource(source._id)}
                        className="source-delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {searchedSources.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={searchedSources.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
