import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { searchChildren, getAllChildren, addVisit, addToOutbox, performSync } from '../db/indexedDB';

const RegisterChild = ({ token }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  
  // Visit form state (exact same as original AddVisit)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'SCREENING',
    painFlag: false,
    swellingFlag: false,
    decayedTeeth: '',
    missingTeeth: '',
    filledTeeth: '',
    treatmentTypes: [],
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const treatmentOptions = [
    'Cleaning',
    'Fluoride',
    'Filling',
    'Extraction',
    'Sealant',
    'SDF',
    'Other'
  ];

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

  const handleSelectChild = (child) => {
    setSelectedChild(child);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'SCREENING',
      painFlag: false,
      swellingFlag: false,
      decayedTeeth: '',
      missingTeeth: '',
      filledTeeth: '',
      treatmentTypes: [],
      notes: ''
    });
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'painFlag' || name === 'swellingFlag') {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else {
        // Treatment type checkbox
        setFormData(prev => ({
          ...prev,
          treatmentTypes: checked
            ? [...prev.treatmentTypes, value]
            : prev.treatmentTypes.filter(t => t !== value)
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChild) return;
    
    setError('');
    setSaving(true);

    try {
      const visitId = `visit-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';
      
      const visitData = {
        visitId,
        childId: selectedChild.childId,
        date: new Date(formData.date).toISOString(),
        type: formData.type,
        painFlag: formData.painFlag,
        swellingFlag: formData.swellingFlag,
        decayedTeeth: formData.decayedTeeth !== '' && formData.decayedTeeth != null ? (isNaN(parseInt(formData.decayedTeeth)) ? null : parseInt(formData.decayedTeeth)) : null,
        missingTeeth: formData.missingTeeth !== '' && formData.missingTeeth != null ? (isNaN(parseInt(formData.missingTeeth)) ? null : parseInt(formData.missingTeeth)) : null,
        filledTeeth: formData.filledTeeth !== '' && formData.filledTeeth != null ? (isNaN(parseInt(formData.filledTeeth)) ? null : parseInt(formData.filledTeeth)) : null,
        treatmentTypes: formData.treatmentTypes,
        notes: formData.notes.trim() || null,
        createdBy: username,
        createdAt: now
      };

      await addVisit(visitData);
      await addToOutbox('ADD_VISIT', visitId, visitData);

      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed, but visit saved locally:', syncError);
        }
      }

      navigate(`/child/${selectedChild.childId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      {/* Header changes based on whether child is selected */}
<PageHeader title="Add Visit" subtitle={selectedChild ? selectedChild.fullName : 'Select a child first'} icon="visit" />

      {/* Child Selection View */}
      {!selectedChild ? (
        <>
          <div className="form-group">
            <input
              type="text"
              placeholder="Search by name, school, or barangay..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <div className="loading">Searching...</div>}

          {!loading && results.length > 0 && (
            <div>
              {results.map(child => (
                <div 
                  key={child.childId} 
                  className="card" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectChild(child)}
                >
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
              <p>No children registered yet. Register children first in the Children tab.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected Child Header */}
          <div 
            className="card" 
            style={{ 
              background: '#e8f4fd', 
              borderLeft: '4px solid #007bff',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <h3 style={{ marginBottom: '4px' }}>{selectedChild.fullName}</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                {selectedChild.school} • {selectedChild.barangay}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setSelectedChild(null)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              Change
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Visit Form - EXACT same form as original AddVisit */}
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="form-group">
                <label>Date *</label>
                <DateInput
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  placeholder="MM/DD/YYYY"
                />
              </div>

              <div className="form-group">
                <label>Visit Type *</label>
                <select name="type" value={formData.type} onChange={handleChange} required>
                  <option value="SCREENING">Screening</option>
                  <option value="TREATMENT">Treatment</option>
                  <option value="FOLLOWUP">Follow-up</option>
                </select>
              </div>

              <div className="form-group">
                <label>Flags</label>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="painFlag"
                    name="painFlag"
                    checked={formData.painFlag}
                    onChange={handleChange}
                  />
                  <label htmlFor="painFlag">Pain</label>
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="swellingFlag"
                    name="swellingFlag"
                    checked={formData.swellingFlag}
                    onChange={handleChange}
                  />
                  <label htmlFor="swellingFlag">Swelling</label>
                </div>
              </div>

              <div className="form-group">
                <label>Decayed Teeth (optional)</label>
                <input
                  type="number"
                  name="decayedTeeth"
                  value={formData.decayedTeeth}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </div>

              <div className="form-group">
                <label>Missing Teeth (optional)</label>
                <input
                  type="number"
                  name="missingTeeth"
                  value={formData.missingTeeth}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </div>

              <div className="form-group">
                <label>Filled Teeth (optional)</label>
                <input
                  type="number"
                  name="filledTeeth"
                  value={formData.filledTeeth}
                  onChange={handleChange}
                  min="0"
                  step="1"
                />
              </div>

              <div className="form-group">
                <label>Treatment Types</label>
                {treatmentOptions.map(option => (
                  <div key={option} className="checkbox-group">
                    <input
                      type="checkbox"
                      id={`treatment-${option}`}
                      name="treatmentTypes"
                      value={option}
                      checked={formData.treatmentTypes.includes(option)}
                      onChange={handleChange}
                    />
                    <label htmlFor={`treatment-${option}`}>{option}</label>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </form>
        </>
      )}

      <NavBar />
    </div>
  );
};

export default RegisterChild;
