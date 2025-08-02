'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { 
  Brain, 
  Video, 
  Calendar, 
  BarChart3, 
  FileText, 
  Shield, 
  Zap, 
  Users, 
  Clock, 
  Target, 
  Sparkles, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  TrendingUp, 
  MessageSquare, 
  Search, 
  Filter, 
  Globe, 
  Rocket, 
  Star, 
  Award, 
  Eye, 
  Mic, 
  Camera, 
  Database, 
  Settings, 
  Lock
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  size?: 'small' | 'medium' | 'large';
  isHighlighted?: boolean;
}

const FeaturesPage = () => {
  const FeatureCard = ({ icon: Icon, title, description, features, gradient, size = 'medium', isHighlighted = false }: FeatureCardProps) => {
    const sizeClasses = {
      small: 'md:col-span-1 md:row-span-1',
      medium: 'md:col-span-2 md:row-span-1',
      large: 'md:col-span-2 md:row-span-2'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className={`group ${sizeClasses[size]}`}
      >
        <Card className={`h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 rounded-3xl overflow-hidden ${
          isHighlighted ? 'ring-2 ring-blue-500/20' : ''
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className={`p-8 relative z-10 h-full flex flex-col ${
            size === 'large' ? 'justify-between' : 'justify-start'
          }`}>
            <div>
              <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              <h3 className={`font-bold text-gray-900 mb-4 ${
                size === 'large' ? 'text-3xl' : 'text-xl'
              }`}>{title}</h3>
              <p className={`text-gray-600 leading-relaxed mb-6 ${
                size === 'large' ? 'text-lg' : 'text-base'
              }`}>{description}</p>
            </div>
            
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            {size === 'large' && (
              <div className="mt-8">
                <Button className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const mainFeatures = [
    {
      icon: Brain,
      title: "AI-Powered Screening",
      description: "Advanced machine learning algorithms analyze resumes, cover letters, and applications to identify the best candidates automatically.",
      features: [
        "Smart resume parsing and analysis",
        "Skill matching and scoring",
        "Bias detection and mitigation",
        "Custom screening criteria"
      ],
      gradient: "from-blue-500 to-cyan-500",
      size: "large" as const,
      isHighlighted: true
    },
    {
      icon: Video,
      title: "Video Interview Analysis",
      description: "Real-time AI analysis of video interviews with sentiment analysis, speech patterns, and behavioral insights.",
      features: [
        "Real-time sentiment analysis",
        "Speech pattern recognition",
        "Facial expression analysis",
        "Automated transcription"
      ],
      gradient: "from-purple-500 to-pink-500",
      size: "medium" as const
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Intelligent scheduling system that coordinates between candidates and interviewers automatically.",
      features: [
        "Automated calendar integration",
        "Time zone optimization",
        "Reminder notifications",
        "Rescheduling management"
      ],
      gradient: "from-green-500 to-emerald-500",
      size: "medium" as const
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive analytics and reporting to track hiring metrics and optimize your recruitment process.",
      features: [
        "Real-time hiring metrics",
        "Candidate pipeline tracking",
        "Performance analytics",
        "Custom report generation"
      ],
      gradient: "from-orange-500 to-red-500",
      size: "medium" as const
    },
    {
      icon: FileText,
      title: "Resume Parser",
      description: "Extract and structure information from resumes in any format with 99% accuracy.",
      features: [
        "Multi-format support",
        "Structured data extraction",
        "Skill identification",
        "Experience mapping"
      ],
      gradient: "from-indigo-500 to-purple-500",
      size: "small" as const
    },
    {
      icon: Shield,
      title: "Bias Detection",
      description: "Advanced algorithms to identify and eliminate unconscious bias in hiring decisions.",
      features: [
        "Unconscious bias detection",
        "Fair scoring algorithms",
        "Diversity tracking",
        "Compliance reporting"
      ],
      gradient: "from-teal-500 to-blue-500",
      size: "small" as const
    }
  ];

  const additionalFeatures = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process thousands of applications in minutes, not hours.",
      stat: "10x Faster"
    },
    {
      icon: Target,
      title: "Precision Matching",
      description: "AI-powered matching with 95% accuracy in candidate-role fit.",
      stat: "95% Accuracy"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Seamless collaboration tools for hiring teams and stakeholders.",
      stat: "100% Sync"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Support for 50+ languages and international hiring compliance.",
      stat: "50+ Languages"
    }
  ];

  const integrations = [
    { name: "Slack", icon: MessageSquare },
    { name: "LinkedIn", icon: Users },
    { name: "Google Workspace", icon: Calendar },
    { name: "Microsoft Teams", icon: Video },
    { name: "Zoom", icon: Camera },
    { name: "Salesforce", icon: Database }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-white to-purple-100/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-200/50 text-sm px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="font-semibold">Powerful Features</span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Recruitment Suite
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Discover the comprehensive suite of AI-powered tools designed to 
              <span className="text-blue-600 font-semibold"> revolutionize your hiring process</span> from start to finish.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Button 
                size="lg" 
                className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Features Bento Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Core Features
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Everything you need to transform your recruitment process with cutting-edge AI technology.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {mainFeatures.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  key={index}
                  className="text-center group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {feature.stat}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Seamless Integrations
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Connect with your favorite tools and platforms for a unified hiring experience.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-4xl mx-auto">
            {integrations.map((integration, index) => {
              const Icon = integration.icon;
              return (
                <motion.div 
                  key={index}
                  className="group"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-6 text-center bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300 hover:shadow-lg rounded-2xl group-hover:scale-105">
                    <Icon className="h-8 w-8 text-gray-600 mx-auto mb-3 group-hover:text-blue-600 transition-colors" />
                    <p className="text-sm font-medium text-gray-700">{integration.name}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-purple-500/20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 bg-white/20 text-white border-white/30">
              <Lock className="h-4 w-4 mr-2" />
              Security & Compliance
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Enterprise-Grade
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Security & Privacy
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Your data is protected with bank-level security and full compliance with global privacy regulations.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Shield,
                title: "SOC 2 Compliant",
                description: "Rigorous security controls and regular audits ensure your data is always protected."
              },
              {
                icon: Lock,
                title: "GDPR & CCPA Ready",
                description: "Full compliance with global privacy regulations including GDPR, CCPA, and more."
              },
              {
                icon: Eye,
                title: "Data Transparency",
                description: "Complete visibility into how your data is used with detailed audit logs and controls."
              }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div 
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Experience the Future?
            </h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed opacity-90">
              Join thousands of companies already using our AI-powered recruitment platform to find the best talent faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="group bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Start Free Trial
                <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 hover:scale-105"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;