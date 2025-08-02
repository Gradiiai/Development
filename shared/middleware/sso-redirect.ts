import { NextRequest, NextResponse } from 'next/server';

/**
 * SSO Redirect Middleware
 * Handles automatic redirects for company-specific SSO flows
 */
export async function ssoRedirectMiddleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Check if this is an auth page request
  if (!pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Skip middleware for SSO-specific pages
  if (
    pathname.startsWith('/auth/company/') ||
    pathname.startsWith('/auth/sso-discovery') ||
    pathname.includes('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Check for company parameter in URL
  const company = searchParams.get('company');
  const domain = searchParams.get('domain');
  const email = searchParams.get('email');

  // Redirect to company-specific SSO if company domain is provided
  if (domain) {
    const url = request.nextUrl.clone();
    url.pathname = `/auth/company/${domain}`;
    url.searchParams.delete('domain');
    return NextResponse.redirect(url);
  }

  // Redirect to company-specific SSO if company parameter is provided
  if (company) {
    const url = request.nextUrl.clone();
    url.pathname = `/auth/company/${company}`;
    url.searchParams.delete('company');
    return NextResponse.redirect(url);
  }

  // If email is provided, check for SSO and redirect if found
  if (email && email.includes('@')) {
    try {
      const domain = email.split('@')[1];
      const response = await fetch(`${request.nextUrl.origin}/api/auth/domain-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hasSSO && data.company?.domain) {
          const url = request.nextUrl.clone();
          url.pathname = `/auth/company/${data.company.domain}`;
          url.searchParams.delete('email');
          return NextResponse.redirect(url);
        }
      }
    } catch (error) {
      console.error('SSO redirect middleware error:', error);
    }
  }

  return NextResponse.next();
}

/**
 * Helper function to extract domain from email
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }
  return email.split('@')[1].toLowerCase();
}

/**
 * Helper function to validate company domain
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
}

/**
 * Helper function to check if a request is from a mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export default ssoRedirectMiddleware;