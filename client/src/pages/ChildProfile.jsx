import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getChild, getVisitsByChild } from '../db/indexedDB';

const ChildProfile = ({ token }) => {
  const { childId } = useParams();
  const [child, setChild] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const childData = await getChild(childId);
      const visitsData = await getVisitsByChild(childId);
      
      setChild(childData);
      setVisits(visitsData);
      setLoading(false);
    };
    
    loadData();
  }, [childId]);

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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>{child.fullName}</h1>
        <p>{child.school} • {child.barangay}</p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Child Information</h2>
        <p><strong>Name:</strong> {child.fullName}</p>
        <p><strong>Sex:</strong> {child.sex}</p>
        {child.dob && <p><strong>Date of Birth:</strong> {formatDate(child.dob)}</p>}
        {child.age && <p><strong>Age:</strong> {child.age} years</p>}
        <p><strong>School:</strong> {child.school}</p>
        {child.grade && <p><strong>Grade:</strong> {child.grade}</p>}
        <p><strong>Barangay:</strong> {child.barangay}</p>
        {child.guardianPhone && <p><strong>Guardian Phone:</strong> {child.guardianPhone}</p>}
        {child.createdBy && (
          <p style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '12px', color: '#666' }}>
            <strong>Registered by:</strong> {child.createdBy}
            {child.updatedBy && child.updatedBy !== child.createdBy && (
              <span> • <strong>Last updated by:</strong> {child.updatedBy}</span>
            )}
          </p>
        )}
      </div>

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
              <div key={visit.visitId} className="timeline-item">
                <div className="timeline-date">
                  {formatDate(visit.date)}
                  {visit.createdBy && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666' }}>
                      by {visit.createdBy}
                    </span>
                  )}
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
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
};

export default ChildProfile;
