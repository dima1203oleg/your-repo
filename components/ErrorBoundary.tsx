import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry, LogRocket, or similar
      // Log full stack for easier debugging in CI/dev when reproducing production builds.
      console.warn('Production error detected:', error.message);
      console.error(error.stack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">
              Системна Помилка
            </h1>
            
            <p className="text-slate-400 mb-6">
              Виникла неочікувана помилка. Наші інженери вже отримали сповіщення.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-400 mb-2">
                  Деталі помилки (Development)
                </summary>
                <div className="bg-slate-950 p-3 rounded text-xs font-mono text-red-400 overflow-auto max-h-32">
                  <div className="mb-2">{this.state.error.message}</div>
                  {this.state.errorInfo && (
                    <div className="text-slate-500">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Спробувати знову
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Головна
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
