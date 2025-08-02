'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Bell, Search, LogOut, User, Settings, Crown, X, Building2, Users as UsersIcon, Mail, Phone, ChevronDown, Shield, Sparkles, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shared/avatar';
import { Badge } from '@/components/ui/shared/badge';

import { Card, CardContent } from '@/components/ui/shared/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  stats?: {
    activeSubscriptions?: number;
    totalUsers?: number;
  };
}

export function AdminHeader({ user, stats }: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(3);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real search functionality with database queries
  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setShowSearchResults(true);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Load real notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/admin/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to empty array
        setNotifications([]);
      }
    };
    
    fetchNotifications();
  }, []);

  return (
    <header className="bg-white/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="relative search-container group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search companies, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none w-80 bg-gray-50/50 focus:bg-white text-gray-900"
            />
            
            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && (searchResults.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      Searching...
                    </div>
                  ) : (
                    <div className="p-2">
                      {searchResults.map((result, index) => (
                        <motion.div
                          key={`${result.type}-${result.id}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center space-x-3 p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg cursor-pointer transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                            {result.type === 'company' ? (
                              <Building2 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <UsersIcon className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                              {result.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.email}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={result.type === 'company' ? 'secondary' : 'outline'} className={`text-xs ${result.type === 'company' ? 'bg-blue-100 text-blue-700' : 'border-green-200 text-green-700'}`}>
                                {result.type === 'company' ? result.plan : result.role}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {searchResults.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                          No results found
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 mr-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {stats?.activeSubscriptions || 0} Active
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {stats?.totalUsers || 0} Users
              </span>
            </div>
          </div>
          
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-blue-50 rounded-xl transition-all duration-200">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                </motion.div>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge 
                      variant="destructive" 
                      className="h-5 w-5 flex items-center justify-center text-xs p-0 bg-gradient-to-r from-red-500 to-pink-500"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 bg-white/95 backdrop-blur-xl border-gray-200/50 shadow-2xl">
              <DropdownMenuLabel className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-1.5 shadow-sm ${
                          notification.type === 'success' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          notification.type === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                          notification.type === 'error' ? 'bg-gradient-to-r from-red-400 to-pink-500' :
                          'bg-gradient-to-r from-blue-400 to-indigo-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2 font-medium">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center"
                    >
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium">No notifications</p>
                      <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                    </motion.div>
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" className="w-full text-sm">
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2 hover:bg-blue-50 transition-colors rounded-xl">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Avatar className="w-8 h-8 ring-2 ring-blue-100">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-blue-600 font-medium">Super Admin</p>
                </div>
                <motion.div
                  animate={{ rotate: 0 }}
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </motion.div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white/95 backdrop-blur-xl border-gray-200/50 shadow-2xl" align="end" forceMount>
              <DropdownMenuLabel className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 ring-2 ring-blue-100">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <Badge variant="secondary" className="text-xs mt-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem className="flex items-center space-x-3 cursor-pointer p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                <div className="p-2 rounded-lg bg-blue-100">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="font-medium">Profile</span>
                  <p className="text-xs text-gray-500">Manage your account</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center space-x-3 cursor-pointer p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Settings className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <span className="font-medium">Settings</span>
                  <p className="text-xs text-gray-500">Configure preferences</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem 
                onClick={() => {
                  toast.success('Signing out...');
                  handleSignOut();
                }}
                className="flex items-center space-x-3 cursor-pointer p-3 text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 focus:text-red-600 transition-all"
              >
                <div className="p-2 rounded-lg bg-red-100">
                  <LogOut className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <span className="font-medium">Sign out</span>
                  <p className="text-xs text-red-400">End your session</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}