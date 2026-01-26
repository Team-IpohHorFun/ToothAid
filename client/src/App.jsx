import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import SearchChild from './pages/SearchChild';
import RegisterChild from './pages/RegisterChild';
import ChildProfile from './pages/ChildProfile';
import AddVisit from './pages/AddVisit';
import HighRiskList from './pages/HighRiskList';
import FollowUpsList from './pages/FollowUpsList';
import Graphs from './pages/Graphs';
import SyncPage from './pages/SyncPage';
import ClinicDaysList from './pages/ClinicDaysList';
import CreateClinicDay from './pages/CreateClinicDay';
import BuildRoster from './pages/BuildRoster';
import ClinicDayRoster from './pages/ClinicDayRoster';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  return (
    <BrowserRouter>
      <div className="app">
        {!isOnline && (
          <div className="offline-banner">
            ⚠️ Offline Mode - Changes will sync when online
          </div>
        )}
        <Routes>
          <Route 
            path="/login" 
            element={<Login setToken={setToken} />} 
          />
          <Route 
            path="/" 
            element={token ? <Home setToken={setToken} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/search" 
            element={token ? <SearchChild /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/register" 
            element={token ? <RegisterChild token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/child/:childId" 
            element={token ? <ChildProfile token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/child/:childId/visit" 
            element={token ? <AddVisit token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/high-risk" 
            element={token ? <HighRiskList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/follow-ups" 
            element={token ? <FollowUpsList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/graphs" 
            element={token ? <Graphs /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/clinic-days" 
            element={token ? <ClinicDaysList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/create-clinic-day" 
            element={token ? <CreateClinicDay token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/clinic-days/:clinicDayId/build-roster" 
            element={token ? <BuildRoster token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/clinic-days/:clinicDayId/roster" 
            element={token ? <ClinicDayRoster token={token} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sync" 
            element={token ? <SyncPage token={token} setToken={setToken} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
