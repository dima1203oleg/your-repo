import React from 'react';

// Screen reader announcement component
interface ScreenReaderAnnouncerProps {
  message?: string;
  priority?: 'polite' | 'assertive';
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  priority = 'polite'
}) => {
  return (
    <div
      className="sr-only"
      aria-live={priority}
      aria-atomic="true"
    >
      {message}
    </div>
  );
};

// Skip link component
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  href,
  children,
  className = ""
}) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2 focus:ring-primary-400 ${className}`}
    >
      {children}
    </a>
  );
};

// Focus trap component
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element when trap becomes active
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
};

// Tooltip component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const showTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideTooltip();
    }
  }, [hideTooltip]);

  React.useEffect(() => {
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

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          id="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-slate-800 rounded shadow-lg whitespace-nowrap ${positionClasses[position]}`}
        >
          {content}
          <div className="absolute w-2 h-2 bg-slate-800 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Loading announcement component
interface LoadingAnnouncerProps {
  loading?: boolean;
  message?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  loading = false,
  message = "Завантаження"
}) => {
  return (
    <ScreenReaderAnnouncer 
      message={loading ? message : ""} 
      priority="polite" 
    />
  );
};

// Error announcement component
interface ErrorAnnouncerProps {
  error?: string;
}

export const ErrorAnnouncer: React.FC<ErrorAnnouncerProps> = ({ error }) => {
  return (
    <ScreenReaderAnnouncer 
      message={error || ""} 
      priority="assertive" 
    />
  );
};

// Status announcement component
interface StatusAnnouncerProps {
  status?: string;
  priority?: 'polite' | 'assertive';
}

export const StatusAnnouncer: React.FC<StatusAnnouncerProps> = ({ 
  status, 
  priority = 'polite' 
}) => {
  return (
    <ScreenReaderAnnouncer 
      message={status || ""} 
      priority={priority} 
    />
  );
};

export default {
  ScreenReaderAnnouncer,
  SkipLink,
  FocusTrap,
  Tooltip,
  LoadingAnnouncer,
  ErrorAnnouncer,
  StatusAnnouncer
};
