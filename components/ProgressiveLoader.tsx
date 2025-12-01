import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  minDisplayTime?: number;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

interface LoadingState {
  isLoading: boolean;
  isDelayed: boolean;
  hasError: boolean;
  progress: number;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  fallback,
  delay = 200,
  minDisplayTime = 300,
  onLoadComplete,
  onError
}) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    isDelayed: false,
    hasError: false,
    progress: 0
  });

  const startTimeRef = useRef<number>(Date.now());
  const delayTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Start progress animation
    progressIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        progress: Math.min(prev.progress + Math.random() * 15, 90)
      }));
    }, 100);

    // Handle delay
    if (delay > 0) {
      delayTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isDelayed: true }));
      }, delay);
    } else {
      setState(prev => ({ ...prev, isDelayed: true }));
    }
    
    // Simulate loading completion
    const loadingTimeout = setTimeout(() => {
      const elapsedTime = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          progress: 100
        }));
        onLoadComplete?.();
      }, remainingTime);
    }, 500 + Math.random() * 1000); // Random loading time for demo

    return () => {
      clearTimeout(delayTimeoutRef.current);
      clearTimeout(loadingTimeout);
      clearInterval(progressIntervalRef.current);
    };
  }, [delay, minDisplayTime, onLoadComplete]);

  const handleRetry = () => {
    setState({
      isLoading: true,
      isDelayed: false,
      hasError: false,
      progress: 0
    });
    startTimeRef.current = Date.now();
  };

  if (state.hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <WifiOff className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Помилка завантаження</h3>
        <p className="text-slate-400 mb-4">Не вдалося завантажити контент</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Спробувати знову
        </button>
      </div>
      );
    
  }

  if (state.isLoading || !state.isDelayed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <Wifi className="w-4 h-4 text-primary-400 absolute -bottom-1 -right-1" />
        </div>
        
        {state.isDelayed && (
          <>
            <div className="mt-4 w-48 bg-slate-700 rounded-full h-2 overflow-hidden">
              <progress
                className="w-full h-full appearance-none bg-transparent"
                value={Math.round(state.progress)}
                max={100}
                aria-label="Завантаження прогресу"
              />
              <style>{`progress[value]::-webkit-progress-value{background:linear-gradient(90deg, #06b6d4, #0ea5a5);transition:width .3s ease-out} progress{color:transparent}`}</style>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Завантаження... {Math.round(state.progress)}%
            </p>
          </>
        )}
      </div>
    );
  }
  return <>{children}</>;
};

// Skeleton loader components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-slate-800 rounded-lg p-4 animate-pulse ${className}`}>
    <div className="h-4 bg-slate-700 rounded mb-3 w-3/4"></div>
    <div className="h-3 bg-slate-700 rounded mb-2 w-full"></div>
    <div className="h-3 bg-slate-700 rounded mb-2 w-5/6"></div>
    <div className="h-8 bg-slate-700 rounded mt-4 w-1/3"></div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className = "" 
}) => {
  const ids = React.useMemo(() => Array.from({ length: rows }).map(() => Math.random().toString(36).slice(2, 9)), [rows]);
  return (
    <div className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={ids[i]} className="flex space-x-4 p-3 bg-slate-800 rounded animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-20"></div>
        <div className="h-4 bg-slate-700 rounded w-32"></div>
        <div className="h-4 bg-slate-700 rounded w-24"></div>
        <div className="h-4 bg-slate-700 rounded w-16 ml-auto"></div>
      </div>
    ))}
    </div>
  );
}

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
    <div className="h-4 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
    <div className="h-64 bg-slate-700 rounded animate-pulse"></div>
  </div>
);

export default ProgressiveLoader;
