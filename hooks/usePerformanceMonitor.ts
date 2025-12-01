import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  fps?: number;
}

interface UsePerformanceMonitorOptions {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  enableMemoryTracking?: boolean;
  enableFPSTracking?: boolean;
  sampleRate?: number;
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    onMetricsUpdate,
    enableMemoryTracking = true,
    enableFPSTracking = true,
    sampleRate = 1000
  } = options;

  const startTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const animationFrameIdRef = useRef<number>();

  // Measure component load time
  const measureLoadTime = useCallback(() => {
    const loadTime = Date.now() - startTimeRef.current;
    return loadTime;
  }, []);

  // Measure memory usage
  const measureMemoryUsage = useCallback(() => {
    if (!enableMemoryTracking || !(performance as any).memory) {
      return undefined;
    }
    
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }, [enableMemoryTracking]);

  // Calculate FPS
  const calculateFPS = useCallback(() => {
    if (!enableFPSTracking) return undefined;

    frameCountRef.current++;
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;

    if (deltaTime >= sampleRate) {
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = currentTime;
      return fps;
    }

    return undefined;
  }, [enableFPSTracking, sampleRate]);

  // Track FPS using requestAnimationFrame
  const startFPSTracking = useCallback(() => {
    if (!enableFPSTracking) return;

    const trackFrame = () => {
      const fps = calculateFPS();
      if (fps !== undefined && onMetricsUpdate) {
        onMetricsUpdate({
          loadTime: measureLoadTime(),
          renderTime: 0,
          memoryUsage: measureMemoryUsage()?.used,
          fps
        });
      }
      animationFrameIdRef.current = requestAnimationFrame(trackFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(trackFrame);
  }, [enableFPSTracking, calculateFPS, measureLoadTime, measureMemoryUsage, onMetricsUpdate]);

  // Stop FPS tracking
  const stopFPSTracking = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    startFPSTracking();

    return () => {
      stopFPSTracking();
    };
  }, [startFPSTracking, stopFPSTracking]);

  // Performance observer for long tasks
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask' && onMetricsUpdate) {
            console.warn('Long task detected:', entry.duration, 'ms');
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
        return () => observer.disconnect();
      } catch (e) {
        console.warn('Performance observer not supported');
      }
    }
  }, [onMetricsUpdate]);

  return {
    loadTime: measureLoadTime(),
    memoryUsage: measureMemoryUsage(),
    fps: calculateFPS(),
    startFPSTracking,
    stopFPSTracking
  };
};

// Performance monitoring hook for component render time
export const useRenderTime = (componentName: string) => {
  const renderStartTime = useRef<number>();

  useEffect(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        if (renderTime > 16) { // More than one frame
          console.warn(`Slow render detected in ${componentName}:`, renderTime.toFixed(2), 'ms');
        }
      }
    };
  });
};

export default usePerformanceMonitor;
