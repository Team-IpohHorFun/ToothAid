import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { 
  getChild, 
  getVisitsByChild, 
  upsertChild, 
  deleteChild, 
  updateVisit, 
  deleteVisit, 
  addToOutbox, 
  performSync 
} from '../db/indexedDB';
import { getAgeFromDOB } from '../utils/age';

const ChildProfile = ({ token }) => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit child state
  const [isEditingChild, setIsEditingChild] = useState(false);
  const [childFormData, setChildFormData] = useState({});
  const [savingChild, setSavingChild] = useState(false);
  
  // Delete child confirmation
  const [showDeleteChildConfirm, setShowDeleteChildConfirm] = useState(false);
  const [deletingChild, setDeletingChild] = useState(false);
  
  // Edit visit state
  const [editingVisitId, setEditingVisitId] = useState(null);
  const [visitFormData, setVisitFormData] = useState({});
  const [savingVisit, setSavingVisit] = useState(false);
  
  // Delete visit confirmation
  const [deleteVisitId, setDeleteVisitId] = useState(null);
  const [deletingVisit, setDeletingVisit] = useState(false);
  
  // Error state
  const [error, setError] = useState('');

  const treatmentOptions = [
    'Cleaning', 'Fluoride', 'Filling', 'Extraction', 'Sealant', 'SDF', 'Other'
  ];

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    const childData = await getChild(childId);
    const visitsData = await getVisitsByChild(childId);
    
    setChild(childData);
    setVisits(visitsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setLoading(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // ===== CHILD EDIT HANDLERS =====
  const startEditingChild = () => {
    setChildFormData({
      fullName: child.fullName || '',
      dob: formatDateForInput(child.dob),
      age: child.age || '',
      sex: child.sex || '',
      school: child.school || '',
      grade: child.grade || '',
      barangay: child.barangay || '',
      guardianPhone: child.guardianPhone || '',
      notes: child.notes || ''
    });
    setIsEditingChild(true);
    setError('');
  };

  const handleChildFormChange = (e) => {
    const { name, value } = e.target;
    setChildFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChild = async (e) => {
    e.preventDefault();
    setError('');
    setSavingChild(true);

    try {
      const username = localStorage.getItem('username') || 'unknown';
      const now = new Date().toISOString();
      
      // When DOB is set, store age as null so age is always computed from DOB (updates over time)
      const updatedChild = {
        ...child,
        fullName: childFormData.fullName.trim(),
        dob: childFormData.dob || null,
        age: childFormData.dob ? null : (childFormData.age ? parseInt(childFormData.age) : null),
        sex: childFormData.sex,
        school: childFormData.school.trim(),
        grade: childFormData.grade.trim() || null,
        barangay: childFormData.barangay.trim(),
        guardianPhone: childFormData.guardianPhone.trim() || null,
        notes: childFormData.notes.trim() || null,
        updatedBy: username,
        updatedAt: now
      };

      await upsertChild(updatedChild);
      await addToOutbox('UPSERT_CHILD', childId, updatedChild);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed:', syncError);
        }
      }

      setChild(updatedChild);
      setIsEditingChild(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingChild(false);
    }
  };

  // ===== CHILD DELETE HANDLERS =====
  const handleDeleteChild = async () => {
    setDeletingChild(true);
    setError('');

    try {
      await deleteChild(childId);
      await addToOutbox('DELETE_CHILD', childId, { childId });

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed:', syncError);
        }
      }

      navigate('/search');
    } catch (err) {
      setError(err.message);
      setDeletingChild(false);
    }
  };

  // ===== VISIT EDIT HANDLERS =====
  const startEditingVisit = (visit) => {
    setVisitFormData({
      date: formatDateForInput(visit.date),
      type: visit.type || 'SCREENING',
      painFlag: visit.painFlag || false,
      swellingFlag: visit.swellingFlag || false,
      decayedTeeth: visit.decayedTeeth !== null ? visit.decayedTeeth : '',
      missingTeeth: visit.missingTeeth !== null ? visit.missingTeeth : '',
      filledTeeth: visit.filledTeeth !== null ? visit.filledTeeth : '',
      treatmentTypes: visit.treatmentTypes || [],
      notes: visit.notes || ''
    });
    setEditingVisitId(visit.visitId);
    setError('');
  };

  const handleVisitFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'painFlag' || name === 'swellingFlag') {
        setVisitFormData(prev => ({ ...prev, [name]: checked }));
      } else {
        // Treatment type checkbox
        setVisitFormData(prev => ({
          ...prev,
          treatmentTypes: checked
            ? [...prev.treatmentTypes, value]
            : prev.treatmentTypes.filter(t => t !== value)
        }));
      }
    } else {
      setVisitFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    setError('');
    setSavingVisit(true);

    try {
      const originalVisit = visits.find(v => v.visitId === editingVisitId);
      const username = localStorage.getItem('username') || 'unknown';
      
      const updatedVisit = {
        ...originalVisit,
        date: new Date(visitFormData.date).toISOString(),
        type: visitFormData.type,
        painFlag: visitFormData.painFlag,
        swellingFlag: visitFormData.swellingFlag,
        decayedTeeth: visitFormData.decayedTeeth !== '' ? parseInt(visitFormData.decayedTeeth) : null,
        missingTeeth: visitFormData.missingTeeth !== '' ? parseInt(visitFormData.missingTeeth) : null,
        filledTeeth: visitFormData.filledTeeth !== '' ? parseInt(visitFormData.filledTeeth) : null,
        treatmentTypes: visitFormData.treatmentTypes,
        notes: visitFormData.notes.trim() || null,
        updatedBy: username,
        updatedAt: new Date().toISOString()
      };

      await updateVisit(updatedVisit);
      await addToOutbox('UPDATE_VISIT', editingVisitId, updatedVisit);

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed:', syncError);
        }
      }

      await loadData();
      setEditingVisitId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingVisit(false);
    }
  };

  // ===== VISIT DELETE HANDLERS =====
  const handleDeleteVisit = async () => {
    setDeletingVisit(true);
    setError('');

    try {
      await deleteVisit(deleteVisitId);
      await addToOutbox('DELETE_VISIT', deleteVisitId, { visitId: deleteVisitId });

      // Try to sync if online
      if (navigator.onLine && token) {
        try {
          await performSync(token);
        } catch (syncError) {
          console.error('Sync failed:', syncError);
        }
      }

      await loadData();
      setDeleteVisitId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingVisit(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="container">
        <div className="empty-state">Child not found</div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="container">
<PageHeader title={child.fullName} subtitle={`${child.school} • ${child.barangay}`} icon="profile" />

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ===== CHILD INFORMATION CARD ===== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Child Information</h2>
          {!isEditingChild && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={startEditingChild} 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Edit
              </button>
              <button 
                onClick={() => setShowDeleteChildConfirm(true)} 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px',
                  background: 'rgba(249, 115, 22, 0.15)',
                  color: '#f97316',
                  border: '1px solid #f97316',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isEditingChild ? (
          <form onSubmit={handleSaveChild}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={childFormData.fullName}
                onChange={handleChildFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <DateInput
                name="dob"
                value={childFormData.dob}
                onChange={handleChildFormChange}
                placeholder="MM/DD/YYYY"
              />
            </div>

            {childFormData.dob ? (
              <div className="form-group">
                <label>Age (from date of birth)</label>
                <p style={{ margin: 0, color: '#555' }}>
                  {getAgeFromDOB(childFormData.dob) != null ? `${getAgeFromDOB(childFormData.dob)} years` : '—'}
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label>Age (if DOB unknown)</label>
                <input
                  type="number"
                  name="age"
                  value={childFormData.age}
                  onChange={handleChildFormChange}
                  min="0"
                  max="18"
                />
              </div>
            )}

            <div className="form-group">
              <label>Sex *</label>
              <select name="sex" value={childFormData.sex} onChange={handleChildFormChange} required>
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
                value={childFormData.school}
                onChange={handleChildFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Grade</label>
              <select name="grade" value={childFormData.grade} onChange={handleChildFormChange}>
                <option value="">Select Grade</option>
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
                value={childFormData.barangay}
                onChange={handleChildFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Guardian Phone</label>
              <input
                type="tel"
                name="guardianPhone"
                value={childFormData.guardianPhone}
                onChange={handleChildFormChange}
                placeholder="09123456789"
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                name="notes"
                value={childFormData.notes}
                onChange={handleChildFormChange}
                rows="3"
                placeholder="Any notes about this child..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={savingChild}
                style={{ flex: 1 }}
              >
                {savingChild ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setIsEditingChild(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p><strong>Name:</strong> {child.fullName}</p>
            <p><strong>Sex:</strong> {child.sex}</p>
            {child.dob && <p><strong>Date of Birth:</strong> {formatDate(child.dob)}</p>}
            {(getAgeFromDOB(child.dob) != null || child.age != null) && (
              <p><strong>Age:</strong> {getAgeFromDOB(child.dob) ?? child.age} years</p>
            )}
            <p><strong>School:</strong> {child.school}</p>
            {child.grade && <p><strong>Grade:</strong> {child.grade}</p>}
            <p><strong>Barangay:</strong> {child.barangay}</p>
            {child.guardianPhone && <p><strong>Guardian Phone:</strong> {child.guardianPhone}</p>}
            {child.notes && (
              <p><strong>Notes:</strong>{' '}<span style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{child.notes}</span></p>
            )}
            {child.createdBy && (
              <p style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '12px', color: '#666' }}>
                <strong>Registered by:</strong> {child.createdBy}
                {child.updatedBy && child.updatedBy !== child.createdBy && (
                  <span> • <strong>Last updated by:</strong> {child.updatedBy}</span>
                )}
              </p>
            )}
          </>
        )}
      </div>

      {/* ===== DELETE CHILD CONFIRMATION MODAL ===== */}
      {showDeleteChildConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '16px', fontSize: '18px' }}>Delete Child?</h3>
            <p style={{ marginBottom: '8px', fontSize: '16px' }}>
              Are you sure you want to delete <strong>{child.fullName}</strong>?
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--color-accent)', fontSize: '16px' }}>
              This will also delete all {visits.length} visit record(s) for this child. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleDeleteChild}
                disabled={deletingChild}
                style={{ 
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {deletingChild ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button 
                onClick={() => setShowDeleteChildConfirm(false)}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VISIT HISTORY CARD ===== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Visit History</h2>
          <Link to={`/child/${childId}/visit`} className="btn btn-primary">
            Add Visit
          </Link>
        </div>

        {visits.length === 0 ? (
          <div className="empty-state">
            <p>No visits recorded yet</p>
          </div>
        ) : (
          <div className="timeline">
            {visits.map(visit => (
              <div key={visit.visitId} className="timeline-item" style={{ position: 'relative' }}>
                {editingVisitId === visit.visitId ? (
                  // ===== EDIT VISIT FORM =====
                  <form onSubmit={handleSaveVisit}>
                    <div className="form-group">
                      <label>Date *</label>
                      <DateInput
                        name="date"
                        value={visitFormData.date}
                        onChange={handleVisitFormChange}
                        required
                        placeholder="MM/DD/YYYY"
                      />
                    </div>

                    <div className="form-group">
                      <label>Visit Type *</label>
                      <select name="type" value={visitFormData.type} onChange={handleVisitFormChange} required>
                        <option value="SCREENING">Screening</option>
                        <option value="TREATMENT">Treatment</option>
                        <option value="FOLLOWUP">Follow-up</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Flags</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setVisitFormData(prev => ({ ...prev, painFlag: !prev.painFlag }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: visitFormData.painFlag ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                            background: visitFormData.painFlag ? 'var(--color-primary-soft)' : '#f2f2f7',
                            color: visitFormData.painFlag ? 'var(--color-primary)' : '#1c1c1e',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {visitFormData.painFlag && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          Pain
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisitFormData(prev => ({ ...prev, swellingFlag: !prev.swellingFlag }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 18px',
                            borderRadius: '12px',
                            border: visitFormData.swellingFlag ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                            background: visitFormData.swellingFlag ? 'var(--color-primary-soft)' : '#f2f2f7',
                            color: visitFormData.swellingFlag ? 'var(--color-primary)' : '#1c1c1e',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {visitFormData.swellingFlag && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          Swelling
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div className="form-group">
                        <label>Decayed</label>
                        <input
                          type="number"
                          name="decayedTeeth"
                          value={visitFormData.decayedTeeth}
                          onChange={handleVisitFormChange}
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Missing</label>
                        <input
                          type="number"
                          name="missingTeeth"
                          value={visitFormData.missingTeeth}
                          onChange={handleVisitFormChange}
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Filled</label>
                        <input
                          type="number"
                          name="filledTeeth"
                          value={visitFormData.filledTeeth}
                          onChange={handleVisitFormChange}
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Treatment Types</label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {treatmentOptions.map(option => {
                          const isSelected = visitFormData.treatmentTypes.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setVisitFormData(prev => ({
                                  ...prev,
                                  treatmentTypes: isSelected
                                    ? prev.treatmentTypes.filter(t => t !== option)
                                    : [...prev.treatmentTypes, option]
                                }));
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 18px',
                                borderRadius: '12px',
                                border: isSelected ? '2px solid var(--color-primary)' : '2px solid #e5e5ea',
                                background: isSelected ? 'var(--color-primary-soft)' : '#f2f2f7',
                                color: isSelected ? 'var(--color-primary)' : '#1c1c1e',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSelected && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        name="notes"
                        value={visitFormData.notes}
                        onChange={handleVisitFormChange}
                        rows="2"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={savingVisit}
                        style={{ flex: 1 }}
                      >
                        {savingVisit ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setEditingVisitId(null)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // ===== VISIT DISPLAY =====
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="timeline-date">
                        {formatDate(visit.date)}
                        {visit.createdBy && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                            by {visit.createdBy}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => startEditingVisit(visit)}
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '11px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteVisitId(visit.visitId)}
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '11px',
                            background: 'rgba(249, 115, 22, 0.15)',
                            border: '1px solid #f97316',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: '#f97316',
                            fontWeight: '500'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <span className={`timeline-type ${visit.type}`}>{visit.type}</span>
                    
                    {(visit.painFlag || visit.swellingFlag) && (
                      <div style={{ marginTop: '8px' }}>
                        {visit.painFlag && <span className="flag-badge pain">Pain</span>}
                        {visit.swellingFlag && <span className="flag-badge swelling">Swelling</span>}
                      </div>
                    )}

                    {(() => {
                      const parts = [];
                      if (typeof visit.decayedTeeth === 'number') {
                        parts.push(`Decayed: ${visit.decayedTeeth}`);
                      }
                      if (typeof visit.missingTeeth === 'number') {
                        parts.push(`Missing: ${visit.missingTeeth}`);
                      }
                      if (typeof visit.filledTeeth === 'number') {
                        parts.push(`Filled: ${visit.filledTeeth}`);
                      }
                      return parts.length > 0 ? (
                        <p style={{ marginTop: '8px', fontSize: '14px' }}>
                          {parts.join(' • ')}
                        </p>
                      ) : null;
                    })()}

                    {visit.treatmentTypes && visit.treatmentTypes.length > 0 && (
                      <p style={{ marginTop: '8px', fontSize: '14px' }}>
                        <strong>Treatments:</strong> {visit.treatmentTypes.join(', ')}
                      </p>
                    )}

                    {visit.notes && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                        {visit.notes}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== DELETE VISIT CONFIRMATION MODAL ===== */}
      {deleteVisitId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '16px', fontSize: '18px' }}>Delete Visit?</h3>
            <p style={{ marginBottom: '16px', fontSize: '16px' }}>
              Are you sure you want to delete this visit record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleDeleteVisit}
                disabled={deletingVisit}
                style={{ 
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {deletingVisit ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button 
                onClick={() => setDeleteVisitId(null)}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default ChildProfile;
