'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shared/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/shared/dropdown-menu';
import { Button } from '@/components/ui/shared/button';
import { Menu as AnimatedMenu, MenuItem, HoveredLink } from '@/components/ui/animated-menu';
import { 
  Menu, 
  X, 
  ChevronDown, 
  Home, 
  Info, 
  DollarSign, 
  Mail, 
  FileText, 
  Code, 
  Shield, 
  ScrollText,
  LayoutDashboard,
  Users,
  UserCheck,
  Target,
  Building
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Main navigation items - clean structure without duplicates
  const mainNavigationItems: NavigationItem[] = [
    { name: 'Jobs', href: '/jobs' },
    { name: 'Product', href: '/landing/features' },
    { name: 'Solutions', href: '/landing/features' },
    { name: 'Company', href: '/landing/about' },
    { name: 'Enterprise', href: '/landing/contact' },
    { name: 'Pricing', href: '/landing/pricing' },
    { name: 'About', href: '/landing/about' },
  ];

  // Resources dropdown items
  const resourcesItems: NavigationItem[] = [
    { name: 'Documentation', href: '/landing/docs', icon: <FileText className="h-4 w-4" /> },
    { name: 'API Reference', href: '/landing/api-docs', icon: <Code className="h-4 w-4" /> },
    { name: 'Changelog', href: '/landing/changelog', icon: <ScrollText className="h-4 w-4" /> },
  ];

  // Legal dropdown items  
  const legalItems: NavigationItem[] = [
    { name: 'Privacy Policy', href: '/landing/privacy', icon: <Shield className="h-4 w-4" /> },
    { name: 'Terms & Conditions', href: '/landing/terms', icon: <ScrollText className="h-4 w-4" /> },
  ];

  // Candidate dropdown items
  const candidateItems: NavigationItem[] = [
    { name: 'Candidate Login', href: '/candidate/signin', icon: <UserCheck className="h-4 w-4" /> },
    { name: 'Candidate Signup', href: '/candidate/signup', icon: <Users className="h-4 w-4" /> },
  ];

  // HR/Recruiter dropdown items
  const hrItems: NavigationItem[] = [
    { name: 'HR Login', href: '/auth/signin', icon: <UserCheck className="h-4 w-4" /> },
    { name: 'HR Signup', href: '/auth/signup', icon: <Users className="h-4 w-4" /> },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                <path d="M8 16C8 13.5 9.5 12 12 12H20C22.5 12 24 13.5 24 16V20C24 22.5 22.5 24 20 24H12C9.5 24 8 22.5 8 20V16Z" fill="white"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">gradii</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <AnimatedMenu setActive={setActive}>
              {/* Main Navigation Items */}
              {mainNavigationItems.map((item) => (
                <Link key={item.name} href={item.href}>
                  <div 
                    className={`cursor-pointer px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out ${isActiveLink(item.href) ? 'text-orange-600' : 'text-gray-700'} hover:text-orange-600`}
                    onMouseEnter={() => setActive(null)}
                  >
                    {item.name}
                  </div>
                </Link>
              ))}

              {/* Resources Dropdown */}
              <MenuItem setActive={setActive} active={active} item="Resources">
                <div className="flex flex-col space-y-1 text-sm min-w-[200px]">
                  {resourcesItems.map((item) => (
                    <HoveredLink key={item.name} href={item.href} setActive={setActive} item="Resources">
                      <div className="flex items-center space-x-3">
                        <div className="text-orange-600">{item.icon}</div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </HoveredLink>
                  ))}
                </div>
              </MenuItem>

              {/* Legal Dropdown */}
              <MenuItem setActive={setActive} active={active} item="Legal">
                <div className="flex flex-col space-y-1 text-sm min-w-[180px]">
                  {legalItems.map((item) => (
                    <HoveredLink key={item.name} href={item.href} setActive={setActive} item="Legal">
                      <div className="flex items-center space-x-3">
                        <div className="text-orange-600">{item.icon}</div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </HoveredLink>
                  ))}
                </div>
              </MenuItem>
            </AnimatedMenu>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-1">
            {session ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-orange-600 hover:bg-orange-50 transition-all duration-200"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                        <AvatarFallback>{session.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <AnimatedMenu setActive={setActive}>
                  {/* Candidate Dropdown */}
                  <MenuItem setActive={setActive} active={active} item="Candidate">
                    <div className="flex flex-col space-y-1 text-sm min-w-[180px]">
                      {candidateItems.map((item) => (
                        <HoveredLink key={item.name} href={item.href} setActive={setActive} item="Candidate">
                          <div className="flex items-center space-x-3">
                            <div className="text-green-600">{item.icon}</div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </HoveredLink>
                      ))}
                    </div>
                  </MenuItem>
                </AnimatedMenu>

                {/* Get Demo Button */}
                <Link href="/landing/contact">
                  <div 
                    className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-all duration-300"
                  >
                    Get a demo
                  </div>
                </Link>

                {/* Login Button */}
                <Link href="/auth/signin">
                  <div 
                    className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-all duration-300"
                  >
                    Login
                  </div>
                </Link>

                {/* Sign Up Button */}
                <Link href="/auth/signup">
                  <Button 
                    className="bg-black hover:bg-gray-800 text-white transition-all duration-200 rounded-full px-6"
                  >
                    Sign up →
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-md"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Main Navigation Items */}
              {mainNavigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 hover:scale-105 ${
                    isActiveLink(item.href)
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Resources Section */}
              <div className="pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resources
                </div>
                {resourcesItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 hover:scale-105 ${
                      isActiveLink(item.href)
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </span>
                  </Link>
                ))}
              </div>

              {/* Legal Section */}
              <div className="pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Legal
                </div>
                {legalItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 hover:scale-105 ${
                      isActiveLink(item.href)
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </span>
                  </Link>
                ))}
              </div>

              {/* Mobile Auth Buttons */}
              <div className="pt-4 border-t border-gray-200/50">
                {session ? (
                  <div className="space-y-2">
                    <Link 
                      href="/dashboard"
                      className="block px-3 py-2 rounded-md text-base font-medium text-orange-600 hover:bg-orange-50 transition-all duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="flex items-center space-x-2">
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Dashboard</span>
                      </span>
                    </Link>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-gray-600">
                        Welcome, {session.user?.name || 'User'}!
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          signOut({ callbackUrl: '/auth/signin' });
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 px-3">
                    {/* Candidate Section */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        For Candidates
                      </div>
                      {candidateItems.map((item) => (
                        <Link key={item.name} href={item.href}>
                          <Button 
                            variant="outline" 
                            className="w-full border-green-600 text-green-600 hover:bg-green-50 flex items-center justify-center space-x-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </Button>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Auth Section */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Get Started
                      </div>
                      <Link href="/landing/contact">
                        <Button 
                          variant="outline" 
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>Get a demo</span>
                        </Button>
                      </Link>
                      <Link href="/auth/signin">
                        <Button 
                          variant="outline" 
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>Login</span>
                        </Button>
                      </Link>
                      <Link href="/auth/signup">
                        <Button 
                          className="w-full bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span>Sign up →</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};