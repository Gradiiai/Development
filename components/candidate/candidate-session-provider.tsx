"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface CandidateSessionProviderProps {
  children: ReactNode;
}

export function CandidateSessionProvider({ children }: CandidateSessionProviderProps) {
  return (
    <SessionProvider basePath="/api/candidate-auth">
      {children}
    </SessionProvider>
  );
}