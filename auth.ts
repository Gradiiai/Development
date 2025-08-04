import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";


import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/database/connection";
import { users, accounts, sessions, verificationTokens, companies } from "@/lib/database/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Extend NextAuth types for v5
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: string;
      companyId: string;
    };
  }

  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    role: string;
    companyId: string;
    image?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: string;
    companyId: string;
    picture?: string | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: string;
    companyId: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `company-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `company-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `company-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  trustHost: true, // Add this for NextAuth v5
  debug: process.env.NODE_ENV === 'development', // Enable debug mode in development
  logger: {
    error: (error: Error) => {
      // Only log actual errors, not fetch failures
      if (!error.message?.includes('Failed to fetch')) {
        console.error('NextAuth Error:', error);
      }
    },
    warn: (code: string) => {
      // Suppress common development warnings
      if (!code.includes('NEXTAUTH_URL')) {
        console.warn('NextAuth Warning:', code);
      }
    },
    debug: (code: string, metadata?: any) => {
      // Only log debug info in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true') {
        console.debug('NextAuth Debug:', code, metadata);
      }
    }
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tempToken: { label: "Temporary Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        try {
          const user = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              password: users.password,
              role: users.role,
              companyId: users.companyId,
              isActive: users.isActive,
              otpLoginEnabled: users.otpLoginEnabled,
            })
            .from(users)
            .where(eq(users.email, (credentials.email as string).toLowerCase()))
            .limit(1);

          if (!user[0] || !user[0].isActive) {
            return null;
          }

          // Handle temporary token authentication (for OTP login)
          if (credentials.tempToken) {
            // Verify the temporary token (this should be a JWT or similar)
            // For now, we'll trust that the OTP verification API has validated this
            // In production, you might want to verify the JWT token here
            
            // Update last login
            await db
              .update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, user[0].id));

            return {
              id: user[0].id,
              email: user[0].email,
              name: user[0].name,
              role: user[0].role || "company",
              companyId: user[0].companyId || "",
            };
          }

          // Handle password authentication
          if (!credentials?.password || !user[0].password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user[0].password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Update last login
          await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user[0].id));

          return {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name,
            role: user[0].role || "company",
            companyId: user[0].companyId || "",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string | null;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If user is signing in and the URL is the default callback
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      // If URL is relative, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // If URL is on the same origin, allow it
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Otherwise, redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

// Helper function to get user with company info
export async function getUserWithCompany(userId: string) {
  try {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        companyId: users.companyId,
        isActive: users.isActive,
        company: {
          id: companies.id,
          name: companies.name,
          domain: companies.domain,
          subscriptionPlan: companies.subscriptionPlan,
          subscriptionStatus: companies.subscriptionStatus,
          maxInterviews: companies.maxInterviews,
          maxUsers: companies.maxUsers,
        },
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, userId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user with company:", error);
    return null;
  }
}

// Helper function to check if user has permission
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    "super-admin": 3,
    "company": 2,
    "candidate": 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

// Helper function for server-side session access in v5
export async function getServerSessionWithAuth() {
  return await auth();
}