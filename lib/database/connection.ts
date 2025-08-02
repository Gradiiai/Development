import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use the database URL directly to ensure connection works
// In middleware (Edge Runtime), process.env will already have values from .env
// No need to use dotenv in Edge Runtime
const dbUrl = process.env.NEXT_PUBLIC_DRIZZLE_DB_URL || '';

if (!dbUrl) {
  throw new Error('NEXT_PUBLIC_DRIZZLE_DB_URL is not set in environment variables');
}

// Configure Neon with better timeout and connection settings
const sql = neon(dbUrl, {
  arrayMode: false,
  fullResults: false,
});

export const db = drizzle(sql, { schema });

/**
 * Database utility function with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error?.message || error);
      
      // Don't retry on certain errors
      if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Checks if an interview link has expired based on the scheduled time
 * @param interviewDateTime The scheduled interview date and time
 * @param expiryHours Number of hours after which the link expires (default: 3)
 * @returns boolean indicating if the link has expired
 */
export function isInterviewLinkExpired(interviewDateTime: Date | string | null, expiryHours: number = 3): boolean {
  if (!interviewDateTime) return false;
  
  const expiry = new Date(interviewDateTime);
  expiry.setHours(expiry.getHours() + expiryHours);
  
  const now = new Date();
  return now > expiry;
}

/**
 * Calculates the expiry time for an interview link
 * @param interviewDateTime The scheduled interview date and time
 * @param expiryHours Number of hours after which the link expires (default: 3)
 * @returns Date object representing the expiry time
 */
export function calculateLinkExpiryTime(interviewDateTime: Date | string, expiryHours: number = 3): Date {
  const expiry = new Date(interviewDateTime);
  expiry.setHours(expiry.getHours() + expiryHours);
  return expiry;
}
