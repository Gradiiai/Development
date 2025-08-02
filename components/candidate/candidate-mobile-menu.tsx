"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  FileText,
  Calendar,
  MessageSquare,
  Settings,
  Briefcase,
  Bell,
  FolderOpen,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { signOut } from "next-auth/react";

const navigation = [
  {
    name: "Dashboard",
    href: "/candidate",
    icon: Home,
  },
  {
    name: "Applications",
    href: "/candidate/applications",
    icon: Briefcase,
  },
  {
    name: "Interviews",
    href: "/candidate/interviews",
    icon: Calendar,
  },
  {
    name: "Profile",
    href: "/candidate/profile",
    icon: User,
  },
  {
    name: "Documents",
    href: "/candidate/documents",
    icon: FolderOpen,
  },
  {
    name: "Messages",
    href: "/candidate/messages",
    icon: MessageSquare,
  },
  {
    name: "Notifications",
    href: "/candidate/notifications",
    icon: Bell,
  },
  {
    name: "Settings",
    href: "/candidate/settings",
    icon: Settings,
  },
];

interface CandidateMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CandidateMobileMenu({ isOpen, onClose }: CandidateMobileMenuProps) {
  const pathname = usePathname();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 flex z-40">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-white" aria-hidden="true" />
                  </Button>
                </div>
              </Transition.Child>
              
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <Link href="/candidate" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Portal</span>
                  </Link>
                </div>
                
                <nav className="mt-5 px-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                          isActive
                            ? "bg-blue-100 text-blue-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "mr-4 h-6 w-6",
                            isActive
                              ? "text-blue-500"
                              : "text-gray-400 group-hover:text-gray-500"
                          )}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              
              <div className="flex-shrink-0 border-t border-gray-200 p-4 space-y-4">
                {/* Logout Button */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => {
                    onClose();
                    signOut({ callbackUrl: "/candidate/signin" });
                  }}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </Button>
                
                <div className="bg-blue-50 rounded-lg p-3 w-full">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Complete Profile
                      </h3>
                      <p className="text-xs text-blue-600 mt-1">
                        75% complete
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="bg-blue-200 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
          
          <div className="flex-shrink-0 w-14">
            {/* Force sidebar to shrink to fit close icon */}
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}