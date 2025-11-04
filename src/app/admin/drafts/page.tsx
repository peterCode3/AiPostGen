/**
 * ============================================
 * DRAFTS PAGE - Step 2: Admin Reviews Generated Articles
 * ============================================
 * 
 * After articles are generated from sources, they appear here
 * Admin can: View, Edit, Publish, Schedule, Reject, Delete
 */

'use client';
import { useEffect, useState } from 'react';
import Loading from '@/components/Loading';
import AdminLayout from '@/components/AdminLayout';
import Pagination from '@/components/Pagination';
import SearchFilter from '@/components/SearchFilter';
import toast, { Toaster } from 'react-hot-toast';

type Article = {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  scheduledAt?: string;
};

export default function Drafts() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'review' | 'scheduled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined' && !token) {
      toast.error('Please log in to view drafts');
      window.location.href = '/admin/login';
      return;
    }
    fetchArticles();
  }, [token]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/articles/draft', {
        headers: { authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token is invalid or expired
          localStorage.removeItem('token');
          toast.error('Session expired. Please log in again.');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 1500);
          return;
        }
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Fetched articles:', data);
      
      // Handle both array and object responses
      const articles = Array.isArray(data) ? data : (data.articles || []);
      setItems(articles);
      
      if (articles.length === 0) {
        console.log('No articles found in database');
      }
    } catch (err: any) {
      console.error('Failed to load articles:', err);
      toast.error(`Failed to load articles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Are you sure? This action is permanent.')) return;

    try {
      const res = await fetch(`/api/articles/draft/${id}/delete`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');

      toast.success('🗑️ Article deleted');
      setItems(prev => prev.filter(article => article._id !== id));
    } catch (err) {
      toast.error('Failed to delete article');
    }
  };

  const quickPublish = async (id: string, title: string) => {
    if (!confirm(`Publish "${title}" immediately?`)) return;

    try {
      const res = await fetch(`/api/articles/draft/${id}/publish`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Publish failed');

      toast.success('🚀 Article published!');
      setItems(prev => prev.map(a => 
        a._id === id ? { ...a, status: 'published' } : a
      ));
    } catch (err) {
      toast.error('Failed to publish');
    }
  };

  // Filter by status
  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'review') return item.status === 'review';
    if (filter === 'scheduled') return item.status === 'scheduled';
    return true;
  });

  // Filter by search query
  const searchedItems = filteredItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(searchedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = searchedItems.slice(startIndex, endIndex);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (loading) {
    return (
    <AdminLayout>
        <div className="loading-container">
      <Loading />
        </div>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      
      <main className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📝 Drafts & Review</h1>
            <p className="page-subtitle">Review, edit, and publish your generated articles</p>
          </div>
          <button
            onClick={fetchArticles}
            className="btn btn-light"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Total Articles</h3>
                <p className="stat-value blue">{items.length}</p>
              </div>
              <div className="stat-icon blue">
                <span>📄</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>In Review</h3>
                <p className="stat-value yellow">
                  {items.filter(i => i.status === 'review').length}
                </p>
              </div>
              <div className="stat-icon yellow">
                <span>⏳</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Scheduled</h3>
                <p className="stat-value green">
                  {items.filter(i => i.status === 'scheduled').length}
                </p>
              </div>
              <div className="stat-icon green">
                <span>📅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All', count: items.length },
            { key: 'review', label: 'In Review', count: items.filter(i => i.status === 'review').length },
            { key: 'scheduled', label: 'Scheduled', count: items.filter(i => i.status === 'scheduled').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`filter-tab ${filter === key ? 'active' : ''}`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search by title or status..."
        />

        {/* Articles Table */}
        {searchedItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">No articles found</p>
            <p className="empty-state-text">
              {searchQuery 
                ? `No articles match "${searchQuery}"`
                : filter === 'all' 
                  ? 'Generate articles from sources to see them here'
                  : `No articles with "${filter}" status`
              }
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Schedule</th>
                  <th>Created</th>
                  <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((article) => (
                  <tr key={article._id}>
                    <td>
                      <div 
                        className="table-title"
                        dangerouslySetInnerHTML={{ __html: article.title }}
                      />
                    </td>
                    <td>
                      <span className={`status-badge ${article.status}`}>
                        {article.status}
                      </span>
                    </td>
                    <td>
                      {article.scheduledAt ? (
                        <span style={{color: '#2563eb', fontWeight: 500}}>
                          {new Date(article.scheduledAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={{color: '#9ca3af'}}>—</span>
                      )}
                    </td>
                    <td>
                      {new Date(article.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-actions">
                        <a
                          href={`/admin/article/view/${article._id}`}
                          className="btn btn-light btn-sm"
                        >
                          👁️ View
                        </a>
                        <a
                          href={`/admin/article/${article._id}`}
                          className="btn btn-primary btn-sm"
                        >
                          ✏️ Edit
                        </a>
                        <button
                          onClick={() => quickPublish(article._id, article.title)}
                          className="btn btn-success btn-sm"
                        >
                          🚀 Publish
                        </button>
                        <button
                          onClick={() => deleteArticle(article._id)}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {searchedItems.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={searchedItems.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
