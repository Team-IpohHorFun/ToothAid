const PageHeader = ({ title, subtitle, icon }) => {
  // Icon components matching NavBar icons
  const icons = {
    children: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
    visit: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
    ),
    reports: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
    ),
    sync: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
    ),
    clinic: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
    ),
    roster: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
      </svg>
    ),
    tooth: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '80px', height: '80px' }}>
        <path d="M12 2C9.5 2 7 3 6 5C5 7 5 9 5.5 11C6 13 6.5 15 7 17C7.5 19 8 21 9 22C9.5 22.5 10.5 22.5 11 21C11.5 19.5 12 18 12 18C12 18 12.5 19.5 13 21C13.5 22.5 14.5 22.5 15 22C16 21 16.5 19 17 17C17.5 15 18 13 18.5 11C19 9 19 7 18 5C17 3 14.5 2 12 2Z"/>
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
