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
const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });

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
