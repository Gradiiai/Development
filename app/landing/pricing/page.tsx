import React from 'react';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import Link from 'next/link';
import { 
  Check, 
  X, 
  ArrowRight,
  Star,
  Users,
  Zap,
  Building,
  Crown
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  planName: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxInterviews: number;
  maxUsers: number;
  features: string[] | null;
  isActive: boolean;
  featured?: boolean;
}

// Static pricing plans data
const staticPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    planName: 'Starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started with AI-powered interviews',
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxInterviews: 50,
    maxUsers: 3,
    features: [
      'Up to 50 interviews per month',
      '3 team members',
      'Behavioral & Technical interviews',
      'AI-powered scoring',
      'Basic analytics',
      'Email support'
    ],
    isActive: true,
    featured: false
  },
  {
    id: 'scale',
    planName: 'Scale',
    name: 'Scale',
    description: 'Ideal for growing companies scaling their hiring process',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    maxInterviews: 200,
    maxUsers: 10,
    features: [
      'Up to 200 interviews per month',
      '10 team members',
      'All interview types',
      'Advanced AI analytics',
      'Custom question banks',
      'Priority support',
      'Integrations'
    ],
    isActive: true,
    featured: true
  },
  {
    id: 'enterprise',
    planName: 'Enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced hiring needs',
    monthlyPrice: 399,
    yearlyPrice: 3990,
    maxInterviews: 1000,
    maxUsers: 50,
    features: [
      'Up to 1000 interviews per month',
      '50 team members',
      'All features included',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Advanced security'
    ],
    isActive: true,
    featured: false
  },
  {
    id: 'custom',
    planName: 'Custom',
    name: 'Custom',
    description: 'Tailored solutions for enterprise-scale hiring',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxInterviews: -1,
    maxUsers: -1,
    features: [
      'Unlimited interviews',
      'Unlimited team members',
      'Custom features',
      'White-label solution',
      'Dedicated account manager',
      'Custom SLA',
      'On-premise deployment'
    ],
    isActive: true,
    featured: false
  }
];

// Static features comparison data
const features = [
  {
    name: 'Monthly Interviews',
    values: ['50', '200', '1000', 'Unlimited']
  },
  {
    name: 'Team Members',
    values: ['3', '10', '50', 'Unlimited']
  },
  {
    name: 'Interview Types',
    values: ['Basic', 'All Types', 'All Types', 'All Types']
  },
  {
    name: 'AI Scoring',
    values: [true, true, true, true]
  },
  {
    name: 'Analytics',
    values: ['Basic', 'Advanced', 'Advanced', 'Custom']
  },
  {
    name: 'Custom Branding',
    values: [false, false, true, true]
  },
  {
    name: 'API Access',
    values: [false, true, true, true]
  },
  {
    name: 'Priority Support',
    values: [false, true, true, true]
  },
  {
    name: 'SLA',
    values: [false, false, '99.9%', 'Custom']
  }
];

