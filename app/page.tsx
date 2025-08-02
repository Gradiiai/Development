'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Star, 
  Users, 
  TrendingUp, 
  Shield, 
  Globe, 
  Brain, 
  Rocket, 
  Target, 
  CheckCircle,
  Play,
  Award,
  BarChart3,
  Clock,
  UserCheck,
  Calendar,
  Video,
  FileText,
  Search,
  MessageSquare,
  Linkedin,
  Twitter,
  Github,
  Chrome,
  Slack,
  Figma,
  Database,
  Filter,
  Layers,
  Monitor,
  Mic,
  Code,
  PieChart,
  ChevronRight,
  Building,
  UserPlus,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Activity,
  Droplets,
  ExternalLink
} from 'lucide-react';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  duration?: number;
}

const HomePage = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const AnimatedCounter = ({ end, suffix = '', duration = 2000 }: AnimatedCounterProps) => {
    const [count, setCount] = useState(0);
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true });
    
    useEffect(() => {
      if (!isInView) return;
      
      let startTime: number | undefined;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, [end, duration, isInView]);
    
    return <span ref={ref}>{count}{suffix}</span>;
  };

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/auth/signup');
    }
  };

  const handleGetDemo = () => {
    router.push('/landing/contact');
  };

  // Enhanced Clay-style flower illustration component
  const FlowerIllustration = ({ className = "", color = "#F97316", size = 60 }) => (
    <motion.div 
      className={className}
      animate={{ 
        rotate: [0, 5, -5, 0],
        y: [0, -8, 0, -4, 0]
      }}
      transition={{ 
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
        <g transform="translate(30,30)">
          {/* Flower petals with gradients */}
          <defs>
            <radialGradient id={`flowerGradient${color.replace('#', '')}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={`${color}CC`} />
            </radialGradient>
          </defs>
          <ellipse cx="0" cy="-12" rx="6" ry="12" fill={`url(#flowerGradient${color.replace('#', '')})`} transform="rotate(0)" />
          <ellipse cx="0" cy="-12" rx="6" ry="12" fill={`url(#flowerGradient${color.replace('#', '')})`} transform="rotate(72)" />
          <ellipse cx="0" cy="-12" rx="6" ry="12" fill={`url(#flowerGradient${color.replace('#', '')})`} transform="rotate(144)" />
          <ellipse cx="0" cy="-12" rx="6" ry="12" fill={`url(#flowerGradient${color.replace('#', '')})`} transform="rotate(216)" />
          <ellipse cx="0" cy="-12" rx="6" ry="12" fill={`url(#flowerGradient${color.replace('#', '')})`} transform="rotate(288)" />
          {/* Center with glow */}
          <circle cx="0" cy="0" r="6" fill="#FFA500" opacity="0.8" />
          <circle cx="0" cy="0" r="4" fill="#FFD700" />
          <circle cx="0" cy="0" r="2" fill="#FFF" opacity="0.8" />
        </g>
      </svg>
    </motion.div>
  );

  // Enhanced vine path component with animation
  const VinePath = ({ className = "" }) => (
    <div className={className}>
      <svg width="500" height="250" viewBox="0 0 500 250" fill="none" className="absolute">
        <defs>
          <linearGradient id="vineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <motion.path 
          d="M0,120 Q120,60 240,120 Q360,180 500,120" 
          stroke="url(#vineGradient)" 
          strokeWidth="10" 
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
        {/* Animated leaves */}
        <motion.ellipse 
          cx="100" cy="90" rx="8" ry="15" fill="#059669" transform="rotate(-30 100 90)"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
        <motion.ellipse 
          cx="150" cy="105" rx="8" ry="15" fill="#10B981" transform="rotate(45 150 105)"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
        <motion.ellipse 
          cx="350" cy="105" rx="8" ry="15" fill="#059669" transform="rotate(-45 350 105)"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
        />
        <motion.ellipse 
          cx="400" cy="90" rx="8" ry="15" fill="#10B981" transform="rotate(30 400 90)"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 2 }}
        />
      </svg>
    </div>
  );

  // Enhanced watering can with better animation
  const WateringCanIllustration = () => (
    <motion.div 
      className="relative"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="150" height="120" viewBox="0 0 150 120" fill="none">
        <defs>
          <linearGradient id="canGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <radialGradient id="waterGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </radialGradient>
        </defs>
        {/* Watering can body */}
        <ellipse cx="75" cy="70" rx="30" ry="25" fill="url(#canGradient)" />
        <rect x="45" y="50" width="60" height="30" rx="15" fill="url(#canGradient)" />
        {/* Handle */}
        <path d="M105 65 Q125 50 125 75 Q125 90 105 80" stroke="#059669" strokeWidth="8" fill="none" />
        {/* Spout */}
        <path d="M45 65 Q20 50 12 58 L8 55 L12 62 L18 65 Q30 70 45 72" fill="url(#canGradient)" />
        {/* Animated water drops */}
        <motion.circle 
          cx="20" cy="45" r="3" fill="url(#waterGradient)"
          animate={{ 
            y: [0, 20, 0],
            opacity: [1, 0.7, 1]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle 
          cx="12" cy="40" r="2" fill="url(#waterGradient)"
          animate={{ 
            y: [0, 25, 0],
            opacity: [1, 0.6, 1]
          }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
        />
        <motion.circle 
          cx="25" cy="42" r="1.5" fill="url(#waterGradient)"
          animate={{ 
            y: [0, 15, 0],
            opacity: [1, 0.8, 1]
          }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
        />
        {/* Water splash effect */}
        <motion.g
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="15" cy="65" r="1" fill="#3B82F6" opacity="0.6" />
          <circle cx="22" cy="68" r="0.5" fill="#60A5FA" opacity="0.4" />
          <circle cx="8" cy="70" r="0.8" fill="#3B82F6" opacity="0.5" />
        </motion.g>
      </svg>
    </motion.div>
  );

  // Enhanced flowerpot with more details
  const FlowerPot = ({ potColor, flowerColor, stemColor = "#059669", className = "" }: {
    potColor: string;
    flowerColor: string;
    stemColor?: string;
    className?: string;
  }) => (
    <motion.div 
      className={`relative ${className}`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <svg width="100" height="120" viewBox="0 0 100 120" fill="none">
        <defs>
          <linearGradient id={`potGradient${potColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={potColor} />
            <stop offset="100%" stopColor={`${potColor}DD`} />
          </linearGradient>
          <radialGradient id={`flowerCenter${flowerColor}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
        </defs>
        
        {/* Pot */}
        <path d="M25 80 L75 80 L70 105 L30 105 Z" fill={`url(#potGradient${potColor})`} />
        <ellipse cx="50" cy="80" rx="25" ry="10" fill={potColor} opacity="0.8" />
        
        {/* Soil */}
        <ellipse cx="50" cy="78" rx="22" ry="8" fill="#8B4513" />
        
        {/* Flower stem */}
        <rect x="48" y="55" width="4" height="25" fill={stemColor} />
        
        {/* Leaves */}
        <ellipse cx="42" cy="65" rx="6" ry="10" fill={stemColor} transform="rotate(-20 42 65)" />
        <ellipse cx="58" cy="70" rx="5" ry="8" fill={stemColor} transform="rotate(25 58 70)" />
        
        {/* Flower petals with animation */}
        <motion.g
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ transformOrigin: "50px 50px" }}
        >
          <circle cx="50" cy="40" r="12" fill={flowerColor} opacity="0.9" />
          <circle cx="38" cy="45" r="10" fill={flowerColor} opacity="0.8" />
          <circle cx="62" cy="45" r="10" fill={flowerColor} opacity="0.8" />
          <circle cx="42" cy="58" r="10" fill={flowerColor} opacity="0.8" />
          <circle cx="58" cy="58" r="10" fill={flowerColor} opacity="0.8" />
          <circle cx="50" cy="50" r="8" fill={`url(#flowerCenter${flowerColor})`} />
        </motion.g>
        
        {/* Flower center details */}
        <circle cx="50" cy="50" r="4" fill="#FFF" opacity="0.7" />
        <circle cx="48" cy="48" r="1" fill="#F59E0B" />
        <circle cx="52" cy="52" r="1" fill="#F59E0B" />
      </svg>
    </motion.div>
  );

  // Enhanced dashboard mockup component
  const DashboardMockup = ({ bgColor, children, title }: {
    bgColor: string;
    children: React.ReactNode;
    title: string;
  }) => (
    <motion.div 
      className={`${bgColor} rounded-3xl p-8 shadow-2xl`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-500">dashboard.gradii.com</span>
        </div>
        <h3 className="font-bold mb-4 text-lg">{title}</h3>
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Navigation />
      
      {/* Hero Section with enhanced animations */}
      <section className="relative pt-16 pb-24 overflow-hidden bg-gray-50">
        {/* Enhanced background elements */}
        <VinePath className="absolute top-20 left-0 opacity-40" />
        <VinePath className="absolute top-40 right-0 opacity-40 transform scale-x-[-1]" />
        
        {/* More dynamic floating flowers */}
        <FlowerIllustration className="absolute top-32 left-32" color="#F97316" size={80} />
        <FlowerIllustration className="absolute top-48 right-40" color="#EC4899" size={70} />
        <FlowerIllustration className="absolute top-64 left-1/4" color="#8B5CF6" size={90} />
        <FlowerIllustration className="absolute bottom-32 right-32" color="#10B981" size={75} />
        <FlowerIllustration className="absolute bottom-48 left-40" color="#3B82F6" size={85} />
        <FlowerIllustration className="absolute top-80 right-1/4" color="#F59E0B" size={65} />
        
        {/* Additional smaller decorative elements */}
        <motion.div 
          className="absolute top-60 left-60"
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-4 h-4 bg-pink-400 rounded-full opacity-70"></div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-60 right-60"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-6 h-6 bg-yellow-400 rounded-full opacity-60"></div>
        </motion.div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-5xl md:text-7xl font-bold leading-tight mb-8 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span className="text-gray-900">AI-Powered Interviews</span>
                <br />
                <span className="text-gray-900">That Actually Work</span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Transform your hiring with Gradii's intelligent interview platform. Conduct technical assessments, behavioral interviews, and skill evaluations with AI-powered insights that help you identify the best candidates faster.
              </motion.p>
              
              <motion.div 
                className="flex justify-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-105"
                >
                  Start building for free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>

              {/* Enhanced trust section */}
              <motion.div 
                className="mb-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <p className="text-gray-600 font-medium mb-8 text-lg">
                  Trusted by more than <strong>5,000</strong> growing companies worldwide
                </p>
                
                <div className="flex items-center justify-center gap-6 mb-12">
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1 + i * 0.1 }}
                        >
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        </motion.div>
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">4.8</span>
                    <span className="text-gray-600">rating</span>
                  </motion.div>
                  <div className="text-gray-600">
                    <strong>2K +</strong> interviews conducted daily
                  </div>
                </div>
              </motion.div>

              {/* Enhanced company logos section */}
              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
              >
                {/* First row of company logos */}
                <div className="flex justify-center items-center gap-12 flex-wrap">
                  {[
                    'TechCorp',
                    'StartupHub', 
                    'InnovateLabs',
                    'DevStudio',
                    'CloudTech',
                    'DataFlow',
                    'CodeCraft',
                    'TalentBridge',
                    'SkillForge'
                  ].map((company, index) => (
                    <motion.div 
                      key={index}
                      className="group cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-xl font-semibold text-gray-500 group-hover:text-gray-800 transition-colors duration-300">
                        {company}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Second row of company logos */}
                <div className="flex justify-center items-center gap-12 flex-wrap">
                  {[
                    'NextGen',
                    'ScaleUp',
                    'BuildFast', 
                    'GrowthLabs',
                    'TechFlow',
                    'SmartHire',
                    'FutureWork',
                    'AgileTeams',
                    'CodeBase',
                    'TalentSync'
                  ].map((company, index) => (
                    <motion.div 
                      key={index}
                      className="group cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-xl font-semibold text-gray-500 group-hover:text-gray-800 transition-colors duration-300">
                        {company}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced boost enrichment section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              className="flex items-center gap-8 mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-4 py-2 hover:bg-gray-200 transition-colors">
                AI-Powered Analysis
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-4 py-2 hover:bg-gray-200 transition-colors">
                Smart Interview Templates
              </Badge>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-4 py-2 hover:bg-gray-200 transition-colors">
                Comprehensive Assessment
              </Badge>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  AI-Powered Interview Platform—Comprehensive Assessment Coverage
                </h2>
                <Button 
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-all"
                  onClick={handleGetStarted}
                >
                  Start building for free
                </Button>
              </motion.div>
              <motion.div 
                className="flex justify-center"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <WateringCanIllustration />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Blue Section */}
      <section className="py-24 bg-blue-600 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <DashboardMockup bgColor="bg-blue-500" title="Interview Template Database">
                <div className="space-y-4">
                  {[
                    { name: 'Technical Questions', progress: 100 },
                    { name: 'Behavioral Scenarios', progress: 85 },
                    { name: 'Culture Fit Assessment', progress: 92 },
                    { name: 'Role-specific Frameworks', progress: 78 },
                    { name: 'Custom Question Builder', progress: 95 }
                  ].map((item, index) => (
                    <motion.div 
                      key={index}
                      className="flex justify-between items-center"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <span className="text-sm">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            viewport={{ once: true }}
                          />
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </DashboardMockup>
            </motion.div>
            
            <motion.div 
              className="order-1 lg:order-2"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold mb-6">
                Search 100+ providers for any interview type: no contracts needed
              </h3>
              <p className="text-lg mb-8 leading-relaxed opacity-90">
                Complete hiring coverage demands templates from multiple expert sources. On Gradii, connect with vetted interview frameworks for any role category—and use your custom questions for free. That includes…
              </p>
              <ul className="space-y-3 mb-8">
                {['Technical assessments', 'Behavioral interviews', 'Cultural fit evaluations', '& more'].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.div 
                className="bg-blue-500 rounded-2xl p-6"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-4xl font-bold mb-2">3x</div>
                <div>
                  <strong>TechCorp</strong> tripled their interview efficiency and reduced time-to-hire by 60%
                </div>
                <Link href="#" className="text-sm underline mt-2 block hover:text-blue-200">Read case study</Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Purple Section */}
      <section className="py-24 bg-purple-600 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-40 right-40 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-40 w-56 h-56 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold mb-6">
                Get unique candidate insights with AI research agents
              </h3>
              <p className="text-lg mb-8 leading-relaxed opacity-90">
                Automate manual assessment at scale to uncover insights that traditional interviews miss. Our agents (with tens of millions of monthly assessments!) can:
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Analyze communication patterns and clarity',
                  'Evaluate problem-solving approaches',
                  'Score technical depth and accuracy',
                  'Clean and format candidate data',
                  'Assess cultural fit and team dynamics'
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.div 
                className="bg-purple-500 rounded-2xl p-6"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <blockquote className="mb-3">
                  "Gradii has revolutionized our interview process, reducing manual screening time by 70% while improving candidate quality significantly."
                </blockquote>
                <div className="font-semibold">Sarah Chen</div>
                <div className="text-sm opacity-80">Head of Talent, StartupHub</div>
                <Link href="#" className="text-sm underline mt-2 block hover:text-purple-200">Read case study</Link>
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <DashboardMockup bgColor="bg-purple-500" title="AI Analysis Dashboard">
                <div className="space-y-4">
                  {[
                    { skill: 'Communication Skills', score: 8.5, color: 'bg-green-500' },
                    { skill: 'Technical Depth', score: 9.2, color: 'bg-blue-500' },
                    { skill: 'Cultural Fit', score: 7.8, color: 'bg-purple-500' }
                  ].map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span>{item.skill}</span>
                        <span className="font-bold">{item.score}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          className={`h-full ${item.color} rounded-full`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(item.score / 10) * 100}%` }}
                          transition={{ duration: 1.5, delay: index * 0.2 }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </DashboardMockup>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Green Section */}
      <section className="py-24 bg-green-600 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-32 left-32 w-36 h-36 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-32 right-32 w-52 h-52 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <DashboardMockup bgColor="bg-green-500" title="Real-time Candidate Signals">
                <div className="space-y-3 text-sm">
                  {[
                    { text: 'New job application submitted', color: 'bg-green-500', time: '2 min ago' },
                    { text: 'Candidate updated LinkedIn profile', color: 'bg-blue-500', time: '1 hour ago' },
                    { text: 'Skills assessment completed', color: 'bg-purple-500', time: '3 hours ago' },
                    { text: 'Interview feedback received', color: 'bg-orange-500', time: '1 day ago' }
                  ].map((signal, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${signal.color} rounded-full`}></div>
                        <span className="text-gray-700">{signal.text}</span>
                      </div>
                      <span className="text-xs text-gray-500">{signal.time}</span>
                    </motion.div>
                  ))}
                </div>
              </DashboardMockup>
            </motion.div>
            
            <motion.div 
              className="order-1 lg:order-2"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold mb-6">
                Smart Interview Scheduling with Real-time Candidate Insights
              </h3>
              <p className="text-lg mb-8 leading-relaxed opacity-90">
                Never miss an interview opportunity. Automatically track candidate progress and optimize your interview pipeline with AI-powered insights.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Schedule interviews based on candidate availability',
                  'Track interview completion and feedback',
                  'Monitor candidate engagement levels',
                  'Analyze interview performance trends'
                ].map((item, index) => (
                  <motion.li 
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.div 
                className="bg-green-500 rounded-2xl p-6"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-4xl font-bold mb-2">2K+</div>
                <div className="mb-4">
                  Daily interviews conducted across our platform with AI-powered insights
                </div>
                <div className="text-4xl font-bold mb-2">5x</div>
                <div>
                  Faster interview scheduling and 200+ interviews per month capacity increase
                </div>
                <Link href="#" className="text-sm underline mt-2 block hover:text-green-200">Read case study</Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced flowerpot section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Streamline your interview process with intelligent workflows
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
                Transform candidate insights into actionable hiring decisions. Connect Gradii's AI-powered interview platform to your existing HR tools and create seamless recruitment workflows that scale with your team.
              </p>
              <Button 
                className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-all"
                onClick={handleGetStarted}
              >
                Start building for free
              </Button>
            </motion.div>

            {/* Enhanced flowerpots */}
            <motion.div 
              className="flex justify-center gap-12 mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <FlowerPot potColor="#D97706" flowerColor="#3B82F6" className="transform hover:scale-110 transition-transform" />
              <FlowerPot potColor="#7C3AED" flowerColor="#F97316" className="transform hover:scale-110 transition-transform" />
              <FlowerPot potColor="#DC2626" flowerColor="#FCD34D" className="transform hover:scale-110 transition-transform" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Cards Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {/* Card 1 - Purple */}
            <div className="bg-purple-600 text-white rounded-3xl p-8">
              <div className="bg-purple-500 rounded-2xl p-6 mb-6">
                <div className="bg-white rounded-xl p-4 text-gray-900 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4" />
                    <span className="font-medium">AI Interview Analysis</span>
                  </div>
                  <div className="space-y-1">
                    <div>✓ Communication skills: 8.5/10</div>
                    <div>✓ Problem solving: 9.2/10</div>
                    <div>✓ Technical depth: 7.8/10</div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Clean and format candidate data with AI in seconds</h3>
              <p className="text-sm opacity-90 mb-6">
                Use AI to transform any candidate response into the format you need. Concatenate insights, ensure consistent scoring, and remove bias from assessment reviews.
              </p>
            </div>

            {/* Card 2 - Blue */}
            <div className="bg-blue-600 text-white rounded-3xl p-8">
              <div className="bg-blue-500 rounded-2xl p-6 mb-6">
                <div className="bg-white rounded-xl p-4 text-gray-900 text-sm">
                  <div className="font-medium mb-2">Conditional Logic</div>
                  <div className="space-y-1">
                    <div>If role = "Senior" → Technical deep dive</div>
                    <div>If role = "Junior" → Basic assessment</div>
                    <div>If department = "Engineering" → Coding test</div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Run interview steps conditionally — no engineering needed</h3>
              <p className="text-sm opacity-90 mb-6">
                Conditionally run workflows based on any logic. Use different assessments for different roles, evaluate only your best-fit candidates, or build in fallbacks.
              </p>
            </div>

            {/* Card 3 - Green */}
            <div className="bg-green-600 text-white rounded-3xl p-8">
              <div className="bg-green-500 rounded-2xl p-6 mb-6">
                <div className="bg-white rounded-xl p-4 text-gray-900 text-sm">
                  <div className="font-medium mb-2">Integration Options</div>
                  <div className="space-y-1">
                    <div>✓ ATS Systems</div>
                    <div>✓ HRIS Platforms</div>
                    <div>✓ Email Tools</div>
                    <div>✓ Custom Webhooks</div>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">Constantly update any tool — ATS, HRIS, email sequencer, or more</h3>
              <p className="text-sm opacity-90 mb-6">
                Push candidate scores to your ATS, data warehouse, email tool, etc—on a recurring basis. Use our HTTP API capability to build your own integrations without code.
              </p>
            </div>
          </div>

          {/* Quote section */}
          <div className="mt-16 bg-white rounded-3xl p-8 max-w-4xl mx-auto text-center">
            <blockquote className="text-xl text-gray-700 mb-6 leading-relaxed">
              "Gradii has helped Anthropic significantly improve our candidate assessment and hiring data pipelines. We've been able to consolidate our tech stack to core essentials, like our ATS, Gradii, and communication tools."
            </blockquote>
            <div className="font-semibold text-gray-900 text-lg">Adam Wall</div>
            <div className="text-gray-600">Head of Revenue Operations at Anthropic</div>
            
            <div className="grid md:grid-cols-3 gap-8 mt-8 pt-8 border-t">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">4h/week</div>
                <div className="text-gray-600 text-sm">Saved with automating inbound lead enrichment and scoring in Salesforce.</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">100+</div>
                <div className="text-gray-600 text-sm">100+ providers accessed via Gradii</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
                <div className="text-gray-600 text-sm">Automated all SFDC opportunity upserts</div>
              </div>
            </div>
            <Link href="#" className="text-sm text-blue-600 underline mt-4 block">Read case study</Link>
          </div>
        </div>
      </section>

             {/* Use Cases Section - Exact Clay.com Layout */}
       <section className="py-24 bg-white">
         <div className="container mx-auto px-6">
           <div className="max-w-6xl mx-auto">
             <motion.div 
               className="text-left mb-16"
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
             >
               <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                 Gradii's data + workflows unlock any <span className="text-gray-500">hiring use case</span>
               </h2>
               <p className="text-xl text-gray-600 max-w-3xl leading-relaxed">
                 Use the best data foundation alongside flexible workflows to turn any hiring idea into reality—from candidate screening to interview automation. Iterate quickly to scale your best recruitment experiments.
               </p>
             </motion.div>

             <div className="grid lg:grid-cols-2 gap-16 items-center">
               {/* Left side - Data enrichment visualization */}
               <motion.div 
                 className="order-2 lg:order-1"
                 initial={{ opacity: 0, x: -30 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
               >
                 <div className="bg-gray-50 rounded-3xl p-12 relative">
                   {/* Circular data visualization */}
                   <div className="flex items-center justify-center mb-8">
                     <div className="relative">
                       <motion.svg 
                         width="180" 
                         height="180" 
                         viewBox="0 0 180 180"
                         initial={{ scale: 0.8, opacity: 0 }}
                         whileInView={{ scale: 1, opacity: 1 }}
                         transition={{ duration: 1 }}
                         viewport={{ once: true }}
                       >
                         {/* Outer ring - blue */}
                         <motion.circle 
                           cx="90" cy="90" r="70" 
                           fill="none" 
                           stroke="#3B82F6" 
                           strokeWidth="20"
                           strokeDasharray="440"
                           strokeDashoffset="110"
                           initial={{ strokeDashoffset: 440 }}
                           whileInView={{ strokeDashoffset: 110 }}
                           transition={{ duration: 2, delay: 0.2 }}
                           viewport={{ once: true }}
                         />
                         {/* Middle ring - orange */}
                         <motion.circle 
                           cx="90" cy="90" r="45" 
                           fill="none" 
                           stroke="#F97316" 
                           strokeWidth="16"
                           strokeDasharray="283"
                           strokeDashoffset="85"
                           initial={{ strokeDashoffset: 283 }}
                           whileInView={{ strokeDashoffset: 85 }}
                           transition={{ duration: 2, delay: 0.4 }}
                           viewport={{ once: true }}
                         />
                         {/* Inner circle - yellow */}
                         <motion.circle 
                           cx="90" cy="90" r="25" 
                           fill="#FCD34D"
                           initial={{ scale: 0 }}
                           whileInView={{ scale: 1 }}
                           transition={{ duration: 0.8, delay: 0.6 }}
                           viewport={{ once: true }}
                         />
                       </motion.svg>
                       
                       {/* Floating data points */}
                       <motion.div 
                         className="absolute -top-4 -right-4 bg-white rounded-lg p-3 shadow-lg border"
                         animate={{ y: [0, -10, 0] }}
                         transition={{ duration: 3, repeat: Infinity }}
                       >
                         <div className="flex items-center gap-2">
                           <Database className="w-4 h-4 text-blue-500" />
                           <span className="text-sm font-medium">Data enrichments</span>
                         </div>
                       </motion.div>
                       
                       <motion.div 
                         className="absolute -bottom-4 -left-4 bg-white rounded-lg p-3 shadow-lg border"
                         animate={{ y: [0, -8, 0] }}
                         transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                       >
                         <div className="flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-orange-500" />
                           <span className="text-sm font-medium">AI agents</span>
                         </div>
                       </motion.div>
                     </div>
                   </div>
                   
                   <div className="text-center">
                     <h3 className="text-xl font-bold text-gray-900 mb-4">Data enrichment</h3>
                   </div>
                 </div>
               </motion.div>

               {/* Right side - Use case badges */}
               <motion.div 
                 className="order-1 lg:order-2 space-y-4"
                 initial={{ opacity: 0, x: 30 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
               >
                 {[
                   { text: "CRM enrichment and maintenance", color: "bg-orange-50 text-orange-700 border-orange-200", icon: "📊" },
                   { text: "TAM sourcing & territory planning", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "🎯" },
                   { text: "Inbound lead enrichment & routing", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "🔗" },
                   { text: "Intent-based outreach flows", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: "🚀" },
                   { text: "AI powered outbound campaigns", color: "bg-pink-50 text-pink-700 border-pink-200", icon: "💎" },
                   { text: "Account based marketing", color: "bg-green-50 text-green-700 border-green-200", icon: "📈" }
                 ].map((useCase, index) => (
                   <motion.div 
                     key={index}
                     className={`${useCase.color} rounded-xl p-4 border hover:scale-105 transition-transform cursor-pointer`}
                     initial={{ opacity: 0, x: 20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ delay: index * 0.1 }}
                     viewport={{ once: true }}
                     whileHover={{ x: 5 }}
                   >
                     <div className="flex items-center gap-3">
                       <span className="text-xl">{useCase.icon}</span>
                       <span className="font-medium">{useCase.text}</span>
                     </div>
                   </motion.div>
                 ))}
               </motion.div>
             </div>
           </div>
         </div>
       </section>

      {/* Consolidate GTM Stack Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Consolidate your hiring stack to save time & cut costs—securely
              </h2>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Read more about Gradii Enterprise →
                </Button>
                <Button className="bg-black hover:bg-gray-800 text-white">
                  Get a demo
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  Cut costs and access data faster in one central platform
                </h3>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Stop waiting months to purchase and implement new assessment tools. Gradii gives you immediate access to 100+ premium interview templates (+ your own custom frameworks) in one subscription: no contracts, renewals, or implementation hassle needed.
                </p>
                <div className="bg-white rounded-2xl p-6 border">
                  <blockquote className="text-gray-700 mb-4 leading-relaxed">
                    "Gradii enables our team to rapidly experiment with trigger driven workflows, and 3rd party enrichment data. We're able to move fast and drive outsized impact on hiring execution – all while using a tool that's fun, creative, and cutting edge."
                  </blockquote>
                  <div className="font-semibold text-gray-900">Scotty Huhn</div>
                  <div className="text-gray-600 text-sm">Revenue Strategy & Data, OpenAI</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">O</span>
                    </div>
                    <span className="text-sm text-gray-600">OpenAI</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                {/* 3D Toolbox illustration */}
                <div className="relative">
                  <svg width="300" height="200" viewBox="0 0 300 200" fill="none">
                    {/* Toolbox base */}
                    <rect x="50" y="120" width="200" height="60" rx="10" fill="#3B82F6" />
                    <rect x="50" y="115" width="200" height="10" rx="5" fill="#2563EB" />
                    
                    {/* Tools sticking out */}
                    <rect x="80" y="80" width="15" height="40" rx="2" fill="#F59E0B" />
                    <rect x="110" y="75" width="20" height="45" rx="3" fill="#10B981" />
                    <rect x="145" y="85" width="18" height="35" rx="2" fill="#EF4444" />
                    <rect x="180" y="70" width="22" height="50" rx="3" fill="#8B5CF6" />
                    <rect x="215" y="90" width="16" height="30" rx="2" fill="#F97316" />
                    
                    {/* Tool handles */}
                    <circle cx="87" cy="75" r="4" fill="#92400E" />
                    <circle cx="120" cy="70" r="5" fill="#065F46" />
                    <circle cx="154" cy="80" r="4" fill="#991B1B" />
                    <circle cx="191" cy="65" r="5" fill="#581C87" />
                    <circle cx="223" cy="85" r="4" fill="#EA580C" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Security badges */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Backed by enterprise-grade security and scale</h3>
              <div className="flex justify-center">
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 mb-12">
                  Security at Gradii →
                </Button>
              </div>
              
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { name: 'SOC 2 TYPE II', color: 'bg-green-500' },
                  { name: 'GDPR', color: 'bg-blue-500' },
                  { name: 'CCPA', color: 'bg-pink-500' },
                  { name: 'ISO 27001', color: 'bg-orange-500' }
                ].map((badge, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-20 h-20 ${badge.color} rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                      {/* Flower petals around the badge */}
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute top-1 right-1 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute top-1 left-1 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute bottom-1 right-1 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      <div className="absolute bottom-1 left-1 w-6 h-6 bg-yellow-400 rounded-full"></div>
                      
                      <span className="text-white font-bold text-lg relative z-10">
                        {badge.name.split(' ')[0].charAt(0)}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">{badge.name}</h4>
                    <p className="text-sm text-gray-600">
                      {badge.name === 'SOC 2 TYPE II' && 'We are SOC 2 Type II compliant. Request our SOC 2 in our Trust Center.'}
                      {badge.name === 'GDPR' && 'Hire anywhere in the world — let us handle compliance with local laws.'}
                      {badge.name === 'CCPA' && 'Support your candidate base with opt out and DNC support.'}
                      {badge.name === 'ISO 27001' && 'Securely connect your ATS and other systems.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn your hiring ideas into reality today
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Start your 14-day Pro trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg transition-all duration-300"
            >
              Start building for free
            </Button>
            <Button 
              size="lg" 
              onClick={handleGetDemo}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300"
              variant="outline"
            >
              Get a demo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;