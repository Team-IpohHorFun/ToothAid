import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DateInput from '../components/DateInput';
import { searchChildren, getAllChildren, upsertChild, addToOutbox, checkDuplicates, performSync } from '../db/indexedDB';

const SearchChild = ({ token }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  
  // Register form state (exact same as original RegisterChild)
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    age: '',
    sex: '',
    school: '',
    grade: '',
    barangay: '',
    guardianPhone: ''
  });
  const [duplicates, setDuplicates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load all children on mount
  useEffect(() => {
    loadAllChildren();
  }, []);

  const loadAllChildren = async () => {
    setLoading(true);
    const all = await getAllChildren();
    const sorted = all.sort((a, b) => a.fullName.localeCompare(b.fullName));
    setResults(sorted);
    setLoading(false);
  };

  // Filter results when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      setLoading(true);
      searchChildren(query).then(found => {
        const sorted = found.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setResults(sorted);
        setLoading(false);
      });
    } else if (query.trim().length === 0) {
      loadAllChildren();
    }
  }, [query]);

  // Check for duplicates (exact same logic as original RegisterChild)
  useEffect(() => {
    const checkDups = async () => {
      if (formData.fullName && formData.school && (formData.dob || formData.age)) {
        const childData = {
          ...formData,
          dob: formData.dob || null,
          age: formData.age ? parseInt(formData.age) : null
        };
        const dups = await checkDuplicates(childData);
        setDuplicates(dups);
      } else {
        setDuplicates([]);
      }
    };
    checkDups();
  }, [formData.fullName, formData.school, formData.dob, formData.age]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const childId = `child-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';
      
      const childData = {
        childId,
        fullName: formData.fullName.trim(),
        dob: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        sex: formData.sex,
        school: formData.school.trim(),
        grade: formData.grade.trim() || null,
        barangay: formData.barangay.trim(),
        guardianPhone: formData.guardianPhone.trim() || null,
        createdBy: username,
        updatedBy: username,
        createdAt: now,
        updatedAt: now
      };

      await upsertChild(childData);
      await addToOutbox('UPSERT_CHILD', childId, childData);

      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed, but child saved locally:', syncError);
        }
      }

      navigate(`/child/${childId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      dob: '',
      age: '',
      sex: '',
      school: '',
      grade: '',
      barangay: '',
      guardianPhone: ''
    });
    setDuplicates([]);
    setError('');
    setShowRegisterForm(false);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Children</h1>
        <p>Search or register children</p>
      </div>

      {/* Search Input */}
      <div className="form-group">
        <input
          type="text"
          placeholder="Search by name, school, or barangay..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Register New Child Button */}
      {!showRegisterForm && (
        <button 
          className="btn btn-primary btn-block"
          onClick={() => setShowRegisterForm(true)}
          style={{ marginBottom: '16px' }}
        >
          + Register New Child
        </button>
      )}

      {/* Register Form - EXACT same form as original RegisterChild */}
      {showRegisterForm && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0 }}>Register New Child</h2>
            <button 
              type="button"
              onClick={resetForm}
              style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {duplicates.length > 0 && (
            <div className="alert alert-warning">
              <strong>⚠️ Possible Duplicate Detected:</strong>
              <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                {duplicates.map(dup => (
                  <li key={dup.childId}>
                    {dup.fullName} - {dup.school} 
                    {dup.dob && ` (DOB: ${formatDate(dup.dob)})`}
                    {dup.age && ` (Age: ${dup.age})`}
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '8px' }}>Please verify this is not a duplicate before proceeding.</p>
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date of Birth (or leave blank and enter age)</label>
                <DateInput
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  placeholder="MM/DD/YYYY"
                />
              </div>

              <div className="form-group">
                <label>Age (if DOB unknown)</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="18"
                />
              </div>

              <div className="form-group">
                <label>Sex *</label>
                <select name="sex" value={formData.sex} onChange={handleChange} required>
                  <option value="" disabled>Select Sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label>School *</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Grade</label>
                <select name="grade" value={formData.grade} onChange={handleChange}>
                  <option value="" disabled>Select Grade</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="1st Grade">1st Grade</option>
                  <option value="2nd Grade">2nd Grade</option>
                  <option value="3rd Grade">3rd Grade</option>
                  <option value="4th Grade">4th Grade</option>
                  <option value="5th Grade">5th Grade</option>
                  <option value="6th Grade">6th Grade</option>
                </select>
              </div>

              <div className="form-group">
                <label>Barangay *</label>
                <input
                  type="text"
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Guardian Phone</label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  placeholder="09123456789"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Register Child'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Results */}
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

      {!loading && query.trim().length === 0 && results.length === 0 && !showRegisterForm && (
        <div className="empty-state">
          <p>No children registered yet</p>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default SearchChild;
