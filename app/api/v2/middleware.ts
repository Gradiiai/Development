import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, ApiAuthError } from '@/lib/auth/tokens';

/**
 * V2 API Authentication Middleware
 * Validates API tokens and enforces permissions
 */
export async function withV2Auth(
  request: NextRequest,
  requiredPermissions: string[] = []
) {
  try {
    const authContext = await authenticateApiRequest(request);

    // Check required permissions
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        authContext.hasPermission(permission)
      );

      if (!hasAllPermissions) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required_permissions: requiredPermissions,
            message: `Missing required permissions: ${requiredPermissions.join(', ')}`
          },
          { status: 403 }
        );
      }
    }

    return { authContext, error: null };
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return {
        authContext: null,
        error: NextResponse.json(
          {
            error: error.message,
            code: error.code,
            message: 'Authentication failed'
          },
          { status: error.statusCode }
        )
      };
    }

    console.error('V2 API authentication error:', error);
    return {
      authContext: null,
      error: NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during authentication'
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Standard V2 API Response Format
 */
export function createV2Response(
  data: any,
  status: number = 200,
  message?: string,
  meta?: any
) {
  const response: any = {
    success: status >= 200 && status < 300,
    data,
    timestamp: new Date().toISOString(),
    version: '2.0'
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status });
}

/**
 * Standard V2 API Error Response Format
 */
export function createV2ErrorResponse(
  error: string,
  code: string,
  status: number = 400,
  details?: any
) {
  const response: any = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString(),
    version: '2.0'
  };

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Validate request method
 */
export function validateMethod(request: NextRequest, allowedMethods: string[]) {
  if (!allowedMethods.includes(request.method)) {
    return createV2ErrorResponse(
      `Method ${request.method} not allowed`,
      'METHOD_NOT_ALLOWED',
      405
    );
  }
  return null;
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody(request: NextRequest) {
  try {
    const body = await request.json();
    return { body, error: null };
  } catch (error) {
    return {
      body: null,
      error: createV2ErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400
      )
    };
  }
}

/**
 * Extract pagination parameters
 */
export function extractPagination(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Extract sorting parameters
 */
export function extractSorting(request: NextRequest, allowedFields: string[] = []) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sort_by') || 'createdAt';
  const sortOrder = searchParams.get('sort_order')?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Validate sort field if allowed fields are specified
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    return {
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
      error: createV2ErrorResponse(
        `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`,
        'INVALID_SORT_FIELD',
        400
      )
    };
  }

  return { sortBy, sortOrder: sortOrder as 'asc' | 'desc', error: null };
}