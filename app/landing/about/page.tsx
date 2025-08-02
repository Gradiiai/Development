'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Award, 
  TrendingUp, 
  Globe, 
  Rocket, 
  CheckCircle, 
  Calendar,
  Linkedin,
  Twitter,
  Github,
  Mail,
  Sparkles,
  Building,
  Clock,
  Star
} from 'lucide-react';

interface TimelineItemProps {
  year: string;
  title: string;
  description: string;
  isLast?: boolean;
}

interface TeamMemberProps {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
}

const AboutPage = () => {
  const TimelineItem = ({ year, title, description, isLast = false }: TimelineItemProps) => (
    <motion.div 
      className="relative flex items-start gap-6 pb-12"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="flex flex-col items-center">
        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full border-4 border-white shadow-lg z-10" />
        {!isLast && <div className="w-0.5 h-full bg-gradient-to-b from-blue-200 to-purple-200 mt-2" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">{year}</Badge>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );

  const TeamMember = ({ name, role, bio, avatar, linkedin, twitter, github }: TeamMemberProps) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="group"
    >
      <Card className="h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-8 relative z-10">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              {avatar}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
            <p className="text-blue-600 font-semibold mb-4">{role}</p>
          </div>
          <p className="text-gray-600 text-center leading-relaxed mb-6">{bio}</p>
          <div className="flex justify-center gap-3">
            {linkedin && (
              <Button size="sm" variant="outline" className="rounded-full p-2 hover:bg-blue-50 hover:border-blue-300">
                <Linkedin className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {twitter && (
              <Button size="sm" variant="outline" className="rounded-full p-2 hover:bg-blue-50 hover:border-blue-300">
                <Twitter className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {github && (
              <Button size="sm" variant="outline" className="rounded-full p-2 hover:bg-gray-50 hover:border-gray-300">
                <Github className="h-4 w-4 text-gray-600" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const timeline = [
    {
      year: "2020",
      title: "The Vision Begins",
      description: "Founded with a mission to revolutionize recruitment through AI. Started with a small team of passionate engineers and HR experts."
    },
    {
      year: "2021",
      title: "First AI Model Launch",
      description: "Launched our first AI-powered resume screening tool, helping 100+ companies streamline their initial candidate filtering process."
    },
    {
      year: "2022",
      title: "Video Interview Platform",
      description: "Introduced real-time AI analysis for video interviews, providing instant insights and reducing bias in hiring decisions."
    },
    {
      year: "2023",
      title: "Global Expansion",
      description: "Expanded to serve 1000+ companies worldwide, processing over 50,000 interviews and helping reduce hiring time by 70%."
    },
    {
      year: "2024",
      title: "AI Agents Revolution",
      description: "Launched autonomous AI agents that can conduct full recruitment cycles, from job posting to final candidate recommendations."
    }
  ];

  const teamMembers = [
    {
      name: "Sarah Chen",
      role: "CEO & Co-Founder",
      bio: "Former VP of Engineering at Google with 15+ years in AI and machine learning. Passionate about using technology to create fair hiring practices.",
      avatar: "SC",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Michael Rodriguez",
      role: "CTO & Co-Founder",
      bio: "Ex-Principal Engineer at Microsoft Azure. Expert in distributed systems and AI infrastructure with 12+ years of experience.",
      avatar: "MR",
      linkedin: "#",
      github: "#"
    },
    {
      name: "Emily Johnson",
      role: "Head of AI Research",
      bio: "PhD in Machine Learning from Stanford. Previously led AI research at OpenAI, specializing in natural language processing and bias detection.",
      avatar: "EJ",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "David Kim",
      role: "VP of Product",
      bio: "Former Product Lead at LinkedIn Talent Solutions. 10+ years of experience building products that connect talent with opportunities.",
      avatar: "DK",
      linkedin: "#"
    },
    {
      name: "Lisa Wang",
      role: "Head of Design",
      bio: "Award-winning UX designer with experience at Airbnb and Uber. Focused on creating intuitive, accessible interfaces for complex AI systems.",
      avatar: "LW",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "James Thompson",
      role: "VP of Sales",
      bio: "Former Enterprise Sales Director at Salesforce. Expert in helping companies transform their hiring processes with innovative technology.",
      avatar: "JT",
      linkedin: "#"
    }
  ];

  const values = [
    {
      icon: Target,
      title: "Mission",
      description: "To democratize access to top talent by eliminating bias and inefficiency in the hiring process through intelligent AI technology.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Eye,
      title: "Vision",
      description: "A world where every hiring decision is based on merit, potential, and fit—where the best talent finds the right opportunities regardless of background.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Heart,
      title: "Values",
      description: "Fairness, transparency, innovation, and human-centricity guide everything we do. We believe technology should augment human judgment, not replace it.",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const achievements = [
    { number: "1200+", label: "Companies Served", icon: Building },
    { number: "50K+", label: "Interviews Conducted", icon: Users },
    { number: "70%", label: "Time Reduction", icon: Clock },
    { number: "98%", label: "Customer Satisfaction", icon: Star }
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
                <span className="font-semibold">About Gradii</span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Revolutionizing
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Recruitment with AI
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              We're on a mission to make hiring fairer, faster, and more effective through the power of artificial intelligence. 
              <span className="text-blue-600 font-semibold">Join us in shaping the future of work.</span>
            </motion.p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
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
                Our Purpose
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Everything we do is guided by our core mission, vision, and values.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Card className="h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardContent className="p-8 text-center relative z-10">
                      <div className={`w-16 h-16 bg-gradient-to-r ${value.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <motion.div 
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {achievement.number}
                  </div>
                  <div className="text-gray-600 font-medium text-sm">{achievement.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
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
                Our Journey
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From a small startup to a global platform trusted by thousands of companies.
            </p>
          </motion.div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {timeline.map((item, index) => (
                <TimelineItem 
                  key={index}
                  year={item.year}
                  title={item.title}
                  description={item.description}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
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
              <Users className="h-4 w-4 mr-2" />
              Our Team
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Meet the Minds Behind
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                the Innovation
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Our diverse team of engineers, researchers, and industry experts are united by a shared passion for transforming recruitment.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <TeamMember key={index} {...member} />
            ))}
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
              Ready to Join Our Mission?
            </h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed opacity-90">
              Whether you're looking to transform your hiring process or join our team, we'd love to hear from you.
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
                <Mail className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;