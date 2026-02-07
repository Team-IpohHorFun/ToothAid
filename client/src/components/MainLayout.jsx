import { useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const TAB_PATHS = ['/', '/search', '/register', '/clinic-days', '/graphs', '/sync'];
const MIN_SWIPE_DISTANCE = 50;

function getTabIndex(pathname) {
  if (pathname === '/') return 0;
  if (pathname === '/search' || pathname.startsWith('/search')) return 1;
  if (pathname === '/register' || pathname.startsWith('/register')) return 2;
  if (pathname === '/clinic-days' || pathname.startsWith('/clinic-days')) return 3;
  if (pathname === '/graphs' || pathname.startsWith('/graphs')) return 4;
  if (pathname === '/sync' || pathname.startsWith('/sync')) return 5;
  return -1;
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDirection = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      swipeDirection.current = null;
    };

    const handleTouchMove = (e) => {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      // Lock direction very early (5px) so we preventDefault before the page can shift
      if (swipeDirection.current === null && (dx > 5 || dy > 5)) {
        swipeDirection.current = dx > dy ? 'horizontal' : 'vertical';
      }
      if (swipeDirection.current === 'horizontal') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = (e) => {
      if (swipeDirection.current !== 'horizontal') return;
      const endX = e.changedTouches[0].clientX;
      const deltaX = touchStartX.current - endX;
      const currentIndex = getTabIndex(location.pathname);
      if (currentIndex < 0) return;

      if (deltaX > MIN_SWIPE_DISTANCE && currentIndex < TAB_PATHS.length - 1) {
        navigate(TAB_PATHS[currentIndex + 1]);
      } else if (deltaX < -MIN_SWIPE_DISTANCE && currentIndex > 0) {
        navigate(TAB_PATHS[currentIndex - 1]);
      }
      swipeDirection.current = null;
    };

    // Use capture: true so we run before children and can prevent horizontal drag
    el.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart, { capture: true });
      el.removeEventListener('touchmove', handleTouchMove, { capture: true });
      el.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [location.pathname, navigate]);

  return (
    <div
      ref={wrapperRef}
      className="main-layout-swipe"
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      <Outlet />
    </div>
  );
}
