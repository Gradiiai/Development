import { NextRequest } from 'next/server';
import { db } from '@/lib/database/connection';
import { apiTokens, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface ApiAuthContext {
  token: {
    id: string;
    name: string;
    permissions: string[];
    companyId: string;
    companyName: string;
    isActive: boolean;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  };
  hasPermission: (permission: string) => boolean;
}

export class ApiAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

/**
 * Authenticate API request using Bearer token
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiAuthContext> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiAuthError('Missing or invalid authorization header', 401, 'MISSING_TOKEN');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!token.startsWith('iai_')) {
    throw new ApiAuthError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
  }

  // Hash the token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find the token in database
  const tokenRecord = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      permissions: apiTokens.permissions,
      companyId: apiTokens.companyId,
      isActive: apiTokens.isActive,
      expiresAt: apiTokens.expiresAt,
      lastUsedAt: apiTokens.lastUsedAt,
      ipWhitelist: apiTokens.ipWhitelist,
      companyName: companies.name,
    })
    .from(apiTokens)
    .leftJoin(companies, eq(apiTokens.companyId, companies.id))
    .where(
      and(
        eq(apiTokens.hashedToken, hashedToken),
        eq(apiTokens.isActive, true)
      )
    )
    .limit(1);

  if (tokenRecord.length === 0) {
    throw new ApiAuthError('Invalid or revoked token', 401, 'INVALID_TOKEN');
  }

  const tokenData = tokenRecord[0];

  // Check if token is expired
  if (tokenData.expiresAt && new Date() > tokenData.expiresAt) {
    throw new ApiAuthError('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Check IP whitelist if configured
  const ipWhitelist = Array.isArray(tokenData.ipWhitelist) ? tokenData.ipWhitelist : [];
  if (ipWhitelist.length > 0) {
    const clientIp = getClientIp(request);
    if (!ipWhitelist.includes(clientIp)) {
      throw new ApiAuthError('IP address not whitelisted', 403, 'IP_NOT_WHITELISTED');
    }
  }

  // Update last used timestamp
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, tokenData.id));

  return {
    token: {
      id: tokenData.id,
      name: tokenData.name,
      permissions: Array.isArray(tokenData.permissions) ? tokenData.permissions : [],
      companyId: tokenData.companyId,
      companyName: tokenData.companyName || '',
      isActive: tokenData.isActive ?? true,
      expiresAt: tokenData.expiresAt,
      lastUsedAt: tokenData.lastUsedAt,
    },
    hasPermission: (permission: string) => {
      const perms = Array.isArray(tokenData.permissions) ? tokenData.permissions : [];
      return perms.includes(permission);
    },
  };
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withApiAuth(
  requiredPermissions: string[] = []
) {
  return function (handler: (request: NextRequest, context: ApiAuthContext, params?: any) => Promise<Response>) {
    return async function (request: NextRequest, params?: any): Promise<Response> {
      try {
        const authContext = await authenticateApiRequest(request);

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasAllPermissions = requiredPermissions.every(permission => 
            authContext.hasPermission(permission)
          );

          if (!hasAllPermissions) {
            throw new ApiAuthError(
              `Missing required permissions: ${requiredPermissions.join(', ')}`,
              403,
              'INSUFFICIENT_PERMISSIONS'
            );
          }
        }

        return await handler(request, authContext, params);
      } catch (error) {
        if (error instanceof ApiAuthError) {
          return new Response(
            JSON.stringify({
              error: error.message,
              code: error.code,
            }),
            {
              status: error.statusCode,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        console.error('API authentication error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    };
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to localhost
  return '127.0.0.1';
}

/**
 * Rate limiting for API endpoints
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Middleware wrapper for rate limiting
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]): Promise<Response> {
      const identifier = getClientIp(request);
      const rateLimit = checkRateLimit(identifier, config);
      
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            resetTime: rateLimit.resetTime,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            },
          }
        );
      }
      
      const response = await handler(request, ...args);
      
      // Add rate limit headers to successful responses
      if (response instanceof Response) {
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      }
      
      return response;
    };
  };
}