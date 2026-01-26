import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DateInput from '../components/DateInput';
import { upsertClinicDay, addToOutbox, performSync } from '../db/indexedDB';

const CreateClinicDay = ({ token }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    school: '',
    capacity: '',
    amCapacity: '',
    pmCapacity: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.date || !formData.school || !formData.capacity) {
        throw new Error('Date, School, and Capacity are required');
      }

      const capacity = parseInt(formData.capacity);
      if (isNaN(capacity) || capacity < 1) {
        throw new Error('Capacity must be at least 1');
      }

      let amCapacity = null;
      let pmCapacity = null;
      
      if (formData.amCapacity || formData.pmCapacity) {
        if (formData.amCapacity) {
          amCapacity = parseInt(formData.amCapacity);
          if (isNaN(amCapacity) || amCapacity < 0) {
            throw new Error('AM Capacity must be a valid number');
          }
        }
        if (formData.pmCapacity) {
          pmCapacity = parseInt(formData.pmCapacity);
          if (isNaN(pmCapacity) || pmCapacity < 0) {
            throw new Error('PM Capacity must be a valid number');
          }
        }
        if (amCapacity && pmCapacity && (amCapacity + pmCapacity) !== capacity) {
          throw new Error('AM + PM capacity must equal total capacity');
        }
      }

      const clinicDayId = `clinic-day-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';
      
      const clinicDayData = {
        clinicDayId,
        date: new Date(formData.date).toISOString(),
        school: formData.school.trim(),
        capacity,
        amCapacity: amCapacity !== null ? amCapacity : null,
        pmCapacity: pmCapacity !== null ? pmCapacity : null,
        notes: formData.notes.trim() || null,
        createdBy: username,
        createdAt: now
      };

      // Save to IndexedDB
      await upsertClinicDay(clinicDayData);
      
      // Add to outbox
      await addToOutbox('UPSERT_CLINIC_DAY', clinicDayId, clinicDayData);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync error:', syncError);
          // Continue anyway - data is saved locally
        }
      }

      // Navigate to build roster page
      navigate(`/clinic-days/${clinicDayId}/build-roster`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Create Clinic Day</h1>
        <p>Schedule a new clinic day</p>
      </div>

      {error && (
        <div className="alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <DateInput
            id="date"
            name="date"
            value={formData.date}
            onChange={(e) => handleChange(e)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="school">School *</label>
          <input
            type="text"
            id="school"
            name="school"
            value={formData.school}
            onChange={handleChange}
            placeholder="e.g. Boctol Elementary"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="capacity">Total Capacity *</label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            placeholder="e.g. 20"
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amCapacity">AM Capacity (Optional)</label>
          <input
            type="number"
            id="amCapacity"
            name="amCapacity"
            value={formData.amCapacity}
            onChange={handleChange}
            placeholder="e.g. 10"
            min="0"
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Leave empty if not splitting by AM/PM
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="pmCapacity">PM Capacity (Optional)</label>
          <input
            type="number"
            id="pmCapacity"
            name="pmCapacity"
            value={formData.pmCapacity}
            onChange={handleChange}
            placeholder="e.g. 10"
            min="0"
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Leave empty if not splitting by AM/PM
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="e.g. priority cases first"
            rows="3"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Creating...' : 'Create Clinic Day'}
        </button>
      </form>

      <NavBar />
    </div>
  );
};

export default CreateClinicDay;
