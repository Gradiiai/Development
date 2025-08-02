'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/shared/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import {
  Plus,
  Building2,
  Users,
  FileText,
  CreditCard,
  X,
} from 'lucide-react';

interface FloatingActionButtonProps {
  onCreateCompany?: () => void;
  onCreateUser?: () => void;
  onCreateReport?: () => void;
  onCreateSubscription?: () => void;
}

export function FloatingActionButton({
  onCreateCompany,
  onCreateUser,
  onCreateReport,
  onCreateSubscription,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      label: 'Add Company',
      icon: Building2,
      onClick: onCreateCompany,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      label: 'Add User',
      icon: Users,
      onClick: onCreateUser,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
      label: 'Create Report',
      icon: FileText,
      onClick: onCreateReport,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      label: 'Add Subscription',
      icon: CreditCard,
      onClick: onCreateSubscription,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <span className="text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap">
                  {action.label}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    action.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`w-12 h-12 rounded-full shadow-lg ${action.bgColor} border border-gray-200 hover:shadow-xl transition-all duration-200`}
                >
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 border-0"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </Button>
      </motion.div>
    </div>
  );
}