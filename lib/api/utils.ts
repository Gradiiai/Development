import { NextResponse } from 'next/server';

/**
 * Validates that a companyId exists and is not null
 * Returns an error response if invalid, or the companyId if valid
 */
export function validateCompanyId(companyId: string | null | undefined): 
  { success: true; companyId: string } | { success: false; response: NextResponse } {
  
  if (!companyId) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      )
    };
  }
  
  return { success: true, companyId };
}

/**
 * Validates that a userId exists and is not null
 * Returns an error response if invalid, or the userId if valid
 */
export function validateUserId(userId: string | null | undefined): 
  { success: true; userId: string } | { success: false; response: NextResponse } {
  
  if (!userId) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    };
  }
  
  return { success: true, userId };
}