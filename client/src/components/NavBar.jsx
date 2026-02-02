import { Link, useLocation } from 'react-router-dom';

const NavBar = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="nav-bar">
      <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
        <span>Today</span>
      </Link>
      <Link to="/search" className={`nav-item ${isActive('/search') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="7" r="3" />
          <path d="M9 12c-3.5 0-6 1.5-6 3v2h12v-2c0-1.5-2.5-3-6-3z" />
          <circle cx="17" cy="7" r="2.5" />
          <path d="M17 11c1.5 0 4 .8 4 2v2h-4" />
        </svg>
        <span>Children</span>
      </Link>
      <Link to="/register" className={`nav-item ${isActive('/register') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
        <span>Visit</span>
      </Link>
      <Link to="/clinic-days" className={`nav-item ${isActive('/clinic-days') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="6" y="13" width="4" height="4" rx="0.5" />
        </svg>
        <span>Clinic</span>
      </Link>
      <Link to="/graphs" className={`nav-item ${isActive('/graphs') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" />
          <path d="M7 16v-4" strokeLinecap="round" />
          <path d="M11 16v-7" strokeLinecap="round" />
          <path d="M15 16v-5" strokeLinecap="round" />
          <path d="M19 16v-9" strokeLinecap="round" />
        </svg>
        <span>Reports</span>
      </Link>
      <Link to="/sync" className={`nav-item ${isActive('/sync') ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 12c0-4.4 3.6-8 8-8 2.8 0 5.2 1.4 6.6 3.5" />
          <path d="M20 12c0 4.4-3.6 8-8 8-2.8 0-5.2-1.4-6.6-3.5" />
          <path d="M16 4l3 3.5-3.5 3" />
          <path d="M8 20l-3-3.5 3.5-3" />
        </svg>
        <span>Sync</span>
      </Link>
    </nav>
  );
};

export default NavBar;
