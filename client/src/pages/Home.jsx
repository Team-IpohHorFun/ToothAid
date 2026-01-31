import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getHighRiskVisits, getOutboxOps, getAllClinicDays, getAppointmentCountForClinicDay } from '../db/indexedDB';

const Home = ({ setToken }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [todayClinic, setTodayClinic] = useState(null); // { clinicDayId, school, capacity, scheduled }
  const [pendingOps, setPendingOps] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get high-risk cases
        const highRisk = await getHighRiskVisits();
        setHighRiskCount(highRisk.length);

        // Get pending operations
        const outbox = await getOutboxOps();
        setPendingOps(outbox.length);

        // Find today's clinic day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const allClinicDays = await getAllClinicDays();
        const todayClinicDay = allClinicDays.find(day => {
          const clinicDate = new Date(day.date);
          clinicDate.setHours(0, 0, 0, 0);
          return clinicDate.toISOString().split('T')[0] === todayStr;
        });

        if (todayClinicDay) {
          const scheduledCount = await getAppointmentCountForClinicDay(todayClinicDay.clinicDayId, 'SCHEDULED');
          const attendedCount = await getAppointmentCountForClinicDay(todayClinicDay.clinicDayId, 'ATTENDED');
          setTodayClinic({
            clinicDayId: todayClinicDay.clinicDayId,
            school: todayClinicDay.school,
            capacity: todayClinicDay.capacity,
            scheduled: scheduledCount + attendedCount
          });
        } else {
          setTodayClinic(null);
        }

        // Get last sync time from localStorage
        const syncTime = localStorage.getItem('lastSyncTime');
        if (syncTime) {
          setLastSyncTime(new Date(syncTime));
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading home data:', error);
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const username = localStorage.getItem('username') || 'User';

  const formatLastSync = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
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
      {/* Welcome Header */}
      <div className="page-header" style={{ 
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
        color: 'white',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', marginBottom: '4px', fontSize: '24px' }}>ToothAid</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '14px' }}>
              Welcome back, {username}
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('username');
              setToken(null);
              navigate('/login');
            }}
            style={{ 
              padding: '8px 14px',
              fontSize: '13px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 'var(--radius-btn)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Today's Priorities Section */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: 'var(--color-muted)', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingLeft: '4px'
        }}>
          Today's Priorities
        </h2>

        {/* Priority Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* High-Risk Cases Card */}
          <Link to="/high-risk" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ 
              borderLeft: `4px solid ${highRiskCount > 0 ? 'var(--color-accent)' : 'var(--color-success)'}`,
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: highRiskCount > 0 ? 'var(--color-accent-soft)' : 'var(--color-success-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {highRiskCount > 0 ? '⚠️' : '✓'}
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      marginBottom: '2px', 
                      fontSize: '16px',
                      color: highRiskCount > 0 ? 'var(--color-accent)' : 'var(--color-success)'
                    }}>
                      High-Risk Cases
                    </h3>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '14px' }}>
                      {highRiskCount > 0 
                        ? `${highRiskCount} ${highRiskCount === 1 ? 'case needs' : 'cases need'} attention`
                        : 'No urgent cases'
                      }
                    </p>
                  </div>
                </div>
                <div style={{ color: 'var(--color-muted)', fontSize: '20px' }}>›</div>
              </div>
            </div>
          </Link>

          {/* Today's Clinic Card */}
          <Link 
            to={todayClinic ? `/clinic-days/${todayClinic.clinicDayId}/roster` : '/clinic-days'} 
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card" style={{ 
              borderLeft: `4px solid ${todayClinic ? 'var(--color-primary)' : 'var(--color-muted)'}`,
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: todayClinic ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    📋
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      marginBottom: '2px', 
                      fontSize: '16px',
                      color: todayClinic ? 'var(--color-primary)' : 'var(--color-muted)'
                    }}>
                      {todayClinic ? todayClinic.school : "Today's Clinic"}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '14px' }}>
                      {todayClinic 
                        ? `${todayClinic.scheduled} / ${todayClinic.capacity} scheduled`
                        : 'No clinic scheduled today'
                      }
                    </p>
                  </div>
                </div>
                <div style={{ color: 'var(--color-muted)', fontSize: '20px' }}>›</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: 'var(--color-muted)', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingLeft: '4px'
        }}>
          Quick Actions
        </h2>

        {/* Primary Action - Add Visit */}
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <button 
            className="btn btn-primary btn-block"
            style={{ 
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: '600',
              height: '52px'
            }}
          >
            + Add Visit
          </button>
        </Link>

        {/* Secondary Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Link to="/search" style={{ textDecoration: 'none' }}>
            <button 
              className="btn btn-secondary btn-block"
              style={{ 
                margin: 0,
                fontSize: '14px',
                height: '46px'
              }}
            >
              Find Child
            </button>
          </Link>
          <Link to="/search" style={{ textDecoration: 'none' }}>
            <button 
              className="btn btn-secondary btn-block"
              style={{ 
                margin: 0,
                fontSize: '14px',
                height: '46px'
              }}
            >
              Register Child
            </button>
          </Link>
        </div>
      </div>

      {/* Pending Sync Alert */}
      {pendingOps > 0 && (
        <Link to="/sync" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ 
            background: 'var(--color-warning-soft)',
            border: '1px solid rgba(245, 158, 11, 0.55)',
            marginBottom: '16px',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: '#92400E' }}>
                  {pendingOps} unsaved {pendingOps === 1 ? 'change' : 'changes'}
                </strong>
                <p style={{ margin: '2px 0 0 0', color: '#92400E', fontSize: '13px' }}>
                  Tap to sync now
                </p>
              </div>
              <div style={{ 
                background: 'var(--color-warning)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 'var(--radius-btn)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Sync
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Status Strip */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-btn)',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isOnline ? 'var(--color-success)' : 'var(--color-muted)'
        }} />
        <span style={{ 
          fontSize: '13px', 
          color: 'var(--color-muted)'
        }}>
          {isOnline ? (
            lastSyncTime ? `Online · Last sync ${formatLastSync(lastSyncTime)}` : 'Online'
          ) : (
            'Offline — data saved locally'
          )}
        </span>
      </div>

      <NavBar />
    </div>
  );
};

export default Home;
