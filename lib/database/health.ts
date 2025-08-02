import { db, executeWithRetry } from './connection';
import { sql } from 'drizzle-orm';

/**
 * Check database connection health
 * @returns Promise<{ healthy: boolean, latency?: number, error?: string }>
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await executeWithRetry(async () => {
      // Simple health check query
      return await db.execute(sql`SELECT 1 as health_check`);
    }, 2, 500); // Reduced retries for health check
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency
    };
  } catch (error: any) {
    console.error('Database health check failed:', error?.message || error);
    
    return {
      healthy: false,
      error: error?.message || 'Unknown database error'
    };
  }
}

/**
 * Get database connection info for debugging
 */
export function getDatabaseInfo() {
  return {
    url: process.env.NEXT_PUBLIC_DRIZZLE_DB_URL ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  };
} 