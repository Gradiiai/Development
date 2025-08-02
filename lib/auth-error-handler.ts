// Auth Error Handler Utility
// Handles common NextAuth errors gracefully

export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private errorCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  handleSessionError(error: any): boolean {
    // Check if this is a NextAuth fetch error
    if (this.isNextAuthFetchError(error)) {
      this.errorCount++;
      
      if (this.errorCount <= this.maxRetries) {
        console.warn(`NextAuth session fetch failed (attempt ${this.errorCount}/${this.maxRetries}). This is common in development.`);
        
        // Reset error count after successful session
        setTimeout(() => {
          this.errorCount = Math.max(0, this.errorCount - 1);
        }, this.retryDelay);
        
        return true; // Error handled
      } else {
        console.error('NextAuth session fetch failed multiple times. Check your configuration.');
        return false; // Let error propagate
      }
    }
    
    return false; // Not a NextAuth error, let it propagate
  }

  private isNextAuthFetchError(error: any): boolean {
    return (
      error?.name === 'ClientFetchError' ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('nextauth') ||
      error?.message?.includes('session')
    );
  }

  // Reset error count on successful session
  resetErrorCount(): void {
    this.errorCount = 0;
  }
}

// Global error handler for NextAuth
export const setupGlobalAuthErrorHandler = () => {
  const handler = AuthErrorHandler.getInstance();

  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      if (handler.handleSessionError(event.reason)) {
        event.preventDefault();
      }
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      if (handler.handleSessionError(event.error)) {
        event.preventDefault();
      }
    });
  }
};

// Utility function to safely get session with error handling
export const safeGetSession = async (getSession: () => Promise<any>) => {
  const handler = AuthErrorHandler.getInstance();
  
  try {
    const session = await getSession();
    handler.resetErrorCount();
    return session;
  } catch (error) {
    if (handler.handleSessionError(error)) {
      // Return null session if it's a handled auth error
      return null;
    }
    throw error; // Re-throw if it's not a handled auth error
  }
};