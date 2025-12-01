import { useEffect, useRef, useCallback, useState } from 'react';

// Keyboard navigation support
export const useKeyboardNavigation = (items: string[], onSelect?: (item: string) => void) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect && items[activeIndex]) {
          onSelect(items[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setActiveIndex(-1);
        break;
    }
  }, [items, activeIndex, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return { activeIndex, containerRef };
};

// Focus management
export const useFocusManagement = (initialFocus?: boolean) => {
  const firstFocusableRef = useRef<HTMLElement>(null);
  const lastFocusableRef = useRef<HTMLElement>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const first = firstFocusableRef.current;
    const last = lastFocusableRef.current;

    if (!first || !last) return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (initialFocus && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [initialFocus]);

  return { firstFocusableRef, lastFocusableRef, trapFocus };
};

// Screen reader announcements
export const useScreenReader = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      announcementRef.current.setAttribute('aria-live', priority);
      
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce, announcementRef };
};

// Reduced motion support
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// High contrast mode support
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// Color blindness support
export const useColorBlindSupport = () => {
  const [colorBlindMode, setColorBlindMode] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('none');

  useEffect(() => {
    const saved = localStorage.getItem('colorBlindMode') as typeof colorBlindMode;
    if (saved) {
      setColorBlindMode(saved);
    }
  }, []);

  const setColorBlindModeWithStorage = useCallback((mode: typeof colorBlindMode) => {
    setColorBlindMode(mode);
    localStorage.setItem('colorBlindMode', mode);
  }, []);

  return { colorBlindMode, setColorBlindMode: setColorBlindModeWithStorage };
};

// ARIA attributes helper
export const useAriaAttributes = (options: {
  label?: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  expanded?: boolean;
}) => {
  const ariaProps: Record<string, string | boolean> = {};

  if (options.label) ariaProps['aria-label'] = options.label;
  if (options.description) ariaProps['aria-describedby'] = options.description;
  if (options.required !== undefined) ariaProps['aria-required'] = options.required;
  if (options.invalid !== undefined) ariaProps['aria-invalid'] = options.invalid;
  if (options.expanded !== undefined) ariaProps['aria-expanded'] = options.expanded;

  return ariaProps;
};

// Skip link functionality
export const useSkipLink = () => {
  const [showSkipLink, setShowSkipLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setShowSkipLink(true);
      }
    };

    const handleMouseDown = () => {
      setShowSkipLink(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { showSkipLink, setShowSkipLink };
};

// Tooltips with accessibility
export const useTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);

  const showTooltip = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideTooltip();
    }
  }, [hideTooltip]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        hideTooltip();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hideTooltip]);

  return {
    isVisible,
    showTooltip,
    hideTooltip,
    tooltipRef,
    triggerRef,
    tooltipProps: {
      role: 'tooltip',
      'aria-hidden': !isVisible
    },
    triggerProps: {
      'aria-describedby': isVisible ? 'tooltip' : undefined,
      onKeyDown: handleKeyDown
    }
  };
};

export default {
  useKeyboardNavigation,
  useFocusManagement,
  useScreenReader,
  useReducedMotion,
  useHighContrast,
  useColorBlindSupport,
  useAriaAttributes,
  useSkipLink,
  useTooltip
};
