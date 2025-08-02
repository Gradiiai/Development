'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const routeLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/companies': 'Companies',
  '/admin/users': 'Users',
  '/admin/analytics': 'Analytics',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/reports': 'Reports',
  '/admin/security': 'Security',
  '/admin/settings': 'Settings',
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumb items from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbItems(pathname);

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <Link
          href="/admin"
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <Home className="w-4 h-4" />
        </Link>
      </motion.div>

      {breadcrumbItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center space-x-1"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
          
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:underline"
            >
              <span className="flex items-center space-x-1">
                {item.icon && <item.icon className="w-4 h-4" />}
                <span>{item.label}</span>
              </span>
            </Link>
          ) : (
            <span className="text-gray-900 font-medium flex items-center space-x-1">
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </span>
          )}
        </motion.div>
      ))}
    </nav>
  );
}

function generateBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Skip the first segment if it's 'admin'
  const relevantSegments = segments[0] === 'admin' ? segments.slice(1) : segments;

  relevantSegments.forEach((segment, index) => {
    const path = '/admin' + (index === 0 ? `/${segment}` : `/${relevantSegments.slice(0, index + 1).join('/')}`);
    const isLast = index === relevantSegments.length - 1;
    
    items.push({
      label: routeLabels[path] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : path,
    });
  });

  return items;
}

// Breadcrumb components for more granular control
export function BreadcrumbList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ol className={cn('flex items-center space-x-1', className)}>
      {children}
    </ol>
  );
}

export function BreadcrumbItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li className={cn('flex items-center', className)}>
      {children}
    </li>
  );
}

export function BreadcrumbLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:underline',
        className
      )}
    >
      {children}
    </Link>
  );
}

export function BreadcrumbPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-gray-900 font-medium', className)}>
      {children}
    </span>
  );
}

export function BreadcrumbSeparator({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-gray-400', className)}>
      {children || <ChevronRight className="w-4 h-4" />}
    </span>
  );
}