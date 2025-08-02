"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { CandidateNavbar } from "@/components/candidate/candidate-navbar";
import { CandidateSidebar } from "@/components/candidate/candidate-sidebar";
import { CandidateSessionProvider } from "@/components/candidate/candidate-session-provider";

interface CandidateLayoutProps {
  children: React.ReactNode;
}

export default function CandidateLayout({ children }: CandidateLayoutProps) {
  const pathname = usePathname();
  
  // Check if current path is an auth page (signin/signup)
  const isAuthPage = pathname?.includes('/signin') || pathname?.includes('/signup');
  
  if (isAuthPage) {
    return (
      <CandidateSessionProvider>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
        <Toaster />
      </CandidateSessionProvider>
    );
  }

  return (
    <CandidateSessionProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar for desktop */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <CandidateSidebar />
        </div>
        
        {/* Main content */}
        <div className="flex flex-col flex-1 lg:pl-64">
          {/* Top navigation */}
          <CandidateNavbar />
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </CandidateSessionProvider>
  );
}