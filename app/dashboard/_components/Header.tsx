"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/shared/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/shared/dropdown-menu";
import { Briefcase, Bell, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { motion } from "framer-motion";
import Link from "next/link";

const Header = () => {
  const { data: session } = useSession();
  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-strong sticky top-0 z-10 border-b border-white/30 shadow-glow-subtle"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-lg shadow-glow-subtle">
                <Briefcase className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text-teal">
                  Gradii
                </h1>
                <p className="text-sm text-gray-600">
                  Manage and track candidate interviews efficiently
                </p>
              </div>
            </Link>
          </motion.div>
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-teal-50 text-teal-600 transition-colors shadow-soft">
              <Bell className="h-5 w-5" />
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-teal-50 text-teal-600 transition-colors shadow-soft">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="glass-card p-2 rounded-lg gradient-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                      <AvatarFallback>{session?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="px-2 py-1.5 text-xs text-gray-500">
                    {session?.user?.email}
                  </div>
                  <div className="border-t my-1"></div>
                  <Link href="/dashboard/settings">
                     <DropdownMenuItem>
                       <Settings className="mr-2 h-4 w-4" />
                       Settings
                     </DropdownMenuItem>
                   </Link>
                   <Link href="/dashboard/limits">
                     <DropdownMenuItem>
                       <BarChart3 className="mr-2 h-4 w-4" />
                       Usage Limits
                     </DropdownMenuItem>
                   </Link>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
