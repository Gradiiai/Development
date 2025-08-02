'use client';

import React from 'react';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { 
  Shield, 
  Eye, 
  Lock, 
  Users, 
  FileText, 
  Mail, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Globe
} from 'lucide-react';

const PrivacyPolicyPage = () => {
  const lastUpdated = "December 15, 2024";

  const sections = [
    {
      id: "information-collection",
      title: "Information We Collect",
      icon: <Eye className="h-5 w-5" />,
      content: [
        {
          subtitle: "Personal Information",
          items: [
            "Name, email address, and contact information when you create an account",
            "Professional information such as job title, company, and work experience",
            "Payment information when you subscribe to our services",
            "Communication preferences and settings"
          ]
        },
        {
          subtitle: "Interview Data",
          items: [
            "Interview recordings and transcripts (with explicit consent)",
            "Interview responses and candidate evaluations",
            "Performance metrics and analytics data",
            "Custom questions and interview templates you create"
          ]
        },
        {
          subtitle: "Technical Information",
          items: [
            "IP address, browser type, and device information",
            "Usage patterns and feature interactions",
            "Log files and error reports",
            "Cookies and similar tracking technologies"
          ]
        }
      ]
    },
    {
      id: "information-usage",
      title: "How We Use Your Information",
      icon: <FileText className="h-5 w-5" />,
      content: [
        {
          subtitle: "Service Provision",
          items: [
            "Provide and maintain our AI-powered interview platform",
            "Process and analyze interview data to generate insights",
            "Customize your experience and improve our algorithms",
            "Facilitate communication between recruiters and candidates"
          ]
        },
        {
          subtitle: "Business Operations",
          items: [
            "Process payments and manage subscriptions",
            "Send important service updates and notifications",
            "Provide customer support and technical assistance",
            "Conduct research and development to improve our services"
          ]
        },
        {
          subtitle: "Legal and Security",
          items: [
            "Comply with legal obligations and regulatory requirements",
            "Protect against fraud, abuse, and security threats",
            "Enforce our terms of service and user agreements",
            "Respond to legal requests and court orders"
          ]
        }
      ]
    },
    {
      id: "information-sharing",
      title: "Information Sharing and Disclosure",
      icon: <Users className="h-5 w-5" />,
      content: [
        {
          subtitle: "We Do Not Sell Your Data",
          items: [
            "We never sell, rent, or trade your personal information to third parties",
            "Your interview data remains confidential and is not shared without consent",
            "We maintain strict data protection standards across all operations"
          ]
        },
        {
          subtitle: "Limited Sharing Scenarios",
          items: [
            "With your explicit consent for specific purposes",
            "With trusted service providers who assist in our operations (under strict agreements)",
            "When required by law, regulation, or valid legal process",
            "To protect our rights, property, or safety, or that of our users"
          ]
        },
        {
          subtitle: "Business Transfers",
          items: [
            "In the event of a merger, acquisition, or sale of assets",
            "Users will be notified of any change in ownership or data handling",
            "Data protection standards will be maintained during transitions"
          ]
        }
      ]
    },
    {
      id: "data-security",
      title: "Data Security and Protection",
      icon: <Lock className="h-5 w-5" />,
      content: [
        {
          subtitle: "Technical Safeguards",
          items: [
            "End-to-end encryption for all data transmission",
            "Advanced encryption for data storage (AES-256)",
            "Regular security audits and penetration testing",
            "Multi-factor authentication and access controls"
          ]
        },
        {
          subtitle: "Operational Security",
          items: [
            "SOC 2 Type II compliance and regular assessments",
            "Employee background checks and security training",
            "Incident response procedures and breach notification protocols",
            "Regular backup and disaster recovery testing"
          ]
        },
        {
          subtitle: "Data Retention",
          items: [
            "Personal data retained only as long as necessary for service provision",
            "Interview data retained according to your account settings",
            "Automatic deletion of data upon account closure (unless legally required)",
            "Regular review and purging of unnecessary data"
          ]
        }
      ]
    },
    {
      id: "user-rights",
      title: "Your Rights and Choices",
      icon: <CheckCircle className="h-5 w-5" />,
      content: [
        {
          subtitle: "Access and Control",
          items: [
            "Right to access all personal data we hold about you",
            "Right to correct or update inaccurate information",
            "Right to delete your account and associated data",
            "Right to export your data in a portable format"
          ]
        },
        {
          subtitle: "Privacy Controls",
          items: [
            "Opt-out of non-essential communications and marketing",
            "Control cookie preferences and tracking settings",
            "Manage data sharing preferences within your account",
            "Request restrictions on data processing activities"
          ]
        },
        {
          subtitle: "Regional Rights",
          items: [
            "GDPR rights for European Union residents",
            "CCPA rights for California residents",
            "Additional rights as provided by local privacy laws",
            "Right to lodge complaints with supervisory authorities"
          ]
        }
      ]
    },
    {
      id: "international-transfers",
      title: "International Data Transfers",
      icon: <Globe className="h-5 w-5" />,
      content: [
        {
          subtitle: "Cross-Border Processing",
          items: [
            "Data may be processed in countries where we operate",
            "All transfers comply with applicable data protection laws",
            "Appropriate safeguards in place for international transfers",
            "Standard contractual clauses used where required"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
              <Shield className="h-3 w-3 mr-1" />
              Privacy Policy
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent leading-tight">
              Your Privacy Matters
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              We are committed to protecting your privacy and ensuring transparency in how we collect, use, and safeguard your information.
            </p>
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Privacy at a Glance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Shield className="h-8 w-8" />,
                  title: "Data Protection",
                  description: "Enterprise-grade security with end-to-end encryption and SOC 2 compliance."
                },
                {
                  icon: <Eye className="h-8 w-8" />,
                  title: "Transparency",
                  description: "Clear information about what data we collect and how we use it."
                },
                {
                  icon: <Users className="h-8 w-8" />,
                  title: "Your Control",
                  description: "Full control over your data with easy access, correction, and deletion options."
                }
              ].map((item, index) => (
                <Card key={index} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl w-fit">
                      <div className="text-white">{item.icon}</div>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {sections.map((section, index) => (
              <Card key={index} id={section.id} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-2xl font-bold text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                      <div className="text-white">{section.icon}</div>
                    </div>
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.content.map((subsection, subIndex) => (
                    <div key={subIndex}>
                      {subsection.subtitle && (
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">{subsection.subtitle}</h4>
                      )}
                      <ul className="space-y-2">
                        {subsection.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="mb-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-90" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions About Your Privacy?</h2>
              <p className="text-xl opacity-90 mb-8">
                We're here to help. Contact our privacy team for any questions or concerns.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Email Us</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="opacity-90">privacy@gradii.com</p>
                  <p className="text-sm opacity-75 mt-2">We respond within 24 hours</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Data Requests</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="opacity-90">Submit via your account settings</p>
                  <p className="text-sm opacity-75 mt-2">Processed within 30 days</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                Contact Privacy Team
              </Button>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-300">
                Download Privacy Policy
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;