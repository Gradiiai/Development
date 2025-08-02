// NextAuth Diagnostics Utility
// Helps diagnose common authentication issues

interface AuthDiagnostics {
  hasAuthSecret: boolean;
  hasNextAuthUrl: boolean;
  isSecureContext: boolean;
  isProduction: boolean;
  recommendations: string[];
}

export function runAuthDiagnostics(): AuthDiagnostics {
  const recommendations: string[] = [];
  
  // Check for required environment variables
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  const hasNextAuthUrl = Boolean(process.env.NEXTAUTH_URL);
  
  if (!hasAuthSecret) {
    recommendations.push('Add AUTH_SECRET or NEXTAUTH_SECRET environment variable');
  }
  
  if (!hasNextAuthUrl && process.env.NODE_ENV === 'production') {
    recommendations.push('Add NEXTAUTH_URL environment variable for production');
  }
  
  // Check secure context
  const isSecureContext = typeof window !== 'undefined' 
    ? window.isSecureContext 
    : process.env.NODE_ENV === 'production';
    
  if (!isSecureContext && process.env.NODE_ENV === 'production') {
    recommendations.push('Ensure HTTPS is enabled in production');
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Development-specific recommendations
  if (!isProduction) {
    recommendations.push('Session fetch errors are common in development and usually resolve automatically');
    recommendations.push('Ensure your development server is running on a consistent port');
  }
  
  return {
    hasAuthSecret,
    hasNextAuthUrl,
    isSecureContext,
    isProduction,
    recommendations
  };
}

export function logAuthDiagnostics(): void {
  if (process.env.NODE_ENV === 'development') {
    const diagnostics = runAuthDiagnostics();
    
    console.group('🔐 NextAuth Diagnostics');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Has Auth Secret:', diagnostics.hasAuthSecret);
    console.log('Has NextAuth URL:', diagnostics.hasNextAuthUrl);
    console.log('Secure Context:', diagnostics.isSecureContext);
    
    if (diagnostics.recommendations.length > 0) {
      console.group('📋 Recommendations');
      diagnostics.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Call diagnostics on module load in development
if (process.env.NODE_ENV === 'development') {
  logAuthDiagnostics();
}