/**
 * ============================================
 * REUSABLE SEARCH/FILTER COMPONENT
 * ============================================
 */

'use client';

type SearchFilterProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  showClearButton?: boolean;
};

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  placeholder = 'Search...',
  showClearButton = true,
}: SearchFilterProps) {
  return (
    <div className="search-filter-container">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {showClearButton && searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="search-clear-btn"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

