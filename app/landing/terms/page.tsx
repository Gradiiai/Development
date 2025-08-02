'use client';

import React from 'react';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { 
  FileText, 
  Scale, 
  CreditCard, 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Mail,
  Gavel,
  Lock,
  RefreshCw
} from 'lucide-react';

const TermsAndConditionsPage = () => {
  const lastUpdated = "December 15, 2024";
  const effectiveDate = "January 1, 2024";

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: <CheckCircle className="h-5 w-5" />,
      content: [
        {
          items: [
            "By accessing or using Gradii services, you agree to be bound by these Terms and Conditions",
            "If you do not agree to these terms, you may not use our services",
            "These terms apply to all users, including visitors, registered users, and paying customers",
            "Your continued use of the service constitutes acceptance of any updates to these terms"
          ]
        }
      ]
    },
    {
      id: "service-description",
      title: "Service Description",
      icon: <FileText className="h-5 w-5" />,
      content: [
        {
          subtitle: "What We Provide",
          items: [
            "AI-powered interview analysis and candidate evaluation tools",
            "Interview question generation and customization features",
            "Performance analytics and reporting capabilities",
            "Integration with third-party applicant tracking systems"
          ]
        },
        {
          subtitle: "Service Availability",
          items: [
            "We strive for 99.9% uptime but cannot guarantee uninterrupted service",
            "Scheduled maintenance will be announced in advance when possible",
            "Emergency maintenance may occur without prior notice",
            "Service availability may vary by geographic location"
          ]
        }
      ]
    },
    {
      id: "user-responsibilities",
      title: "User Responsibilities and Conduct",
      icon: <Users className="h-5 w-5" />,
      content: [
        {
          subtitle: "Account Security",
          items: [
            "Maintain the confidentiality of your account credentials",
            "Notify us immediately of any unauthorized access to your account",
            "Use strong passwords and enable two-factor authentication when available",
            "You are responsible for all activities that occur under your account"
          ]
        },
        {
          subtitle: "Acceptable Use",
          items: [
            "Use the service only for lawful purposes and in accordance with these terms",
            "Respect the privacy and rights of interview candidates",
            "Obtain proper consent before recording or analyzing interviews",
            "Comply with all applicable employment and privacy laws in your jurisdiction"
          ]
        },
        {
          subtitle: "Prohibited Activities",
          items: [
            "Attempting to gain unauthorized access to our systems or other users' accounts",
            "Using the service to discriminate against candidates based on protected characteristics",
            "Sharing, selling, or redistributing our proprietary algorithms or data",
            "Interfering with or disrupting the service or servers",
            "Using automated tools to access the service without permission",
            "Uploading malicious code, viruses, or harmful content"
          ]
        }
      ]
    },
    {
      id: "service-limits",
      title: "Service Limits and Restrictions",
      icon: <Shield className="h-5 w-5" />,
      content: [
        {
          subtitle: "Usage Limits",
          items: [
            "Free accounts are limited to 10 interviews per month",
            "API rate limits apply to prevent abuse and ensure fair usage",
            "Storage limits may apply based on your subscription plan",
            "We reserve the right to implement additional limits to maintain service quality"
          ]
        },
        {
          subtitle: "Content Restrictions",
          items: [
            "Interview content must comply with applicable laws and regulations",
            "We reserve the right to remove content that violates our policies",
            "Users are responsible for ensuring they have rights to upload content",
            "Copyrighted material may only be uploaded with proper authorization"
          ]
        },
        {
          subtitle: "Geographic Restrictions",
          items: [
            "Service availability may be restricted in certain countries",
            "Some features may not be available in all jurisdictions",
            "Users must comply with local laws regarding data processing and employment"
          ]
        }
      ]
    },
    {
      id: "payment-terms",
      title: "Payment Terms and Billing",
      icon: <CreditCard className="h-5 w-5" />,
      content: [
        {
          subtitle: "Subscription Plans",
          items: [
            "Paid subscriptions are billed monthly or annually in advance",
            "Prices are subject to change with 30 days' notice to existing subscribers",
            "Upgrades take effect immediately; downgrades take effect at the next billing cycle",
            "All fees are non-refundable except as expressly stated in our refund policy"
          ]
        },
        {
          subtitle: "Payment Processing",
          items: [
            "We accept major credit cards and PayPal for payment",
            "Enterprise customers may pay via bank transfer or purchase order",
            "Failed payments may result in service suspension after a grace period",
            "You authorize us to charge your payment method for recurring subscriptions"
          ]
        },
        {
          subtitle: "Taxes",
          items: [
            "Prices are exclusive of applicable taxes unless otherwise stated",
            "You are responsible for paying all applicable taxes",
            "We will add applicable sales tax or VAT to your invoice where required"
          ]
        }
      ]
    },
    {
      id: "refund-policy",
      title: "Refund and Cancellation Policy",
      icon: <RefreshCw className="h-5 w-5" />,
      content: [
        {
          subtitle: "Money-Back Guarantee",
          items: [
            "30-day money-back guarantee for new paid subscriptions",
            "Refunds must be requested within 30 days of initial payment",
            "Refunds are processed to the original payment method within 5-10 business days",
            "Free trial users are not eligible for refunds"
          ]
        },
        {
          subtitle: "Cancellation",
          items: [
            "You may cancel your subscription at any time from your account settings",
            "Cancellation takes effect at the end of your current billing period",
            "You retain access to paid features until the end of your billing period",
            "No partial refunds for unused portions of billing periods"
          ]
        },
        {
          subtitle: "Service Termination",
          items: [
            "We may suspend or terminate accounts for violation of these terms",
            "We will provide reasonable notice before termination when possible",
            "Upon termination, you lose access to all service features and data",
            "You may export your data before termination subject to technical limitations"
          ]
        }
      ]
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property Rights",
      icon: <Lock className="h-5 w-5" />,
      content: [
        {
          subtitle: "Our Rights",
          items: [
            "Gradii and all related trademarks are our property",
            "Our software, algorithms, and methodologies are proprietary",
            "You may not reverse engineer, decompile, or attempt to extract our source code",
            "We retain all rights not expressly granted to you"
          ]
        },
        {
          subtitle: "Your Rights",
          items: [
            "You retain ownership of your interview data and content",
            "You grant us a license to process your data to provide our services",
            "You may export your data in standard formats",
            "You are responsible for ensuring you have rights to upload content"
          ]
        }
      ]
    },
    {
      id: "liability-disclaimers",
      title: "Liability and Disclaimers",
      icon: <AlertTriangle className="h-5 w-5" />,
      content: [
        {
          subtitle: "Service Disclaimers",
          items: [
            "Our service is provided 'as is' without warranties of any kind",
            "We do not guarantee the accuracy of AI-generated insights or recommendations",
            "Users are responsible for making final hiring decisions",
            "We disclaim liability for decisions made based on our analysis"
          ]
        },
        {
          subtitle: "Limitation of Liability",
          items: [
            "Our liability is limited to the amount paid for services in the preceding 12 months",
            "We are not liable for indirect, incidental, or consequential damages",
            "We are not responsible for third-party integrations or services",
            "Some jurisdictions may not allow these limitations"
          ]
        }
      ]
    },
    {
      id: "governing-law",
      title: "Governing Law and Disputes",
      icon: <Gavel className="h-5 w-5" />,
      content: [
        {
          subtitle: "Applicable Law",
          items: [
            "These terms are governed by the laws of [Your Jurisdiction]",
            "Any disputes will be resolved in the courts of [Your Jurisdiction]",
            "You consent to the jurisdiction of these courts"
          ]
        },
        {
          subtitle: "Dispute Resolution",
          items: [
            "We encourage informal resolution of disputes through direct communication",
            "Formal disputes may be subject to binding arbitration",
            "Class action lawsuits are waived where legally permissible"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
              <Scale className="h-3 w-3 mr-1" />
              Terms & Conditions
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 bg-clip-text text-transparent leading-tight">
              Terms of Service
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Please read these terms carefully. They govern your use of Gradii and outline our mutual rights and responsibilities.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 text-gray-500">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {lastUpdated}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Effective: {effectiveDate}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Key Points</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  icon: <Users className="h-6 w-6" />,
                  title: "User Conduct",
                  description: "Use our service responsibly and legally"
                },
                {
                  icon: <CreditCard className="h-6 w-6" />,
                  title: "Fair Billing",
                  description: "Transparent pricing with 30-day refund policy"
                },
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Service Limits",
                  description: "Usage limits ensure quality for all users"
                },
                {
                  icon: <Scale className="h-6 w-6" />,
                  title: "Legal Protection",
                  description: "Clear terms protect both parties"
                }
              ].map((item, index) => (
                <Card key={index} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                  <CardHeader className="pb-4">
                    <div className="mx-auto mb-3 p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl w-fit">
                      <div className="text-white">{item.icon}</div>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-800">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm">{item.description}</p>
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
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                      <div className="text-white">{section.icon}</div>
                    </div>
                    <span>{section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.content.map((subsection, subIndex) => (
                    <div key={subIndex}>
                      {'subtitle' in subsection && subsection.subtitle && (
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

      {/* Important Notice */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-amber-200 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-xl font-bold text-amber-800">
                  <AlertTriangle className="h-6 w-6" />
                  <span>Important Legal Notice</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>AI Assistance Disclaimer:</strong> Gradii provides AI-powered analysis and recommendations to assist in the interview process. However, all final hiring decisions remain the sole responsibility of the user. Our AI tools are designed to supplement, not replace, human judgment in recruitment.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Compliance Responsibility:</strong> Users must ensure their use of Gradii complies with all applicable employment laws, anti-discrimination regulations, and privacy requirements in their jurisdiction. We recommend consulting with legal counsel for specific compliance questions.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Data Processing:</strong> By using our service, you acknowledge that interview data may be processed using artificial intelligence and machine learning technologies. Ensure you have proper consent from interview participants before using our platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Questions About These Terms?</h2>
            <p className="text-xl opacity-90 mb-8">
              Our legal team is here to help clarify any questions about our terms of service.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Legal Inquiries</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="opacity-90">legal@gradii.com</p>
                  <p className="text-sm opacity-75 mt-2">Response within 2 business days</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 bg-white/10 backdrop-blur-sm text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Terms Updates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="opacity-90">Notifications via email</p>
                  <p className="text-sm opacity-75 mt-2">30 days advance notice</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                Contact Legal Team
              </Button>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-purple-600 px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-300">
                Download Terms PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsAndConditionsPage;