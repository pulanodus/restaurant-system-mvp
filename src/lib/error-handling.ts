// Simplified, robust error handling for PulaNodus MVP
// Replaces the complex src/lib/error-handling/ directory

export class AppError extends Error {
  constructor(message: string, public code?: string) {
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
}

export const handleError = (error: unknown, context: ErrorContext): AppError => {
  // Log the error with context for internal debugging
  console.error(`Operation failed: ${context.operation}`, { error, ...context });

  // Handle known error types
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as { code: string; message: string };
    return new AppError(supabaseError.message || 'A database error occurred', supabaseError.code);
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  // Fallback for completely unknown errors
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR');
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
