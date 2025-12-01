export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxQueueSize?: number;
  flushInterval?: number;
  enablePerformanceLogging?: boolean;
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;

  constructor(config: LoggerConfig) {
    this.config = {
      maxQueueSize: 100,
      flushInterval: 5000,
      enablePerformanceLogging: true,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.setupFlushTimer();
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupFlushTimer(): void {
    if (this.config.flushInterval && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushLogs();
      }, this.config.flushInterval);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.error('Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
  }

  private createLogEntry(level: LogLevel, message: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.getContext(),
      userId: this.getUserId(),
      sessionId: this.sessionId,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  private getContext(): string {
    // Try to get current route or component context
    const path = window.location.pathname;
    const componentName = document.querySelector('[data-component-name]')?.getAttribute('data-component-name');
    return componentName || path;
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    return sessionStorage.getItem('predator_user_id') || 
           localStorage.getItem('predator_user_id') || 
           undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const levelName = LogLevel[entry.level].padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const userId = entry.userId ? `[User:${entry.userId.substring(0, 8)}]` : '';
    
    let message = `${timestamp} ${levelName} ${context}${userId} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.stack) {
      message += `\n  Stack: ${entry.stack}`;
    }
    
    return message;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        break;
    }
  }

  private addToQueue(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    if (this.logQueue.length >= (this.config.maxQueueSize || 100)) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint || this.logQueue.length === 0) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
          }
        })
      });
    } catch (error) {
      // Re-add logs to queue if send fails
      this.logQueue.unshift(...logsToSend);
      console.warn('Failed to send logs to remote endpoint:', error);
    }
  }

  // Public logging methods
  public debug(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public error(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata);
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public fatal(message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    
    const entry = this.createLogEntry(LogLevel.FATAL, message, metadata);
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  // Performance logging
  public startTimer(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  public logComponentRender(componentName: string, duration: number): void {
    if (!this.config.enablePerformanceLogging) return;
    
    const level = duration > 16 ? LogLevel.WARN : LogLevel.DEBUG;
    const message = `Component Render: ${componentName}`;
    
    const entry = this.createLogEntry(level, message, { duration: `${duration.toFixed(2)}ms` });
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public logApiCall(url: string, method: string, status: number, duration: number): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    const message = `API Call: ${method} ${url}`;
    
    const entry = this.createLogEntry(level, message, {
      method,
      url,
      status,
      duration: `${duration.toFixed(2)}ms`
    });
    this.logToConsole(entry);
    this.addToQueue(entry);
  }

  public logUserAction(action: string, metadata?: Record<string, any>): void {
    this.info(`User Action: ${action}`, metadata);
  }

  public logSystemEvent(event: string, metadata?: Record<string, any>): void {
    this.info(`System Event: ${event}`, metadata);
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Cleanup
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushLogs();
  }
}

// Create default logger instance
const loggerConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NODE_ENV === 'production' ? '/api/logs' : undefined,
  maxQueueSize: 100,
  flushInterval: 5000,
  enablePerformanceLogging: true
};

export const logger = new Logger(loggerConfig);

// React hook for logging
export const useLogger = (context?: string) => {
  return {
    debug: (message: string, metadata?: Record<string, any>) => 
      logger.debug(message, { ...metadata, context }),
    info: (message: string, metadata?: Record<string, any>) => 
      logger.info(message, { ...metadata, context }),
    warn: (message: string, metadata?: Record<string, any>) => 
      logger.warn(message, { ...metadata, context }),
    error: (message: string, metadata?: Record<string, any>) => 
      logger.error(message, { ...metadata, context }),
    fatal: (message: string, metadata?: Record<string, any>) => 
      logger.fatal(message, { ...metadata, context }),
    startTimer: (label: string) => logger.startTimer(`${context}: ${label}`),
    logUserAction: (action: string, metadata?: Record<string, any>) => 
      logger.logUserAction(action, { ...metadata, context })
  };
};

export default logger;
