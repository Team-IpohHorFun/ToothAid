import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getHighRiskVisits, getOutboxOps, getAllChildren, getManualVisits } from '../db/indexedDB';

const Home = ({ setToken }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    highRiskCount: 0,
    pendingOps: 0,
    totalChildren: 0,
    totalVisits: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [highRisk, outbox, children, visits] = await Promise.all([
          getHighRiskVisits(),
          getOutboxOps(),
          getAllChildren(),
          getManualVisits()
        ]);
        
        setStats({
          highRiskCount: highRisk.length,
          pendingOps: outbox.length,
          totalChildren: children.length,
          totalVisits: visits.length
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading stats:', error);
        setLoading(false);
      }
    };
    
    loadCounts();
    const interval = setInterval(loadCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const username = localStorage.getItem('username') || 'User';

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
      {/* Welcome Header */}
      <div className="page-header" style={{ 
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
        color: 'white',
        marginBottom: '16px'
      }}>
        <div>
          <h1 style={{ color: 'white', marginBottom: '4px', fontSize: '24px' }}>ToothAid</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '14px' }}>
            Dental Data & Impact Monitoring
          </p>
        </div>
      </div>

      {/* User Info & Logout */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        padding: '0 4px'
      }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', margin: 0 }}>
          Logged in as <strong>{username}</strong>
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            setToken(null);
            navigate('/login');
          }}
          className="btn btn-secondary"
          style={{ 
            padding: '10px 14px',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)' }}>
          <div className="stat-value">{stats.highRiskCount}</div>
          <div className="stat-label">High-Risk</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-hover) 100%)' }}>
          <div className="stat-value">{stats.totalChildren}</div>
          <div className="stat-label">Children</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)' }}>
          <div className="stat-value">{stats.totalVisits}</div>
          <div className="stat-label">Visits</div>
        </div>
      </div>

      {/* Quick Actions */}
      {stats.highRiskCount > 0 && (
        <div className="card" style={{ 
          borderLeft: '4px solid var(--color-accent)',
          marginBottom: '16px'
        }}>
          <Link to="/high-risk" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '4px', color: 'var(--color-accent)' }}>
                  High-Risk Cases
                </h3>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '14px' }}>
                  {stats.highRiskCount} {stats.highRiskCount === 1 ? 'case' : 'cases'} need attention
                </p>
              </div>
              <div style={{ fontSize: '24px' }}>→</div>
            </div>
          </Link>
        </div>
      )}

      {/* Sync Alert */}
      {stats.pendingOps > 0 && (
        <div className="card" style={{ 
          background: 'var(--color-warning-soft)',
          border: '1px solid rgba(245, 158, 11, 0.55)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: '#92400E' }}>
                {stats.pendingOps} pending {stats.pendingOps === 1 ? 'operation' : 'operations'}
              </strong>
              <p style={{ margin: '4px 0 0 0', color: '#92400E', fontSize: '14px' }}>
                Sync to save your changes
              </p>
            </div>
            <Link to="/sync" className="btn btn-primary" style={{
              padding: '10px 16px',
              fontSize: '14px'
            }}>
              Sync Now
            </Link>
          </div>
        </div>
      )}

      {/* All Clear Message */}
      {stats.highRiskCount === 0 && stats.pendingOps === 0 && (
        <div className="card" style={{ 
          textAlign: 'center',
          background: 'var(--color-success-soft)',
          border: '1px solid rgba(16, 185, 129, 0.55)'
        }}>
          <h3 style={{ margin: 0, marginBottom: '4px', color: 'var(--color-success-hover)' }}>All Clear!</h3>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '14px' }}>
            No urgent items requiring attention
          </p>
        </div>
      )}


      <NavBar />
    </div>
  );
};

export default Home;
