import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Building2, User, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPlanConfig } from '@/lib/plan-config';

interface RecentActivityProps {
  recentCompanies: Array<{
    id: string;
    name: string;
    domain: string;
    subscriptionPlan: string | null;
    createdAt: Date;
  }>;
}

export function RecentActivity({ recentCompanies }: RecentActivityProps) {
  const formatTimeAgo = (date: Date) => {
    try {
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return `${Math.floor(diffInHours / 168)}w ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  // Use actual recent companies data
  const displayCompanies = recentCompanies || [];

  const getPlanBadge = (plan: string | null) => {
    const planConfig = getPlanConfig(plan || 'free');
    return (
      <Badge className={planConfig.color}>
        {planConfig.label}
      </Badge>
    );
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-5 h-5" />
          </motion.div>
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="flex-shrink-0"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <Building2 className="w-8 h-8 text-gray-400 bg-white p-1.5 rounded-full shadow-sm" />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{company.name}</p>
                  <p className="text-xs text-gray-500">{company.domain}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getPlanBadge(company.subscriptionPlan)}
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(company.createdAt)}
                </span>
              </div>
            </motion.div>
          ))}
          
          {recentCompanies.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8 text-gray-500"
            >
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}