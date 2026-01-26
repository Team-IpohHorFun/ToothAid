import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { searchChildren, getAllChildren } from '../db/indexedDB';

const SearchChild = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all children on mount
  useEffect(() => {
    setLoading(true);
    getAllChildren().then(all => {
      // Sort alphabetically by fullName
      const sorted = all.sort((a, b) => 
        a.fullName.localeCompare(b.fullName)
      );
      setResults(sorted);
      setLoading(false);
    });
  }, []);

  // Filter results when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      searchChildren(query).then(found => {
        // Sort alphabetically by fullName
        const sorted = found.sort((a, b) => 
          a.fullName.localeCompare(b.fullName)
        );
        setResults(sorted);
        setLoading(false);
      });
    } else if (query.trim().length === 0) {
      // Show all children when query is cleared
      setLoading(true);
      getAllChildren().then(all => {
        // Sort alphabetically by fullName
        const sorted = all.sort((a, b) => 
          a.fullName.localeCompare(b.fullName)
        );
        setResults(sorted);
        setLoading(false);
      });
    }
  }, [query]);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Search Child</h1>
        <p>Search by name, school, or barangay</p>
      </div>

      <div className="form-group">
        <input
          type="text"
          placeholder="Type to search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="loading">Searching...</div>}

      {!loading && results.length > 0 && (
        <div>
          {results.map(child => (
            <Link key={child.childId} to={`/child/${child.childId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <h3 style={{ marginBottom: '8px' }}>{child.fullName}</h3>
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
