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
  publishedAt?: string;
};

export default function PublishedPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined' && !token) {
      toast.error('Please log in to view published articles');
      window.location.href = '/admin/login';
      return;
    }
    fetchArticles();
  }, [token]);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles/draft', {
        headers: { authorization: `Bearer ${token}` },
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
      console.log('Fetched all articles:', data);
      
      // Handle both array and object responses
      const articles = Array.isArray(data) ? data : (data.articles || []);
      
      // Filter only published articles
      const publishedArticles = articles.filter((a: Article) => a.status === 'published');
      setItems(publishedArticles);
      
      console.log('Published articles:', publishedArticles.length);
    } catch (err: any) {
      console.error('Failed to load published articles:', err);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  // Filter by search query
  const searchedItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(query);
  });

  // Pagination calculations
  const totalPages = Math.ceil(searchedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = searchedItems.slice(startIndex, endIndex);

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
    <AdminLayout>
      <div className="loading-container">
        <Loading />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <Toaster position="top-right" />
      <main className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">📰 Published Articles</h1>
            <p className="page-subtitle">View all published articles</p>
          </div>
          <button
            onClick={fetchArticles}
            className="btn btn-light"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Card */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Total Published</h3>
                <p className="stat-value green">{items.length}</p>
              </div>
              <div className="stat-icon green">
                <span>📰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search published articles..."
        />

        {/* Published Articles Table */}
        {searchedItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📰</div>
            <p className="empty-state-title">No published articles found</p>
            <p className="empty-state-text">
              {searchQuery 
                ? `No articles match "${searchQuery}"`
                : 'Publish articles from drafts to see them here'
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
                  <th>Published</th>
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
                      <span className="status-badge published">
                        {article.status}
                      </span>
                    </td>
                    <td>
                      {article.publishedAt 
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : '—'
                      }
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
