import NextAuth from "next-auth";
import type { NextAuthConfig, User, Account, Profile } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { RedisAdapter } from "@/lib/auth/redis-adapter";
import { db } from "@/lib/database/connection";
import { candidateUsers } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const candidateAuthOptions: NextAuthConfig = {
  basePath: "/api/candidate-auth",
  trustHost: true, // Add this for NextAuth v5
  // Using JWT strategy for credentials - Redis adapter would conflict with credentials provider
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const candidateUser = await db
          .select()
          .from(candidateUsers)
          .where(eq(candidateUsers.email, credentials.email as string))
          .limit(1);

        if (!candidateUser.length) {
          return null;
        }

        const user = candidateUser[0];

        if (!user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.profileImage,
          role: "candidate",
          companyId: "",
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),

  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `candidate-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `candidate-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `candidate-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/candidate/signin",
    error: "/candidate/auth/error",
    verifyRequest: "/candidate/auth/verify-request",
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user already exists
          const existingUser = await db
            .select()
            .from(candidateUsers)
            .where(eq(candidateUsers.email, user.email!))
            .limit(1);

          if (!existingUser.length) {
            // Create new candidate user from OAuth
            const [firstName, ...lastNameParts] = (user.name || "").split(" ");
            const lastName = lastNameParts.join(" ");

            await db.insert(candidateUsers).values({
              email: user.email!,
              firstName: firstName || "",
              lastName: lastName || "",
              profileImage: user.image,
              isEmailVerified: true,
              emailVerified: new Date(),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          return true;
        } catch (error) {
          console.error("OAuth sign-in error:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }: { token: any; user?: User; account?: Account | null }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        session.user.role = token.role as string || "candidate";
        session.user.companyId = token.companyId as string || "";
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }: { user: User; account: Account | null; isNewUser?: boolean }) {
      // Track sign-in events
      console.log(`Candidate signed in: ${user.email}`);
    },
    async signOut(message) {
      // Session cleanup is handled by Redis adapter
      console.log('Candidate signed out');
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(candidateAuthOptions);
export { candidateAuthOptions };