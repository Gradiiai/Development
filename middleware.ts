import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";



// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/api/interview-questions",
  "/api/coding-questions",
  "/api/generate-feedback",
  "/api/complete-interview",
  "/api/interviews/send-email", // Updated: moved to interviews directory
  "/api/interview-analytics",
  "/api/content/questions",
  "/api/content/questions/banks", // Updated: consolidated question banks
];

// Routes that require super-admin role
const superAdminRoutes = [
  "/admin",
  "/api/admin",
];

// Routes that require company or super-admin role
const adminRoutes = [
  "/dashboard/unified-analytics",
  "/dashboard/users",
  "/dashboard/settings",
];

// Company dashboard routes that candidates should not access
const companyOnlyRoutes = [
  "/dashboard",
  "/admin",
];

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/terms",
  "/privacy",
  "/auth/signin",
  "/auth/signup",
  "/candidate/signin",
  "/candidate/signup",
  "/api/auth",
  "/api/candidate-auth",
  "/api/contact",
  "/api/candidate-auth/register",
];

// Interview routes that use candidate access tokens
const candidateInterviewRoutes = [
  "/candidate/interview"
];

// Candidate dashboard routes that require candidate authentication
const candidateProtectedRoutes = [
  "/candidate"
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Handle candidate interview access - now email-based only
  if (candidateInterviewRoutes.some(route => pathname.startsWith(route))) {
    return await handleCandidateEmailAccess(request);
  }

  // Handle candidate dashboard access
  if (candidateProtectedRoutes.some(route => pathname.startsWith(route))) {
    return await handleCandidateDashboardAccess(request);
  }

  // Get the session from the request
  const session = await auth();

  // Redirect to signin if no session and route is protected
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated
  if (session) {
    const userRole = session.user.role as string;
    
    // Redirect authenticated users from home to appropriate dashboard
    if (pathname === "/") {
      if (userRole === "super-admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (userRole === "company") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (userRole === "candidate") {
        return NextResponse.redirect(new URL("/candidate", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    
    // Prevent candidates from accessing company/admin routes
    if (userRole === "candidate") {
      if (companyOnlyRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/candidate", request.url));
      }
      // Candidates can only access candidate routes
      if (!pathname.startsWith("/candidate")) {
        return NextResponse.redirect(new URL("/candidate", request.url));
      }
    }
    
    // Prevent non-candidates from accessing candidate dashboard
    if (pathname.startsWith("/candidate") && userRole !== "candidate") {
      if (userRole === "super-admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (userRole === "company") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
    
    // Allow super-admin users to access both admin and company dashboards
    // No automatic redirect from dashboard for super-admin users

    // Check super-admin routes
    if (superAdminRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== "super-admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    
    // Prevent super-admin from accessing regular dashboard unless explicitly allowed
    if (pathname.startsWith("/dashboard") && userRole === "super-admin") {
      // Allow super-admin to access specific dashboard routes if needed
      const allowedDashboardRoutes = ["/dashboard/settings", "/dashboard/profile"];
      if (!allowedDashboardRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    // Check admin routes
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== "super-admin" && userRole !== "company") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Add user info to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.user.id || '');
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-company-id', session.user.companyId || '');
    
    // For super admins, ensure they can access admin routes even without companyId
    if (userRole === 'super-admin') {
      requestHeaders.set('x-super-admin', 'true');
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

async function handleCandidateEmailAccess(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  
  // Check if this is an interview route
  const isInterviewRoute = pathname.includes('/candidate/interview/');
  
  if (isInterviewRoute) {
    // For interview routes, candidate must be authenticated via session
    // AND must have come from the authenticated dashboard (no direct access)
    try {
      const sessionToken = request.cookies.get('candidate-auth.session-token') || 
                           request.cookies.get('__Secure-candidate-auth.session-token');
      
      if (!sessionToken) {
        console.log('No candidate session found, redirecting to signin');
        return NextResponse.redirect(new URL('/candidate/signin?message=Please login to access your interview', request.url));
      }

      // Check if request came from authenticated dashboard
      const isAuthenticated = searchParams.get('authenticated') === 'true';
      if (!isAuthenticated) {
        console.log('Direct interview access attempted, redirecting to dashboard');
        return NextResponse.redirect(new URL('/candidate?message=Please start your interview from the dashboard', request.url));
      }
      
      // Add session info to headers for further validation
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-candidate-authenticated', 'true');
      requestHeaders.set('x-dashboard-access', 'true');
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('Candidate authentication error:', error);
      return NextResponse.redirect(new URL('/candidate/signin?message=Authentication required', request.url));
    }
  }
  
  // For non-interview routes, allow email-based access (backward compatibility)
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.redirect(new URL('/candidate/signin', request.url));
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.redirect(new URL('/candidate/signin', request.url));
  }

  // Add candidate info to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-candidate-email', email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

async function handleCandidateDashboardAccess(request: NextRequest) {
  // Check for candidate session using NextAuth
  try {
    // Get the candidate session cookie
    const sessionToken = request.cookies.get('candidate-auth.session-token') || request.cookies.get('__Secure-candidate-auth.session-token');
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/candidate/signin', request.url));
    }

    // For candidate routes, we need to verify the session is for a candidate
    // This will be handled by the CandidateSessionProvider on the client side
    return NextResponse.next();
  } catch (error) {
    console.error('Candidate dashboard access validation error:', error);
    return NextResponse.redirect(new URL('/candidate/signin', request.url));
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
