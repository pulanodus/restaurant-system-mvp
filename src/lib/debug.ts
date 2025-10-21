// Simple debug utilities for PulaNodus MVP
// Replaces the complex debug system from archived features

export const debug = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    // Debug logging enabled in development
  }
};

export const debugLog = (message: string, data?: any) => {
  debug(message, data);
};

export const debugSessionLog = (message: string, data?: any) => {
  debug(`[SESSION] ${message}`, data);
};

export const debugErrorLog = (message: string, data?: any) => {
  debug(`[ERROR] ${message}`, data);
};

export const debugValidationLog = (message: string, data?: any) => {
  debug(`[VALIDATION] ${message}`, data);
};

export const debugNavLog = (message: string, data?: any) => {
  debug(`[NAVIGATION] ${message}`, data);
};

export const debugDbLog = (message: string, data?: any) => {
  debug(`[DATABASE] ${message}`, data);
};

export const startPerformanceMonitoring = (operation: string) => {
  if (process.env.NODE_ENV === 'development') {
    // Performance monitoring started
  }
};

export const endPerformanceMonitoring = (operation: string) => {
  if (process.env.NODE_ENV === 'development') {
    // Performance monitoring ended
  }
};

export const trackError = (error: any, context?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR_TRACK]`, error, context);
  }
};

export const isDebugMode = () => {
  return process.env.NODE_ENV === 'development';
};
