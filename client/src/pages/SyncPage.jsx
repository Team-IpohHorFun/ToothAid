import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import PageHeader from '../components/PageHeader';
import { getOutboxOps, getLastSyncAt, performSync } from '../db/indexedDB';

const SyncPage = ({ token, setToken }) => {
  const navigate = useNavigate();
  const [pendingOps, setPendingOps] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const loadData = async () => {
      const ops = await getOutboxOps();
      const syncTime = await getLastSyncAt();
      setPendingOps(ops);
      setLastSync(syncTime);
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      setSyncResult({ success: false, error: 'Device is offline' });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await performSync(token);
      setSyncResult(result);
      
      // Reload data
      const ops = await getOutboxOps();
      const syncTime = await getLastSyncAt();
      setPendingOps(ops);
      setLastSync(syncTime);
      
      // If deletions occurred, reload the page after a short delay to refresh UI
      if (result.success && result.deletedCount > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setSyncResult({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Never';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <div className="container">
<PageHeader title="Sync" subtitle="Synchronize data with server" icon="sync" />

      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Sync Status</h2>
        <p><strong>Connection:</strong> {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
        <p><strong>Last Sync:</strong> {formatDate(lastSync)}</p>
        <p><strong>Pending Operations:</strong> {pendingOps.length}</p>
      </div>

      {pendingOps.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Pending Operations</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {pendingOps.map(op => (
              <div key={op.opId} style={{ 
                padding: '8px', 
                marginBottom: '8px', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <strong>{op.action}</strong> - {op.entityId}
                <br />
                <span style={{ color: '#666' }}>{formatDate(op.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSync}
        className="btn btn-primary btn-block"
        disabled={syncing || !isOnline}
        style={{ marginTop: '16px' }}
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {syncResult && (
        <div className={`alert ${syncResult.success ? 'alert-info' : 'alert-danger'}`}>
          {syncResult.success ? (
            <p>✅ {syncResult.message || 'Sync completed successfully!'}</p>
          ) : (
            <p>❌ Sync failed: {syncResult.error}</p>
          )}
        </div>
      )}

      {!isOnline && (
        <div className="alert alert-warning">
          <p>⚠️ You are currently offline. Sync will be available when connection is restored.</p>
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default SyncPage;
