"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/shared/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Menu,
  LogOut,
  User,
  MessageSquare,
  Briefcase,
  FolderOpen,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  {
    name: "Dashboard",
    href: "/candidate",
    icon: LayoutDashboard,
  },
  {
    name: "Jobs",
    href: "/candidate/jobs",
    icon: Briefcase,
  },
  {
    name: "Applications",
    href: "/candidate/applications",
    icon: FileText,
  },
  {
    name: "Interviews",
    href: "/candidate/interviews",
    icon: Calendar,
  },
  {
    name: "Messages",
    href: "/candidate/messages",
    icon: MessageSquare,
  },
  {
    name: "Documents",
    href: "/candidate/documents",
    icon: FolderOpen,
  },
  {
    name: "Profile",
    href: "/candidate/profile",
    icon: User,
  },
  {
    name: "Settings",
    href: "/candidate/settings",
    icon: Settings,
  },
];

export function CandidateSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link href="/candidate" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Portal</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-blue-700"
                    : "text-gray-400 group-hover:text-gray-500"
                )}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-gray-200 space-y-4">
        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={() => signOut({ callbackUrl: "/candidate/signin" })}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Complete Your Profile
              </h3>
              <p className="text-xs text-blue-600 mt-1">
                75% complete - Add skills to improve visibility
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/candidate/profile"
              className="text-xs font-medium text-blue-600 hover:text-blue-500"
            >
              Complete now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}