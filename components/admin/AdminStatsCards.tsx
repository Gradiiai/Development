import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Building2, Users, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminStatsCardsProps {
  stats: {
    totalCompanies: number;
    totalUsers: number;
    totalInterviews: number;
    subscriptionStats: Array<{ plan: string | null; count: number }>;
    completionStats: Array<{ status: boolean | null; count: number }>;
  };
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const paidSubscriptions = stats.subscriptionStats
    .filter(s => s.plan !== 'free')
    .reduce((acc, curr) => acc + curr.count, 0);

  const completedInterviews = stats.completionStats
    .filter(s => s.status === true)
    .reduce((acc, curr) => acc + curr.count, 0);

  const completionRate = stats.totalInterviews > 0 
    ? Math.round((completedInterviews / stats.totalInterviews) * 100)
    : 0;

  const cards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies.toLocaleString(),
      icon: Building2,
      description: `${paidSubscriptions} paid subscriptions`,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      textColor: 'text-gray-700',
      valueColor: 'text-gray-900',
      descColor: 'text-gray-600',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: 'Active platform users',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      textColor: 'text-gray-700',
      valueColor: 'text-gray-900',
      descColor: 'text-gray-600',
    },
    {
      title: 'Total Interviews',
      value: stats.totalInterviews.toLocaleString(),
      icon: FileText,
      description: `${completionRate}% completion rate`,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      textColor: 'text-gray-700',
      valueColor: 'text-gray-900',
      descColor: 'text-gray-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card className={`group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br ${card.bgGradient} hover:scale-105 cursor-pointer backdrop-blur-sm`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${card.textColor}`}>
                  {card.title}
                </CardTitle>
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className={`p-2 rounded-xl bg-gradient-to-r ${card.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </motion.div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl lg:text-3xl font-bold ${card.valueColor} mb-2`}>{card.value}</div>
                <p className={`text-xs lg:text-sm ${card.descColor} mt-2`}>{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}