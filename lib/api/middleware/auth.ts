import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { AuthenticationError, AuthorizationError } from '../errors';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string | null;
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const session = await auth();
  
  if (!session?.user) {
    throw new AuthenticationError();
  }

  return {
    user: {
      id: session.user.id!,
      email: session.user.email!,
      role: session.user.role,
      companyId: session.user.companyId
    }
  };
}

export async function requireRole(
  request: NextRequest,
  requiredRole: string
): Promise<AuthContext> {
  const context = await requireAuth(request);
  
  if (!hasPermission(context.user.role, requiredRole)) {
    throw new AuthorizationError();
  }

  return context;
}

export async function requireAdmin(request: NextRequest): Promise<AuthContext> {
  return requireRole(request, 'super-admin');
}

export async function requireCompanyOrAdmin(request: NextRequest): Promise<AuthContext> {
  return requireRole(request, 'company');
}

function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    'super-admin': 3,
    'company': 2,
    'candidate': 1
  };

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}
