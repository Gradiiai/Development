import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';

// Enhanced API middleware for better error handling and logging
export interface APIHandler {
  (req: NextRequest): Promise<NextResponse>;
}

export interface APIMiddlewareOptions {
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validateInput?: (body: any) => { isValid: boolean; error?: string };
  logRequests?: boolean;
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export function withAPIMiddleware(
  handler: APIHandler,
  options: APIMiddlewareOptions = {}
): APIHandler {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Log incoming request
      if (options.logRequests) {
        console.log(`[${requestId}] ${req.method} ${req.url} - Started`);
      }

      // Rate limiting
      if (options.rateLimit) {
        const clientIP = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        req.headers.get('cf-connecting-ip') || 
                        'unknown';
        const key = `${clientIP}:${req.url}`;
        const now = Date.now();
        const windowMs = options.rateLimit.windowMs;
        const limit = options.rateLimit.requests;
        
        const current = rateLimitStore.get(key);
        
        if (current) {
          if (now < current.resetTime) {
            if (current.count >= limit) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Rate limit exceeded',
                  retryAfter: Math.ceil((current.resetTime - now) / 1000),
                },
                { status: 429 }
              );
            }
            current.count++;
          } else {
            // Reset window
            rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
          }
        } else {
          rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const session = await getServerSessionWithAuth();
        if (!session?.user?.email) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }

      // Input validation
      if (options.validateInput && req.method !== 'GET') {
        try {
          const body = await req.json();
          const validation = options.validateInput(body);
          if (!validation.isValid) {
            return NextResponse.json(
              { success: false, error: validation.error || 'Invalid input' },
              { status: 400 }
            );
          }
          // Re-create request with parsed body for handler
          const newReq = new NextRequest(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(body),
          });
          req = newReq;
        } catch (error) {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 }
          );
        }
      }

      // Execute the actual handler
      const response = await handler(req);
      
      // Log successful completion
      if (options.logRequests) {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ${req.method} ${req.url} - Completed in ${duration}ms`);
      }
      
      return response;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ${req.method} ${req.url} - Error after ${duration}ms:`, error);
      
      // Return standardized error response
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          requestId,
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
        { status: 500 }
      );
    }
  };
}

// Validation helpers
export const validators = {
  questionGeneration: (body: any) => {
    if (!body.prompt || typeof body.prompt !== 'string') {
      return { isValid: false, error: 'Prompt is required and must be a string' };
    }
    if (body.prompt.length < 10 || body.prompt.length > 1000) {
      return { isValid: false, error: 'Prompt must be between 10 and 1000 characters' };
    }
    if (body.questionType && !['mcq', 'coding', 'behavioral', 'combo'].includes(body.questionType)) {
      return { isValid: false, error: 'Invalid question type. Supported types: mcq, coding, behavioral, combo' };
    }
    if (body.count && (typeof body.count !== 'number' || body.count < 1 || body.count > 20)) {
      return { isValid: false, error: 'Count must be a number between 1 and 20' };
    }
    return { isValid: true };
  },
};

// Usage example:
// export const POST = withAPIMiddleware(
//   async (req: NextRequest) => {
//     // Your handler logic here
//     return NextResponse.json({ success: true });
//   },
//   {
//     requireAuth: true,
//     rateLimit: { requests: 10, windowMs: 60000 },
//     validateInput: validators.questionGeneration,
//     logRequests: true,
//   }
// );