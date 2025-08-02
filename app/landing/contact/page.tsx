'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/shared/badge';
import { toast } from '@/shared/hooks/use-toast';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageSquare,
  CheckCircle,
  Loader2,
  Twitter,
  Linkedin,
  Github,
  Instagram,
  ExternalLink,
  Users,
  Globe,
  Zap
} from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const ContactPage = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Message sent successfully!",
          description: "Thank you for contacting us. We'll get back to you soon.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Send us an email anytime',
      value: 'hello@gradii.com',
      href: 'mailto:hello@gradii.com',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Mon-Fri from 8am to 6pm PST',
      value: '+1 (555) 123-4567',
      href: 'tel:+15551234567',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      description: 'Come say hello at our office',
      value: '123 AI Street, Tech City, TC 12345',
      href: '#',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Clock,
      title: 'Working Hours',
      description: 'We\'re here to help during business hours',
      value: 'Mon-Fri: 8am-6pm PST',
      href: '#',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  const socialLinks = [
    {
      icon: Twitter,
      name: 'Twitter',
      url: 'https://twitter.com/gradii',
      color: 'hover:text-blue-400'
    },
    {
      icon: Linkedin,
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/gradii',
      color: 'hover:text-blue-600'
    },
    {
      icon: Github,
      name: 'GitHub',
      url: 'https://github.com/gradii',
      color: 'hover:text-gray-800'
    },
    {
      icon: Instagram,
      name: 'Instagram',
      url: 'https://instagram.com/gradii',
      color: 'hover:text-pink-500'
    }
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
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="font-semibold">Contact Us</span>
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Let's Start a
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Conversation
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Have questions about our AI-powered interview platform? 
              <span className="text-blue-600 font-semibold">We're here to help</span> you transform your hiring process.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div 
                  key={index}
                  className="group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <Card className="h-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:border-gray-300/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardContent className="p-8 text-center relative z-10">
                      <div className={`w-16 h-16 bg-gradient-to-r ${item.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                      {item.href !== '#' ? (
                        <a 
                          href={item.href} 
                          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors inline-flex items-center gap-1 group/link"
                        >
                          {item.value}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <span className="text-gray-700 font-semibold">{item.value}</span>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
            
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                    Send us a Message
                  </span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </div>
              
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 font-semibold">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl h-12"
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-semibold">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl h-12"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-700 font-semibold">Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl h-12"
                        placeholder="What's this about?"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-700 font-semibold">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none rounded-xl"
                        placeholder="Tell us more about your inquiry..."
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Map & Additional Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Embedded Map Placeholder */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-80 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Our Location</h3>
                        <p className="text-gray-600">123 AI Street, Tech City, TC 12345</p>
                        <Button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl">
                          View on Maps
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-4 left-4 w-20 h-20 bg-white/20 rounded-full" />
                    <div className="absolute bottom-4 right-4 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute top-1/2 right-8 w-16 h-16 bg-white/15 rounded-full" />
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Follow Us</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {socialLinks.map((social, index) => {
                      const Icon = social.icon;
                      return (
                        <a
                          key={index}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg group ${social.color}`}
                        >
                          <Icon className="h-6 w-6 text-gray-600 group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-gray-700">{social.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Us?</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Users, text: '10,000+ Happy Customers', color: 'text-blue-500' },
                      { icon: Globe, text: '50+ Countries Served', color: 'text-green-500' },
                      { icon: Zap, text: '24/7 Support Available', color: 'text-purple-500' },
                      { icon: CheckCircle, text: '99.9% Uptime Guarantee', color: 'text-orange-500' }
                    ].map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                          <span className="text-gray-700 font-medium">{stat.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Visit Our Office</h2>
            <p className="text-gray-600 mb-8">We're located in the heart of San Francisco's tech district. Click on the map to explore!</p>
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="h-96 relative" id="interactive-map-container">
                  {/* Enhanced Interactive Map */}
                  <div id="google-map" className="w-full h-full rounded-xl">
                    <iframe
                      src="https://www.google.com/maps/embed/v1/view?key=AIzaSyAW2zbPDKq07C6N2zex6C_P7UTt12WpDqA&center=12.9352,77.6050&zoom=15&maptype=satellite"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
                    ></iframe>
                  </div>
                  
                  {/* Enhanced Map Overlay */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 max-w-xs">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800 mb-1">Gradii HQ</h3>
                        <p className="text-xs text-gray-600 mb-2">
                          123 Innovation Drive<br />
                          San Francisco, CA 94105<br />
                          United States
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <button className="flex items-center gap-1 text-teal-600 hover:text-teal-700 transition-colors">
                            <MapPin className="w-3 h-3" />
                            <span>Get Directions</span>
                          </button>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">Open 24/7</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Map Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button className="bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-white/30 hover:bg-white transition-all duration-200 group">
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <button className="bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-white/30 hover:bg-white transition-all duration-200 group">
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button className="bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-white/30 hover:bg-white transition-all duration-200 group">
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <button className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-all duration-200 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Directions
                    </button>
                    <button className="bg-white/95 backdrop-blur-sm hover:bg-white text-gray-700 px-3 py-2 rounded-lg text-xs font-medium shadow-lg border border-white/30 transition-all duration-200 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Location Details */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4 text-center">
                  <MapPin className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">Address</h3>
                  <p className="text-sm text-gray-600">123 Innovation Drive<br />San Francisco, CA 94105</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">Office Hours</h3>
                  <p className="text-sm text-gray-600">Mon-Fri: 9:00 AM - 6:00 PM<br />Sat-Sun: By Appointment</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4 text-center">
                  <Phone className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-800 mb-1">Phone</h3>
                  <p className="text-sm text-gray-600">+1 (555) 123-4567<br />Available 24/7</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;