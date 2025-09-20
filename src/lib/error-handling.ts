// Enhanced error handling for PulaNodus MVP with analytics
// Scalable system that grows with your needs

export class AppError extends Error {
  constructor(message: string, public code?: string, public severity: ErrorSeverity = 'medium') {
    super(message);
    this.name = 'AppError';
  }
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  operation: string;
  userId?: string;
  tableId?: string;
  sessionId?: string;
  restaurantId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorAnalytics {
  errorCode: string;
  severity: ErrorSeverity;
  operation: string;
  restaurantId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Analytics storage (in production, use a proper database)
const errorAnalytics: ErrorAnalytics[] = [];

export const handleError = (error: unknown, context: ErrorContext): AppError => {
  // Create AppError with severity
  const appError = createAppError(error, context);
  
  // Log the error with context for internal debugging
  console.error(`Operation failed: ${context.operation}`, { error, ...context });

  // Store analytics data
  storeErrorAnalytics(appError, context);

  // Send alerts for critical errors
  if (appError.severity === 'critical') {
    sendCriticalAlert(appError, context);
  }

  return appError;
};

const createAppError = (error: unknown, context: ErrorContext): AppError => {
  // Handle known error types
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as { code: string; message: string };
    const severity = getErrorSeverity(supabaseError.code);
    return new AppError(supabaseError.message || 'A database error occurred', supabaseError.code, severity);
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 'medium');
  }

  // Fallback for completely unknown errors
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 'high');
};

const getErrorSeverity = (errorCode: string): ErrorSeverity => {
  const criticalCodes = ['PAYMENT_FAILED', 'DATABASE_CONNECTION_LOST', 'AUTHENTICATION_FAILED'];
  const highCodes = ['ORDER_PROCESSING_FAILED', 'SESSION_EXPIRED'];
  const lowCodes = ['VALIDATION_ERROR', 'USER_INPUT_ERROR'];
  
  if (criticalCodes.includes(errorCode)) return 'critical';
  if (highCodes.includes(errorCode)) return 'high';
  if (lowCodes.includes(errorCode)) return 'low';
  return 'medium';
};

const storeErrorAnalytics = (error: AppError, context: ErrorContext) => {
  const analytics: ErrorAnalytics = {
    errorCode: error.code || 'UNKNOWN',
    severity: error.severity,
    operation: context.operation,
    restaurantId: context.restaurantId,
    userId: context.userId,
    timestamp: new Date(),
    metadata: context.metadata
  };
  
  errorAnalytics.push(analytics);
  
  // Keep only last 1000 errors to prevent memory issues
  if (errorAnalytics.length > 1000) {
    errorAnalytics.shift();
  }
};

const sendCriticalAlert = (error: AppError, context: ErrorContext) => {
  // In production, integrate with your alerting system
  console.warn('🚨 CRITICAL ERROR ALERT:', {
    error: error.message,
    code: error.code,
    restaurant: context.restaurantId,
    operation: context.operation,
    timestamp: new Date()
  });
  
  // TODO: Integrate with:
  // - SMS notifications
  // - Email alerts
  // - Slack notifications
  // - Admin dashboard real-time updates
};

// Utility function for try-catch blocks
export const withErrorHandling = async <T>(
  operation: string,
  context: Omit<ErrorContext, 'operation'>,
  callback: () => Promise<T>
): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    throw handleError(error, { operation, ...context });
  }
};

// Analytics functions for admin dashboard
export const getErrorAnalytics = (restaurantId?: string, timeRange?: { start: Date; end: Date }) => {
  let filtered = errorAnalytics;
  
  if (restaurantId) {
    filtered = filtered.filter(analytics => analytics.restaurantId === restaurantId);
  }
  
  if (timeRange) {
    filtered = filtered.filter(analytics => 
      analytics.timestamp >= timeRange.start && analytics.timestamp <= timeRange.end
    );
  }
  
  return filtered;
};

export const getErrorSummary = (restaurantId?: string) => {
  const analytics = getErrorAnalytics(restaurantId);
  
  const summary = {
    total: analytics.length,
    bySeverity: {
      critical: analytics.filter(a => a.severity === 'critical').length,
      high: analytics.filter(a => a.severity === 'high').length,
      medium: analytics.filter(a => a.severity === 'medium').length,
      low: analytics.filter(a => a.severity === 'low').length,
    },
    byOperation: {} as Record<string, number>,
    recentErrors: analytics.slice(-10).reverse()
  };
  
  // Count by operation
  analytics.forEach(analytics => {
    summary.byOperation[analytics.operation] = (summary.byOperation[analytics.operation] || 0) + 1;
  });
  
  return summary;
};

// Additional utility functions for compatibility
export const logDetailedError = (error: any, context?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DETAILED_ERROR]', error, context);
  }
};
