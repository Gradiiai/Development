'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface CandidateAuthProviderProps {
  children: ReactNode;
}

export default function CandidateAuthProvider({ children }: CandidateAuthProviderProps) {
  return (
    <SessionProvider 
      basePath="/api/candidate-auth"
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}