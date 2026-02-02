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
        // Get high-risk cases (only Emergency and High, not Routine)
        const highRisk = await getHighRiskVisits();
        const urgentCases = highRisk.filter(v => v.tier <= 2); // tier 1 = Emergency, tier 2 = High
        setHighRiskCount(urgentCases.length);

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
      <div style={{ 
        background: '#0D9488',
        padding: '28px 24px',
        marginBottom: '20px',
        marginLeft: '-16px',
        marginRight: '-16px',
        marginTop: '-16px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '90px'
      }}>
        {/* Content */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ 
              color: 'white', 
              fontSize: '26px', 
              fontWeight: '700',
              margin: '0 0 6px 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              ToothAid
            </h1>
            <p style={{ 
              color: 'rgba(255,255,255,0.85)', 
              margin: 0, 
              fontSize: '15px',
              fontWeight: '400'
            }}>
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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

        {/* Action Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {/* Add Visit */}
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--color-primary)',
              borderRadius: '12px',
              padding: '16px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
            }}>
              <svg viewBox="0 0 24 24" fill="white" style={{ width: '28px', height: '28px', marginBottom: '6px' }}>
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              <div style={{
                color: 'white',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Add Visit
              </div>
            </div>
          </Link>

          {/* Find Child */}
          <Link to="/search" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '16px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}>
              <svg viewBox="0 0 24 24" fill="#495057" style={{ width: '28px', height: '28px', marginBottom: '6px' }}>
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <div style={{
                color: '#495057',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                Find Child
              </div>
            </div>
          </Link>

          {/* Register Child */}
          <Link to="/search?register=true" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '16px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}>
              <svg viewBox="0 0 24 24" fill="#495057" style={{ width: '28px', height: '28px', marginBottom: '6px' }}>
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <div style={{
                color: '#495057',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                New Child
              </div>
            </div>
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
