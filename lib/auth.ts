import { auth } from "@/auth";

// Export authOptions for backward compatibility
// This is a wrapper around the NextAuth v5 auth function
export const authOptions = {
  // This is a placeholder for backward compatibility
  // The actual auth configuration is in /auth.ts
};

// Re-export the auth function from NextAuth v5
export { auth };

// Helper function to get server session (NextAuth v5 compatible)
export async function getServerSession() {
  return await auth();
}