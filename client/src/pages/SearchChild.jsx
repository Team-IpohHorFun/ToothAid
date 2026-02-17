import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import { searchChildren, getAllChildren } from '../db/indexedDB';
import { formatChildDisplayName } from '../utils/displayName';

const SearchChild = ({ token }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all children on mount
  useEffect(() => {
    loadAllChildren();
  }, []);

  const loadAllChildren = async () => {
    setLoading(true);
    const all = await getAllChildren();
    setResults(all);
    setLoading(false);
  };

  // Filter results when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      searchChildren(query).then(found => {
        setResults(found);
        setLoading(false);
      });
    } else if (query.trim().length === 0) {
      loadAllChildren();
    }
  }, [query]);

  return (
    <div className="container">
<PageHeader title="Children" subtitle="Search or register children" icon="children" />

      {/* Search Input - Apple Style */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#f2f2f7',
        borderRadius: '12px',
        padding: '0 12px',
        marginBottom: '16px'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" style={{ width: '18px', height: '18px', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, school, or barangay..."
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '12px 10px',
            fontSize: '16px',
            color: '#1c1c1e'
          }}
        />
      </div>

      {/* Register New Child - navigates to dedicated page */}
      <Link
        to="/register-child"
        className="btn btn-primary btn-block"
        style={{ marginBottom: '16px', textAlign: 'center', textDecoration: 'none', display: 'block' }}
      >
        + Register New Child
      </Link>

      {/* Search Results */}
      {loading && <div className="loading">Searching...</div>}

      {!loading && results.length > 0 && (
        <div>
          {results.map(child => (
            <Link key={child.childId} to={`/child/${child.childId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <h3 style={{ marginBottom: '8px' }}>{formatChildDisplayName(child)}</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                  {child.school} • {child.barangay}
                </p>
                {child.grade && (
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                    {child.grade}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="empty-state">
          <p>No children found matching "{query}"</p>
        </div>
      )}

      {!loading && query.trim().length === 0 && results.length === 0 && (
        <div className="empty-state">
          <p>No children registered yet</p>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default SearchChild;