const PricingPage = () => {
  const isYearly = true; // Default to yearly pricing
  // Ensure all plans have required properties with defaults
  const plans = staticPlans.map(plan => ({
    ...plan,
    featured: plan.featured || false,
    name: plan.name || plan.planName,
    description: plan.description || `Perfect for ${plan.planName.toLowerCase()} teams`,
    features: plan.features || []
  })).filter(plan => plan && plan.planName); // Filter out any undefined plans

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Zap className="w-6 h-6 text-blue-500" />;
      case 'scale':
        return <Star className="w-6 h-6 text-purple-500" />;
      case 'enterprise':
        return <Building className="w-6 h-6 text-green-500" />;
      case 'custom':
        return <Crown className="w-6 h-6 text-orange-500" />;
      default:
        return <Zap className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Custom';
    return price.toLocaleString();
  };

  const formatLimits = (limit: number) => {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
  };

  const getPlanColor = (planName: string, featured: boolean) => {
    if (featured) return 'bg-gradient-to-br from-purple-500 to-blue-600 text-white border-purple-500';
    
    switch (planName.toLowerCase()) {
      case 'starter':
        return 'bg-white border-blue-200 hover:border-blue-300';
      case 'scale':
        return 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 hover:border-purple-300';
      case 'enterprise':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300';
      case 'custom':
        return 'bg-gradient-to-br from-gray-900 to-black text-white border-gray-800';
      default:
        return 'bg-white border-gray-200 hover:border-gray-300';
    }
  };

  const features = [
    { name: 'Users', values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
    { name: 'People/Company searches', values: ['Up to 100/search', 'Up to 5,000/search', 'Up to 10,000/search', 'Up to 25,000/search', 'Up to 50,000/search'] },
    { name: 'Exporting', values: [true, true, true, true, true] },
    { name: 'AI/Gradiiagent', values: [true, true, true, true, true] },
    { name: 'Rollover credits', values: [true, true, true, true, true] },
    { name: '100+ integration providers', values: [true, true, true, true, true] },
    { name: 'Chrome extension', values: [true, true, true, true, true] },
    { name: 'Scheduling', values: [false, true, true, true, true] },
    { name: 'Phone number enrichments', values: [false, true, true, true, true] },
    { name: 'Use your own API keys', values: [false, true, true, true, true] },
    { name: 'Signals', values: [false, true, true, true, true] },
    { name: 'Integrate with any HTTP API', values: [false, false, true, true, true] },
    { name: 'Webhooks', values: [false, false, true, true, true] },
    { name: 'Email sequencing integrations', values: [false, false, true, true, true] }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section - Exact Clay.com layout */}
      <section className="pt-20 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Heading and description */}
            <div className="lg:pr-8">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Flexible, risk-free pricing
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Access 100+ interview templates, AI scoring, and automated workflows in one place with Gradii credits - no subscriptions needed.
              </p>
              <div className="flex gap-4">
                <Link href="/auth/signup">
                  <Button className="bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
                    Try for free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/landing/contact">
                  <Button 
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                  >
                    Talk to a Hiring Engineer
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side - Trust indicators */}
            <div className="lg:pl-8">
              <div className="text-center mb-8">
                <p className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  TRUSTED BY 300,000 LEADING HIRING TEAMS:
                </p>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">4.9 rating</span>
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">20K + hiring engineering community</span>
                </div>
              </div>

              {/* Company logos - Two rows exactly like Clay.com */}
              <div className="space-y-6">
                {/* First row */}
                <div className="flex justify-center items-center gap-8 flex-wrap">
                  {[
                    { name: 'Canva', hasCase: false },
                    { name: 'HubSpot', hasCase: false },
                    { name: 'Vanta', hasCase: true },
                    { name: 'INTERCOM', hasCase: false },
                    { name: 'Google', hasCase: false },
                    { name: 'OpenAI', hasCase: true },
                    { name: 'Webflow', hasCase: false },
                    { name: 'CURSOR', hasCase: false },
                    { name: 'ANTHROPIC', hasCase: false },
                    { name: 'Grafana Labs', hasCase: true }
                  ].map((company, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <span className="text-lg font-bold text-gray-700">{company.name}</span>
                      {company.hasCase && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                          Case study
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Second row */}
                <div className="flex justify-center items-center gap-8 flex-wrap">
                  {[
                    { name: 'ramp', hasCase: false },
                    { name: 'RIPPLING', hasCase: true },
                    { name: 'Notion', hasCase: false },
                    { name: 'perplexity', hasCase: false },
                    { name: 'Uber', hasCase: false },
                    { name: 'Figma', hasCase: false },
                    { name: 'Dropbox', hasCase: false },
                    { name: 'Verkada', hasCase: true },
                    { name: 'okta', hasCase: false },
                    { name: 'klaviyo', hasCase: false }
                  ].map((company, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <span className="text-lg font-bold text-gray-700">{company.name}</span>
                      {company.hasCase && (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                          Case study
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Exact Clay.com layout */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            {/* Compare our plans header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Compare our plans</h2>
              
              {/* Billing Information */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <Check className="w-5 h-5" />
                  <span>Annual billing - Save 10%</span>
                </div>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {plans.map((plan, index) => {
                  const isFeatured = plan.planName.toLowerCase() === 'scale';
                  const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                  const displayPrice = currentPrice === 0 ? 'Custom' : `$${formatPrice(isYearly ? Math.round(currentPrice / 12) : currentPrice)}`;
                  const period = currentPrice === 0 ? '' : isYearly ? '/month' : '/month';
                  const billing = currentPrice === 0 
                    ? 'Contact Sales' 
                    : isYearly 
                      ? 'Billed annually' 
                      : 'Billed monthly';

                  return (
                    <div 
                      key={plan.id} 
                      className={`rounded-2xl p-6 border-2 transition-all hover:scale-105 relative ${
                        getPlanColor(plan.planName, isFeatured)
                      } ${isFeatured ? 'transform scale-105 shadow-2xl' : 'shadow-lg'}`}
                    >
                      {/* Popular Badge */}
                      {isFeatured && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-white text-purple-600 font-semibold px-4 py-1">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <div className="flex items-center justify-center mb-3">
                          {getPlanIcon(plan.planName)}
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${
                          plan.planName === 'Custom' || isFeatured ? 'text-white' : 'text-gray-900'
                        }`}>
                          {plan.planName}
                        </h3>
                        <p className={`text-sm mb-4 ${
                          plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          {plan.description || `Perfect for ${plan.planName.toLowerCase()} teams`}
                        </p>
                        
                        <div className="mb-2">
                          <div className={`text-4xl font-bold ${
                            plan.planName === 'Custom' || isFeatured ? 'text-white' : 'text-gray-900'
                          }`}>
                            {displayPrice}
                            <span className="text-lg font-normal">{period}</span>
                          </div>
                          {isYearly && currentPrice > 0 && (
                            <div className={`text-sm ${
                              plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-500'
                            }`}>
                              ${formatPrice(plan.monthlyPrice)}/month billed monthly
                            </div>
                          )}
                        </div>
                        <p className={`text-sm ${
                          plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          {billing}
                        </p>
                      </div>
                      
                      {/* Plan Limits */}
                      <div className="mb-6 space-y-2">
                        <div className={`text-sm flex justify-between ${
                          plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          <span>Interviews/month:</span>
                          <span className="font-semibold">{formatLimits(plan.maxInterviews)}</span>
                        </div>
                        <div className={`text-sm flex justify-between ${
                          plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          <span>Team members:</span>
                          <span className="font-semibold">{formatLimits(plan.maxUsers)}</span>
                        </div>
                        <div className={`text-sm flex justify-between ${
                          plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          <span>Features:</span>
                          <span className="font-semibold">{plan.features?.length || 0}+</span>
                        </div>
                      </div>
                      
                      {plan.planName === 'Custom' ? (
                        <Link href="/landing/contact">
                          <Button className="w-full py-3 rounded-lg font-semibold transition-all bg-white text-gray-900 hover:bg-gray-100">
                            Contact Sales
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/auth/signup">
                          <Button className={`w-full py-3 rounded-lg font-semibold transition-all ${
                            isFeatured
                              ? 'bg-white text-purple-600 hover:bg-gray-100'
                              : 'bg-gray-900 text-white hover:bg-black'
                          }`}>
                            Start Free Trial
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      )}

                      {/* Features List */}
                      {plan.features && plan.features.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <ul className="space-y-2">
                            {plan.features.slice(0, 5).map((feature, featureIndex) => (
                              <li key={featureIndex} className={`text-sm flex items-start ${
                                plan.planName === 'Custom' || isFeatured ? 'text-gray-200' : 'text-gray-600'
                              }`}>
                                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                                {feature}
                              </li>
                            ))}
                            {plan.features.length > 5 && (
                              <li className={`text-sm ${
                                plan.planName === 'Custom' || isFeatured ? 'text-gray-300' : 'text-gray-500'
                              }`}>
                                +{plan.features.length - 5} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            {/* Feature Comparison Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-900 w-1/4"></th>
                      {plans.map((plan, index) => (
                        <th 
                          key={index} 
                          className={`text-center p-4 font-medium text-gray-900 ${
                            plan?.featured === true ? 'bg-yellow-50' : ''
                          }`}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, featureIndex) => (
                      <tr key={featureIndex} className="border-b border-gray-100">
                        <td className="p-4 font-medium text-gray-900">{feature.name}</td>
                        {feature.values.map((value, planIndex) => (
                          <td 
                            key={planIndex} 
                            className={`p-4 text-center ${
                              plans[planIndex]?.featured === true ? 'bg-yellow-50' : ''
                            }`}
                          >
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Check className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )
                            ) : (
                              <span className="text-gray-700 text-sm">{value}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;