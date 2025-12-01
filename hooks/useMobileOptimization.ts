import { useState, useEffect, useCallback } from 'react';

export interface MobileViewport {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 'up' | 'down' | 'left' | 'right' | null;
  distance: number;
}

export const useMobileOptimization = () => {
  const [viewport, setViewport] = useState<MobileViewport>({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  });

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [gesture, setGesture] = useState<TouchGesture | null>(null);

  // Update viewport on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: height > width ? 'portrait' : 'landscape'
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Touch gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    
    const deltaX = endX - touchStart.x;
    const deltaY = endY - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let direction: TouchGesture['direction'] = null;
    
    if (distance > 50) { // Minimum swipe distance
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }

    const newGesture: TouchGesture = {
      startX: touchStart.x,
      startY: touchStart.y,
      endX,
      endY,
      direction,
      distance
    };

    setGesture(newGesture);
    setTouchStart(null);

    // Clear gesture after a short delay
    setTimeout(() => setGesture(null), 100);
  }, [touchStart]);

  // Responsive font sizing
  const getResponsiveFontSize = useCallback((baseSize: number) => {
    if (viewport.isMobile) {
      return baseSize * 0.875; // 0.875x on mobile
    }
    if (viewport.isTablet) {
      return baseSize * 0.9375; // 0.9375x on tablet
    }
    return baseSize;
  }, [viewport]);

  // Responsive spacing
  const getResponsiveSpacing = useCallback((baseSpacing: number) => {
    if (viewport.isMobile) {
      return baseSpacing * 0.75;
    }
    if (viewport.isTablet) {
      return baseSpacing * 0.875;
    }
    return baseSpacing;
  }, [viewport]);

  // Responsive grid columns
  const getResponsiveColumns = useCallback((desktopColumns: number, tabletColumns?: number, mobileColumns?: number) => {
    if (viewport.isMobile) {
      return mobileColumns || 1;
    }
    if (viewport.isTablet) {
      return tabletColumns || Math.min(desktopColumns, 2);
    }
    return desktopColumns;
  }, [viewport]);

  // Check if device supports touch
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Get safe area insets
  const getSafeAreaInsets = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    };
  }, []);

  // Optimized scroll behavior for mobile
  const useSmoothScroll = useCallback((elementRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
      const element = elementRef.current;
      if (!element || !viewport.isMobile) return;

      let isScrolling = false;
      let startY = 0;
      let scrollTop = 0;

      const handleTouchStart = (e: TouchEvent) => {
        isScrolling = true;
        startY = e.touches[0].pageY;
        scrollTop = element.scrollTop;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isScrolling) return;
        
        const y = e.touches[0].pageY;
        const scrollTopTarget = scrollTop - (y - startY);
        
        element.scrollTop = scrollTopTarget;
      };

      const handleTouchEnd = () => {
        isScrolling = false;
      };

      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchmove', handleTouchMove);
      element.addEventListener('touchend', handleTouchEnd);

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }, [viewport.isMobile, elementRef]);
  }, [viewport]);

  // Prevent zoom on input focus (mobile)
  const preventInputZoom = useCallback(() => {
    if (!viewport.isMobile) return;

    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
        }
      });

      input.addEventListener('blur', () => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
      });
    });
  }, [viewport.isMobile]);

  // Initialize mobile optimizations
  useEffect(() => {
    preventInputZoom();
  }, [preventInputZoom]);

  return {
    viewport,
    gesture,
    touchStart,
    handleTouchStart,
    handleTouchEnd,
    getResponsiveFontSize,
    getResponsiveSpacing,
    getResponsiveColumns,
    isTouchDevice: isTouchDevice(),
    getSafeAreaInsets,
    useSmoothScroll,
  };
};

export default useMobileOptimization;
