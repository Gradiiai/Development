"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, Settings, ChevronDown, BarChart3, Users, FileText, Briefcase, Brain, Bell, Search, Home } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Navbar1 = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { data: session } = useSession();
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Job Campaigns", href: "/dashboard/job-campaign", icon: Briefcase },
    { name: "Candidates", href: "/dashboard/candidates", icon: Users },
    { name: "Interview Management", href: "/dashboard/interviews", icon: Users },
    { name: "Question Bank", href: "/dashboard/question-bank", icon: FileText },
    { name: "Unified Analytics", href: "/dashboard/unified-analytics", icon: BarChart3 },
    { name: "Templates", href: "/dashboard/templates", icon: FileText },
  ];

  const isActive = (href: string): boolean => pathname === href;

  return (
    <nav className="bg-white/98 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/30 shadow-xl shadow-gray-900/5">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo - Enhanced modern design */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25 ring-1 ring-white/20">
                <span className="text-white font-bold text-xl tracking-tight">G</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">GradiiAI</span>
              <span className="text-xs font-medium text-gray-500 -mt-1 tracking-wide">DASHBOARD</span>
            </div>
          </div>

          {/* Desktop Navigation - Enhanced modern design */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                    isActive(item.href)
                      ? "bg-white/20 text-gray-800 border border-gray-200/30"
                      : "text-gray-600 hover:text-blue-600 hover:bg-white/80 hover:shadow-md"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-all duration-300 ${
                    isActive(item.href) ? "text-gray-800" : "text-gray-500 group-hover:text-blue-600"
                  }`} />
                  <span>{item.name}</span>
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 rounded-xl border border-gray-200/30"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side utilities - Enhanced design */}
          <div className="hidden md:flex items-center space-x-3">
            {session ? (
              <>
                {/* Quick Search - Enhanced */}
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search anything..."
                    className="w-72 px-5 py-3 pl-12 text-sm bg-white/80 border border-gray-200/50 rounded-2xl focus:outline-none focus:bg-white placeholder-gray-400 shadow-sm hover:shadow-md"
                  />
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <div className="absolute right-3 top-3 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-medium">⌘K</div>
                </div>
                
                {/* Notifications - Enhanced */}
                <button className="relative p-3 rounded-2xl text-gray-500 hover:text-blue-600 hover:bg-white/80 hover:shadow-md transition-all duration-300 group">
                  <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white shadow-lg">
                    <span className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping opacity-75"></span>
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 text-xs font-bold text-white bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">3</span>
                </button>
                
                {/* User Profile */}
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-700 hover:bg-white/80 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white group-hover:scale-105 transition-transform duration-200">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="text-left hidden xl:block">
                      <div className="text-sm font-medium text-gray-800">
                        {session.user?.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Admin
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-4 w-72 bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/30 py-4 overflow-hidden ring-1 ring-black/5"
                      >
                        <div className="px-6 py-5 border-b border-gray-100/80">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white">
                                <User className="w-6 h-6 text-white" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold text-gray-900">
                                {session.user?.name || "User"}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {session.user?.email}
                              </p>
                              <div className="flex items-center mt-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-xs font-medium text-green-600">Online</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-3">
                          <button
                            className="flex items-center w-full px-6 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50/80 hover:text-blue-600 transition-all duration-300 group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="w-5 h-5 mr-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                            <span>My Profile</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            </div>
                          </button>
                          <Link
                            href="/dashboard/settings"
                            className="flex items-center w-full px-6 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50/80 hover:text-blue-600 transition-all duration-300 group"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings className="w-5 h-5 mr-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                            <span>Settings</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            </div>
                          </Link>
                          <div className="border-t border-gray-100/80 my-3 mx-3"></div>
                          <button
                            onClick={() => {
                              signOut();
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center w-full px-6 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50/80 hover:text-red-700 transition-all duration-300 group"
                          >
                            <LogOut className="w-5 h-5 mr-4 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                            <span>Sign Out</span>
                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button - Enhanced */}
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="p-3 rounded-2xl text-gray-500 hover:text-blue-600 hover:bg-white/80 hover:shadow-md transition-all duration-300 group"
            >
              {isOpen ? 
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" /> : 
                <Menu className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-gray-200/30 shadow-xl"
          >
            <div className="px-6 py-6 space-y-3">
              {/* Mobile search - Enhanced */}
              <div className="relative mb-6 group">
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-full px-5 py-4 pl-12 text-sm bg-white/80 border border-gray-200/50 rounded-2xl focus:outline-none focus:bg-white placeholder-gray-400 shadow-sm"
                />
                <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                <div className="absolute right-4 top-4 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg font-medium">⌘K</div>
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-4 w-full px-5 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 group ${
                      isActive(item.href)
                        ? "bg-white/20 text-gray-800 border border-gray-200/30"
                        : "text-gray-600 hover:text-blue-600 hover:bg-white/80 hover:shadow-md"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-all duration-300 ${
                      isActive(item.href) ? "text-gray-800" : "text-gray-500 group-hover:text-blue-600"
                    }`} />
                    <span>{item.name}</span>
                    {isActive(item.href) && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-lg"></div>
                    )}
                  </Link>
                );
              })}
              
              {session && (
                <div className="border-t border-gray-200/50 pt-6 mt-6">
                  <div className="flex items-center px-5 py-4 mb-4 bg-gradient-to-r from-gray-50/80 to-blue-50/30 rounded-2xl border border-gray-200/30">
                    <div className="relative mr-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">
                        {session.user?.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Administrator
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-xs font-medium text-green-600">Online</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center w-full px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-white/80 hover:text-blue-600 hover:shadow-md rounded-2xl transition-all duration-300 mb-3 group"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="w-5 h-5 mr-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                    <span>Settings</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="flex items-center w-full px-5 py-4 text-sm font-semibold text-red-600 hover:bg-red-50/80 hover:text-red-700 hover:shadow-md rounded-2xl transition-all duration-300 group"
                  >
                    <LogOut className="w-5 h-5 mr-4 text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    <span>Sign Out</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar1;