"use client";

import { WorldMap } from "@/components/ui/world-map";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/shared/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { 
  Shield, 
  Award, 
  Globe, 
  Users, 
  Zap, 
  CheckCircle, 
  Star,
  Lock,
  FileCheck,
  Building,
  TrendingUp,
  Clock,
  Target,
  Brain,
  Rocket
} from "lucide-react";

export function WorldMaplanding() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Interviews",
      description: "Advanced AI algorithms analyze candidate responses in real-time for comprehensive evaluation."
    },
    {
      icon: Globe,
      title: "Global Talent Pool",
      description: "Connect with top talent worldwide through our extensive network and remote capabilities."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with SOC2 Type II compliance and end-to-end encryption."
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Deep insights and performance metrics to optimize your hiring process."
    },
    {
      icon: Clock,
      title: "Time Efficiency",
      description: "Reduce hiring time by 85% with automated screening and intelligent matching."
    },
    {
      icon: Target,
      title: "Precision Matching",
      description: "ML-powered candidate matching ensures the perfect fit for your requirements."
    }
  ];

  const complianceItems = [
    { name: "ISO 27001", icon: Shield, description: "Information Security Management" },
    { name: "SOC 2 Type II", icon: Lock, description: "Security & Availability" },
    { name: "GDPR Compliant", icon: FileCheck, description: "Data Protection Regulation" },
    { name: "CCPA Ready", icon: Building, description: "California Consumer Privacy Act" }
  ];

  const awards = [
    { title: "Best HR Tech 2024", organization: "TechCrunch" },
    { title: "Innovation Award", organization: "HR Excellence" },
    { title: "Top 50 Startups", organization: "Forbes" },
    { title: "AI Excellence", organization: "AI Summit" }
  ];

  const faqs = [
    {
      question: "How does AI-powered interviewing work?",
      answer: "Our AI analyzes speech patterns, facial expressions, and response quality to provide comprehensive candidate evaluations while maintaining fairness and reducing bias."
    },
    {
      question: "Is the platform compliant with data protection regulations?",
      answer: "Yes, we're fully compliant with GDPR, CCPA, and maintain SOC 2 Type II certification. All data is encrypted and stored securely."
    },
    {
      question: "Can I integrate with existing HR systems?",
      answer: "Absolutely! We offer seamless integrations with popular ATS, HRIS, and other HR tools through our robust API."
    },
    {
      question: "What's the typical implementation timeline?",
      answer: "Most organizations are up and running within 2-3 weeks, including setup, training, and initial candidate pipeline."
    },
    {
      question: "Do you offer customer support?",
      answer: "Yes, we provide 24/7 customer support, dedicated account managers for enterprise clients, and comprehensive training resources."
    }
  ];

  return (
    <div className="py-20 dark:bg-black bg-white w-full">
      {/* Global Connectivity Section */}
      <div className="max-w-7xl mx-auto text-center px-4 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-6 bg-emerald-50 text-emerald-700 border-emerald-200">
            <Globe className="h-4 w-4 mr-2" />
            Global Network
          </Badge>
          <h2 className="font-bold text-3xl md:text-5xl dark:text-white text-black mb-4">
            Global{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {"Connectivity".split("").map((word, idx) => (
                <motion.span
                  key={idx}
                  className="inline-block"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.04 }}
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
            Connect with top talent across continents. Our platform enables seamless remote interviews 
            and global hiring, breaking geographical barriers for exceptional recruitment experiences.
          </p>
        </motion.div>
      </div>
      
      {/* Lighter World Map Container */}
      <div className="max-w-6xl mx-auto px-4 mb-24">
        <motion.div 
          className="relative bg-gradient-to-br from-slate-50/50 to-white/50 dark:from-gray-900/50 dark:to-black/50 rounded-2xl border border-slate-200/30 dark:border-gray-700/30 shadow-lg shadow-slate-200/20 dark:shadow-gray-900/20 overflow-hidden backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 rounded-2xl"></div>
          
          {/* Map container with padding */}
          <div className="relative z-10 p-6 md:p-8">
            <WorldMap
              dots={[
                {
                  start: { lat: 64.2008, lng: -149.4937 }, // Alaska
                  end: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
                },
                {
                  start: { lat: 64.2008, lng: -149.4937 }, // Alaska
                  end: { lat: -15.7975, lng: -47.8919 }, // Brazil
                },
                {
                  start: { lat: -15.7975, lng: -47.8919 }, // Brazil
                  end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
                },
                {
                  start: { lat: 51.5074, lng: -0.1278 }, // London
                  end: { lat: 28.6139, lng: 77.209 }, // New Delhi
                },
                {
                  start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                  end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
                },
                {
                  start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                  end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
                },
              ]}
            />
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 mb-24">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-200">
            <Zap className="h-4 w-4 mr-2" />
            Platform Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-gray-800 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
              Powerful Features for
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
              Modern Recruitment
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-slate-200/60 dark:border-gray-700/60">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Compliance & Security Section */}
      <div className="max-w-7xl mx-auto px-4 mb-24">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-6 bg-green-50 text-green-700 border-green-200">
            <Shield className="h-4 w-4 mr-2" />
            Security & Compliance
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your data security is our priority. We maintain the highest standards of compliance and security.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {complianceItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-slate-200/60 dark:border-gray-700/60 text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Awards Section */}
      <div className="max-w-7xl mx-auto px-4 mb-24">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-6 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Award className="h-4 w-4 mr-2" />
            Recognition
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Industry Recognition
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {awards.map((award, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200/60 dark:border-yellow-700/60 text-center"
            >
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">{award.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{award.organization}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-6 bg-purple-50 text-purple-700 border-purple-200">
            <CheckCircle className="h-4 w-4 mr-2" />
            FAQ
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-slate-200/60 dark:border-gray-700/60">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-left">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-left">{faq.answer}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}