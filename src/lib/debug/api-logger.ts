// Simple API logging utilities for PulaNodus MVP
// Replaces the complex api-logger system from archived features

export const withApiDebugging = (handler: Function, operation: string) => {
  return async (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Starting ${operation}`, args);
    }
    
    try {
      const result = await handler(...args);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] Completed ${operation}`, result);
      }
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[API] Failed ${operation}`, error);
      }
      throw error;
    }
  };
};

export const logDatabaseOperation = (operation: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] ${operation}`, data);
  }
};

export const logAuthentication = (action: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUTH] ${action}`, data);
  }
};
