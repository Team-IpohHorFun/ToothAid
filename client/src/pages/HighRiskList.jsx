import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import { getHighRiskVisits } from '../db/indexedDB';

const HighRiskList = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await getHighRiskVisits();
      // Only show Emergency (tier 1) and High (tier 2), exclude Routine (tier 3)
      const urgentOnly = data.filter(v => v.tier <= 2);
      setVisits(urgentOnly);
      setLoading(false);
    };
    
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  // Group visits by tier for display
  const groupedVisits = {
    EMERGENCY: visits.filter(v => v.tier === 1),
    HIGH: visits.filter(v => v.tier === 2),
    ROUTINE: visits.filter(v => v.tier === 3)
  };

  const getTierColor = (tier) => {
    if (tier === 1) return 'var(--color-accent)'; // Emergency
    if (tier === 2) return 'var(--color-warning)'; // High
    return 'var(--color-primary)'; // Routine
  };

  const getTierBadgeStyle = (tier) => {
    const color = getTierColor(tier);
    return {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#fff',
      backgroundColor: color,
      marginRight: '8px',
      textTransform: 'uppercase'
    };
  };

  return (
    <div className="container">
<PageHeader title="High-Risk Cases" subtitle="Emergency and High priority cases" icon="alert" />

      {visits.length === 0 ? (
        <div className="empty-state">
          <p>No visits found</p>
        </div>
      ) : (
        <div>
          {/* Emergency Tier */}
          {groupedVisits.EMERGENCY.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--color-accent)', marginBottom: '12px', fontWeight: 'bold' }}>
                🚨 TIER 1: EMERGENCY ({groupedVisits.EMERGENCY.length})
              </h2>
              {groupedVisits.EMERGENCY.map(visit => (
                <Link key={visit.visitId} to={`/child/${visit.childId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer', marginBottom: '12px', borderLeft: '4px solid var(--color-accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ marginBottom: '8px', flex: 1 }}>
                        {visit.child ? visit.child.fullName : 'Unknown Child'}
                      </h3>
                      <span style={getTierBadgeStyle(1)}>EMERGENCY</span>
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '8px' }}>
                      {formatDate(visit.date)}
                      {visit.createdBy && (
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                          • by {visit.createdBy}
                        </span>
                      )}
                    </p>
                    <div style={{ marginBottom: '8px' }}>
                      {visit.painFlag && <span className="flag-badge pain">Pain</span>}
                      {visit.swellingFlag && <span className="flag-badge swelling">Swelling</span>}
                    </div>
                    {(visit.decayedTeeth !== null || visit.missingTeeth !== null || visit.filledTeeth !== null) && (
                      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                        Decayed: {visit.decayedTeeth !== null ? visit.decayedTeeth : 'N/A'} • 
                        Missing: {visit.missingTeeth !== null ? visit.missingTeeth : 'N/A'} • 
                        Filled: {visit.filledTeeth !== null ? visit.filledTeeth : 'N/A'}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Urgency Score: {visit.urgencyScore}
                    </p>
                    {visit.notes && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--color-muted)' }}>
                        {visit.notes}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* High Tier */}
          {groupedVisits.HIGH.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--color-warning)', marginBottom: '12px', fontWeight: 'bold' }}>
                ⚠️ TIER 2: HIGH ({groupedVisits.HIGH.length})
              </h2>
              {groupedVisits.HIGH.map(visit => (
                <Link key={visit.visitId} to={`/child/${visit.childId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer', marginBottom: '12px', borderLeft: '4px solid var(--color-warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ marginBottom: '8px', flex: 1 }}>
                        {visit.child ? visit.child.fullName : 'Unknown Child'}
                      </h3>
                      <span style={getTierBadgeStyle(2)}>HIGH</span>
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '8px' }}>
                      {formatDate(visit.date)}
                      {visit.createdBy && (
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                          • by {visit.createdBy}
                        </span>
                      )}
                    </p>
                    {(visit.decayedTeeth !== null || visit.missingTeeth !== null || visit.filledTeeth !== null) && (
                      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                        Decayed: {visit.decayedTeeth !== null ? visit.decayedTeeth : 'N/A'} • 
                        Missing: {visit.missingTeeth !== null ? visit.missingTeeth : 'N/A'} • 
                        Filled: {visit.filledTeeth !== null ? visit.filledTeeth : 'N/A'}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Urgency Score: {visit.urgencyScore}
                    </p>
                    {visit.notes && (
                      <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--color-muted)' }}>
                        {visit.notes}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      )}

      <NavBar />
    </div>
  );
};

export default HighRiskList;
