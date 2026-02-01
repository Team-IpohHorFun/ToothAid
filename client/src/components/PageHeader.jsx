const PageHeader = ({ title, subtitle, icon }) => {
  // Icon components for different page types
  const icons = {
    children: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <circle cx="17" cy="10" r="3" />
        <path d="M21 21v-1.5a3 3 0 0 0-3-3h-1" />
      </svg>
    ),
    visit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="9" y1="6" x2="15" y2="6" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="12" y2="14" />
        <circle cx="15" cy="17" r="3" />
        <path d="M15 15.5v1.5l1 1" />
      </svg>
    ),
    reports: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="8" width="7" height="13" rx="1" />
        <rect x="14" y="3" width="7" height="3" rx="1" />
      </svg>
    ),
    sync: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M21 12a9 9 0 0 1-9 9m0 0a9 9 0 0 1-9-9m9 9v-4m0 4h4M3 12a9 9 0 0 1 9-9m0 0a9 9 0 0 1 9 9m-9-9v4m0-4H8" />
      </svg>
    ),
    clinic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="8" y2="18.01" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <circle cx="12" cy="8" r="5" />
        <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    roster: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="2" width="6" height="5" rx="1" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    ),
    tooth: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M12 2C9.5 2 7 3 6 5C5 7 5 9 5.5 11C6 13 6.5 15 7 17C7.5 19 8 21 9 22C9.5 22.5 10.5 22.5 11 21C11.5 19.5 12 18 12 18C12 18 12.5 19.5 13 21C13.5 22.5 14.5 22.5 15 22C16 21 16.5 19 17 17C17.5 15 18 13 18.5 11C19 9 19 7 18 5C17 3 14.5 2 12 2Z" />
      </svg>
    )
  };

  const selectedIcon = icons[icon] || icons.tooth;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
      padding: '28px 24px',
      marginBottom: '20px',
      marginLeft: '-16px',
      marginRight: '-16px',
      marginTop: '-16px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '90px'
    }}>
      {/* Background decorative icon */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'rgba(255, 255, 255, 0.15)',
        pointerEvents: 'none'
      }}>
        {selectedIcon}
      </div>
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{
          color: 'white',
          fontSize: '26px',
          fontWeight: '700',
          margin: '0 0 6px 0',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '15px',
            margin: 0,
            fontWeight: '400'
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
