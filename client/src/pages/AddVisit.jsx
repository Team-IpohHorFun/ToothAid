import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { getChild, addVisit, addToOutbox, performSync } from '../db/indexedDB';
import { TREATMENT_OPTIONS, EXTRACTION_CHOICES, buildTreatmentTypesArray } from '../utils/treatmentTypes';
import { formatChildDisplayName } from '../utils/displayName';

const AddVisit = ({ token }) => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    painFlag: false,
    swellingFlag: false,
    decayedTeeth: '',
    missingTeeth: '',
    filledTeeth: '',
    selectedTreatmentIds: [],
    extractionType: 'Permanent',
    extractionPermanentCount: '',
    extractionTemporaryCount: '',
    fillingsNumberOfTeeth: '',
    fillingsGlassIonomer: '',
    fillingsComposite: '',
    temporaryFillingSurfaces: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      }
    } else {
      const next = (type === 'text' || type === 'textarea') && name !== 'notes' ? String(value).toUpperCase() : value;
      setFormData(prev => ({ ...prev, [name]: next }));
    }
  };

  const toggleTreatment = (id) => {
    setFormData(prev => ({
      ...prev,
      selectedTreatmentIds: prev.selectedTreatmentIds.includes(id)
        ? prev.selectedTreatmentIds.filter(x => x !== id)
        : [...prev.selectedTreatmentIds, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const treatmentTypes = buildTreatmentTypesArray({
        selectedIds: formData.selectedTreatmentIds,
        extractionType: formData.extractionType,
        extractionPermanentCount: formData.extractionPermanentCount,
        extractionTemporaryCount: formData.extractionTemporaryCount,
        fillingsNumberOfTeeth: formData.fillingsNumberOfTeeth,
        fillingsGlassIonomer: formData.fillingsGlassIonomer,
        fillingsComposite: formData.fillingsComposite,
        temporaryFillingSurfaces: formData.temporaryFillingSurfaces
      });

      const visitId = `visit-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const username = localStorage.getItem('username') || 'unknown';

      const visitData = {
        visitId,
        childId,
        date: new Date(formData.date).toISOString(),
        painFlag: formData.painFlag,
        swellingFlag: formData.swellingFlag,
        decayedTeeth: formData.decayedTeeth !== '' && formData.decayedTeeth != null ? (isNaN(parseInt(formData.decayedTeeth)) ? null : parseInt(formData.decayedTeeth)) : null,
        missingTeeth: formData.missingTeeth !== '' && formData.missingTeeth != null ? (isNaN(parseInt(formData.missingTeeth)) ? null : parseInt(formData.missingTeeth)) : null,
        filledTeeth: formData.filledTeeth !== '' && formData.filledTeeth != null ? (isNaN(parseInt(formData.filledTeeth)) ? null : parseInt(formData.filledTeeth)) : null,
        treatmentTypes: treatmentTypes ?? [],
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

      navigate(`/child/${childId}`, { state: { refreshVisits: true } });
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
      <PageHeader title="Add Visit" subtitle={formatChildDisplayName(child)} icon="visit" />
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
            <label>Flags</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, painFlag: !prev.painFlag }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px',
                  border: formData.painFlag ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                  background: formData.painFlag ? 'var(--color-primary-soft)' : '#f2f2f7',
                  color: formData.painFlag ? 'var(--color-primary)' : '#1c1c1e', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {formData.painFlag && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}><polyline points="20 6 9 17 4 12" /></svg>}
                Pain
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, swellingFlag: !prev.swellingFlag }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderRadius: '12px',
                  border: formData.swellingFlag ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                  background: formData.swellingFlag ? 'var(--color-primary-soft)' : '#f2f2f7',
                  color: formData.swellingFlag ? 'var(--color-primary)' : '#1c1c1e', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {formData.swellingFlag && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}><polyline points="20 6 9 17 4 12" /></svg>}
                Swelling
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Decayed Teeth (optional)</label>
            <input type="number" name="decayedTeeth" value={formData.decayedTeeth} onChange={handleChange} min="0" step="1" />
          </div>
          <div className="form-group">
            <label>Missing Teeth (optional)</label>
            <input type="number" name="missingTeeth" value={formData.missingTeeth} onChange={handleChange} min="0" step="1" />
          </div>
          <div className="form-group">
            <label>Filled Teeth (optional)</label>
            <input type="number" name="filledTeeth" value={formData.filledTeeth} onChange={handleChange} min="0" step="1" />
          </div>

          <div className="form-group">
            <label>Treatment Types</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {TREATMENT_OPTIONS.map(opt => {
                const isSelected = formData.selectedTreatmentIds.includes(opt.id);
                return (
                  <div key={opt.id} style={{ marginBottom: isSelected && opt.subType ? '8px' : '0' }}>
                    <button
                      type="button"
                      onClick={() => toggleTreatment(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', width: 'fit-content', maxWidth: '100%', textAlign: 'left',
                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                        background: isSelected ? 'var(--color-primary-soft)' : '#f2f2f7',
                        color: isSelected ? 'var(--color-primary)' : '#1c1c1e', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                      }}
                    >
                      {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>}
                      {opt.label}
                    </button>
                    {isSelected && opt.subType === 'extraction' && (
                      <div style={{ marginTop: '8px', marginLeft: '8px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '12px', color: '#666' }}>Permanent teeth extracted</label>
                            <input type="number" name="extractionPermanentCount" value={formData.extractionPermanentCount} onChange={handleChange} min="0" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#666' }}>Temporary teeth extracted</label>
                            <input type="number" name="extractionTemporaryCount" value={formData.extractionTemporaryCount} onChange={handleChange} min="0" style={{ width: '100%' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    {isSelected && opt.subType === 'fillings' && (
                      <div style={{ marginTop: '8px', marginLeft: '8px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
                          <div><label style={{ fontSize: '12px', color: '#666' }}>Number of teeth</label><input type="number" name="fillingsNumberOfTeeth" value={formData.fillingsNumberOfTeeth} onChange={handleChange} min="0" style={{ width: '100%', minHeight: '40px', boxSizing: 'border-box' }} /></div>
                          <div><label style={{ fontSize: '12px', color: '#666' }}>Glass Ionomer (per surface)</label><input type="number" name="fillingsGlassIonomer" value={formData.fillingsGlassIonomer} onChange={handleChange} min="0" style={{ width: '100%', minHeight: '40px', boxSizing: 'border-box' }} /></div>
                          <div><label style={{ fontSize: '12px', color: '#666' }}>Synthetic Filling (composite) per Surface</label><input type="number" name="fillingsComposite" value={formData.fillingsComposite} onChange={handleChange} min="0" style={{ width: '100%', minHeight: '40px', boxSizing: 'border-box' }} /></div>
                        </div>
                      </div>
                    )}
                    {isSelected && opt.subType === 'temporary_filling' && (
                      <div style={{ marginTop: '8px', marginLeft: '8px', padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <input type="number" name="temporaryFillingSurfaces" value={formData.temporaryFillingSurfaces} onChange={handleChange} min="0" placeholder="0" style={{ width: '100%', maxWidth: '120px', minHeight: '40px', boxSizing: 'border-box' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? 'Saving...' : 'Save Visit'}
          </button>
        </div>
      </form>

      <NavBar />
    </div>
  );
};

export default AddVisit;
