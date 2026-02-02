const PageHeader = ({ title, subtitle, icon }) => {
  // Outline icon components matching NavBar icons
  const icons = {
    children: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <circle cx="9" cy="7" r="3" />
        <path d="M9 12c-3.5 0-6 1.5-6 3v2h12v-2c0-1.5-2.5-3-6-3z" />
        <circle cx="17" cy="7" r="2.5" />
        <path d="M17 11c1.5 0 4 .8 4 2v2h-4" />
      </svg>
    ),
    visit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    ),
    reports: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M3 3v18h18" />
        <path d="M7 16v-4" strokeLinecap="round" />
        <path d="M11 16v-7" strokeLinecap="round" />
        <path d="M15 16v-5" strokeLinecap="round" />
        <path d="M19 16v-9" strokeLinecap="round" />
      </svg>
    ),
    sync: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M4 12c0-4.4 3.6-8 8-8 2.8 0 5.2 1.4 6.6 3.5" />
        <path d="M20 12c0 4.4-3.6 8-8 8-2.8 0-5.2-1.4-6.6-3.5" />
        <path d="M16 4l3 3.5-3.5 3" />
        <path d="M8 20l-3-3.5 3.5-3" />
      </svg>
    ),
    clinic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="6" y="13" width="4" height="4" rx="0.5" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M12 3L2 21h20L12 3z" />
        <path d="M12 9v4" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
    roster: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h6" />
        <circle cx="12" cy="5" r="1.5" />
      </svg>
    ),
    tooth: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <path d="M12 2C9.5 2 7 3 6 5C5 7 5 9 5.5 11C6 13 6.5 15 7 17C7.5 19 8 21 9 22C9.5 22.5 10.5 22.5 11 21C11.5 19.5 12 18 12 18C12 18 12.5 19.5 13 21C13.5 22.5 14.5 22.5 15 22C16 21 16.5 19 17 17C17.5 15 18 13 18.5 11C19 9 19 7 18 5C17 3 14.5 2 12 2Z"/>
      </svg>
    ),
    today: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '80px', height: '80px' }}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
      </svg>
    )
  };

  const selectedIcon = icons[icon] || icons.tooth;

  return (
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
      {/* Background decorative icon */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'rgba(255, 255, 255, 0.2)',
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
