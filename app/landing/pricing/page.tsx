'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  X, 
  ArrowRight,
  Star,
  Users
} from 'lucide-react';

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/auth/signup');
    }
  };

  const handleContactSales = () => {
    router.push('/landing/contact');
  };

  // Static pricing plans data matching Clay.com structure
  const plans = [
    {
      name: 'Free',
      price: 0,
      period: '/month',
      billing: 'Billed yearly. All credits granted upfront',
      credits: '1.2K credits/year',
      featured: false,
      buttonText: 'Try Gradii for free',
      buttonAction: handleGetStarted,
      buttonStyle: 'bg-black text-white hover:bg-gray-800'
    },
    {
      name: 'Starter',
      price: 134,
      period: '/month',
      billing: 'Billed yearly. All credits granted upfront',
      credits: '24K credits/year',
      featured: false,
      buttonText: 'Try for free',
      buttonAction: handleGetStarted,
      buttonStyle: 'bg-black text-white hover:bg-gray-800'
    },
    {
      name: 'Explorer',
      price: 314,
      period: '/month',
      billing: 'Billed yearly. All credits granted upfront',
      credits: '120K credits/year',
      featured: true,
      buttonText: 'Try for free',
      buttonAction: handleGetStarted,
      buttonStyle: 'bg-black text-white hover:bg-gray-800'
    },
    {
      name: 'Pro',
      price: 720,
      period: '/month',
      billing: 'Billed yearly. All credits granted upfront',
      credits: '600K credits/year',
      featured: false,
      buttonText: 'Try for free',
      buttonAction: handleGetStarted,
      buttonStyle: 'bg-black text-white hover:bg-gray-800'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      billing: 'Contact Sales',
      credits: 'Custom Credits',
      featured: false,
      buttonText: 'Contact Sales',
      buttonAction: handleContactSales,
      buttonStyle: 'bg-gray-900 text-white hover:bg-black'
    }
  ];

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
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:pr-8"
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Flexible, risk-free pricing
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Access 100+ interview templates, AI scoring, and automated workflows in one place with Gradii credits - no subscriptions needed.
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                  Try for free
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleContactSales}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                  Talk to a Hiring Engineer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* Right side - Trust indicators */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:pl-8"
            >
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Exact Clay.com layout */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            {/* Compare our plans header */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Compare our plans</h2>
              
              {/* Toggle - Pay Monthly vs Pay annually */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-gray-700">Pay Monthly</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="pricing-toggle"
                    checked={isYearly}
                    onChange={(e) => setIsYearly(e.target.checked)}
                    className="sr-only"
                  />
                  <label
                    htmlFor="pricing-toggle"
                    className={`flex items-center cursor-pointer w-14 h-7 bg-blue-600 rounded-full transition-colors ${
                      isYearly ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${
                        isYearly ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </label>
                </div>
                <span className="text-gray-700">Pay annually - 10% discount & all credits upfront</span>
              </div>
            </motion.div>

            {/* Pricing Cards */}
            <motion.div 
              className="grid md:grid-cols-5 gap-6 mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {plans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`rounded-2xl p-6 border-2 transition-all hover:scale-105 ${
                    plan.featured 
                      ? 'bg-yellow-400 border-yellow-500 transform scale-105' 
                      : plan.name === 'Enterprise'
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : index === 1
                      ? 'bg-purple-100 border-purple-200'
                      : index === 3
                      ? 'bg-pink-100 border-pink-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-center mb-6">
                    <h3 className={`text-lg font-semibold mb-4 ${plan.name === 'Enterprise' ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <div className="mb-2">
                      {plan.price === 'Custom' ? (
                        <div className={`text-2xl font-bold ${plan.name === 'Enterprise' ? 'text-white' : 'text-gray-900'}`}>
                          Custom
                        </div>
                      ) : (
                        <div className={`text-3xl font-bold ${plan.name === 'Enterprise' ? 'text-white' : 'text-gray-900'}`}>
                          ${plan.price}<span className="text-lg font-normal">{plan.period}</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${plan.name === 'Enterprise' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {plan.billing}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <select className={`w-full p-3 rounded-lg border ${
                      plan.name === 'Enterprise' 
                        ? 'bg-gray-800 border-gray-700 text-white' 
                        : 'bg-white border-gray-300'
                    }`}>
                      <option>{plan.credits}</option>
                    </select>
                  </div>
                  
                  <Button 
                    onClick={plan.buttonAction}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${plan.buttonStyle}`}
                  >
                    {plan.buttonText}
                    {plan.name !== 'Enterprise' && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              ))}
            </motion.div>

            {/* Feature Comparison Table */}
            <motion.div 
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-900 w-1/4"></th>
                      {plans.map((plan, index) => (
                        <th 
                          key={index} 
                          className={`text-center p-4 font-medium text-gray-900 ${
                            plan.featured ? 'bg-yellow-50' : ''
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
                              plans[planIndex].featured ? 'bg-yellow-50' : ''
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
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;