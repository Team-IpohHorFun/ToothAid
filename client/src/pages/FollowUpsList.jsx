import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getFollowUpsDue } from '../db/indexedDB';

const FollowUpsList = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    const loadData = async () => {
      const data = await getFollowUpsDue(daysFilter);
      setVisits(data);
      setLoading(false);
    };
    
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [daysFilter]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    const followUp = new Date(date);
    const diff = Math.ceil((followUp - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Follow-ups Due</h1>
        <p>Children with scheduled follow-ups</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Show follow-ups within:</label>
          <select 
            value={daysFilter} 
            onChange={(e) => setDaysFilter(parseInt(e.target.value))}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="empty-state">
          <p>No follow-ups due in the next {daysFilter} days</p>
        </div>
      ) : (
        <div>
          {visits.map(visit => {
            const daysUntil = getDaysUntil(visit.followUpDate);
            return (
              <Link key={visit.visitId} to={`/child/${visit.childId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <h3 style={{ marginBottom: '8px' }}>
                    {visit.child ? visit.child.fullName : 'Unknown Child'}
                  </h3>
                  <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '4px' }}>
                    Follow-up: {formatDate(visit.followUpDate)}
                    {visit.createdBy && (
                      <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                        • by {visit.createdBy}
                      </span>
                    )}
                  </p>
                  <p style={{ 
                    color: daysUntil <= 7 ? 'var(--color-accent)' : 'var(--color-muted)', 
                    fontSize: '14px',
                    fontWeight: daysUntil <= 7 ? '600' : 'normal'
                  }}>
                    {daysUntil === 0 ? 'Due today' : 
                     daysUntil === 1 ? 'Due tomorrow' :
                     daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                     `${daysUntil} days remaining`}
                  </p>
                  {visit.notes && (
                    <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--color-muted)' }}>
                      {visit.notes}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default FollowUpsList;
