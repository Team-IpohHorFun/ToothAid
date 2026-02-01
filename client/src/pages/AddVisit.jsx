import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { getChild, addVisit, addToOutbox, performSync } from '../db/indexedDB';

const AddVisit = ({ token }) => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
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

  useEffect(() => {
    const loadChild = async () => {
      const childData = await getChild(childId);
      setChild(childData);
    };
    loadChild();
  }, [childId]);

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
    setError('');
    setSaving(true);

    try {
      const visitId = `visit-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';
      
      const visitData = {
        visitId,
        childId,
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

      // Save to IndexedDB
      await addVisit(visitData);
      
      // Add to outbox
      await addToOutbox('ADD_VISIT', visitId, visitData);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed, but visit saved locally:', syncError);
        }
      }

      navigate(`/child/${childId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!child) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="container">
<PageHeader title="Add Visit" subtitle={child.fullName} icon="visit" />

      {error && <div className="alert alert-danger">{error}</div>}

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

      <NavBar />
    </div>
  );
};

export default AddVisit;
