'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  Code, 
  Play, 
  Copy, 
  Check,
  FileText,
  Zap,
  Settings,
  HelpCircle,
  ExternalLink,
  Download,
  Star,
  Users,
  MessageSquare,
  Lightbulb
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  subsections?: {
    id: string;
    title: string;
  }[];
}

interface CodeExample {
  language: string;
  title: string;
  code: string;
}

const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Play className="h-4 w-4" />,
      subsections: [
        { id: 'quick-start', title: 'Quick Start Guide' },
        { id: 'installation', title: 'Installation' },
        { id: 'authentication', title: 'Authentication' },
        { id: 'first-interview', title: 'Your First Interview' }
      ]
    },
    {
      id: 'features',
      title: 'Feature Guides',
      icon: <Zap className="h-4 w-4" />,
      subsections: [
        { id: 'ai-analysis', title: 'AI Analysis' },
        { id: 'custom-questions', title: 'Custom Questions' },
        { id: 'team-collaboration', title: 'Team Collaboration' },
        { id: 'integrations', title: 'Integrations' },
        { id: 'reporting', title: 'Reporting & Analytics' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: <Code className="h-4 w-4" />,
      subsections: [
        { id: 'api-overview', title: 'API Overview' },
        { id: 'endpoints', title: 'Endpoints' },
        { id: 'webhooks', title: 'Webhooks' },
        { id: 'rate-limits', title: 'Rate Limits' }
      ]
    },
    {
      id: 'configuration',
      title: 'Configuration',
      icon: <Settings className="h-4 w-4" />,
      subsections: [
        { id: 'account-settings', title: 'Account Settings' },
        { id: 'team-management', title: 'Team Management' },
        { id: 'security', title: 'Security Settings' },
        { id: 'billing', title: 'Billing & Subscriptions' }
      ]
    },
    {
      id: 'faqs',
      title: 'FAQs',
      icon: <HelpCircle className="h-4 w-4" />
    }
  ];

  const codeExamples: { [key: string]: CodeExample[] } = {
    javascript: [
      {
        language: 'javascript',
        title: 'Initialize Gradii SDK',
        code: `// Install the SDK
npm install @gradii/sdk

// Initialize the client
import { Gradii } from '@gradii/sdk';

const client = new Gradii({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
});

// Create a new interview session
const interview = await client.interviews.create({
  candidateId: 'candidate-123',
  position: 'Software Engineer',
  questions: [
    {
      type: 'technical',
      difficulty: 'medium',
      topic: 'algorithms'
    }
  ]
});`
      },
      {
        language: 'javascript',
        title: 'Analyze Interview Response',
        code: `// Analyze a candidate's response
const analysis = await client.analysis.create({
  interviewId: interview.id,
  response: {
    questionId: 'q-123',
    answer: 'The candidate\'s response text...',
    duration: 180, // seconds
    confidence: 0.85
  }
});

console.log('Analysis Results:', {
  score: analysis.score,
  strengths: analysis.strengths,
  improvements: analysis.improvements,
  sentiment: analysis.sentiment
});`
      }
    ],
    python: [
      {
        language: 'python',
        title: 'Python SDK Setup',
        code: `# Install the Python SDK
pip install gradii-python

# Import and initialize
from gradii import Gradii

client = Gradii(
    api_key="your-api-key",
    environment="production"
)

# Create interview session
interview = client.interviews.create(
    candidate_id="candidate-123",
    position="Data Scientist",
    questions=[
        {
            "type": "behavioral",
            "category": "leadership",
            "difficulty": "medium"
        }
    ]
)`
      },
      {
        language: 'python',
        title: 'Batch Analysis',
        code: `# Analyze multiple responses at once
responses = [
    {
        "question_id": "q-1",
        "answer": "Response 1...",
        "duration": 120
    },
    {
        "question_id": "q-2",
        "answer": "Response 2...",
        "duration": 180
    }
]

# Batch analysis
results = client.analysis.batch_create(
    interview_id=interview.id,
    responses=responses
)

for result in results:
    print(f"Question {result.question_id}: {result.score}/100")`
      }
    ]
  };

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Getting Started with Gradii</h2>
              <p className="text-lg text-gray-600 mb-6">
                Welcome to Gradii! This guide will help you get up and running with our AI-powered interview platform in just a few minutes.
              </p>
            </div>

            <Card className="border-0 bg-gradient-to-br from-teal-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-teal-600" />
                  <span>Quick Start Checklist</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    'Create your Gradii account',
                    'Set up your organization profile',
                    'Install the SDK or access the web interface',
                    'Configure your first interview template',
                    'Conduct your first AI-powered interview'
                  ].map((step, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5 text-blue-600" />
                    <span>For Developers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">Integrate Gradii into your existing workflow with our comprehensive APIs and SDKs.</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      API Documentation
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Download SDK
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>For HR Teams</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">Get started with our intuitive web interface designed for recruitment professionals.</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Play className="h-4 w-4 mr-2" />
                      Video Tutorial
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Best Practices Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Feature Guides</h2>
              <p className="text-lg text-gray-600 mb-6">
                Explore the powerful features that make Gradii the leading AI-powered interview platform.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[
                {
                  title: 'AI-Powered Analysis',
                  description: 'Get deep insights into candidate responses with our advanced AI algorithms.',
                  features: ['Sentiment analysis', 'Skill assessment', 'Bias detection', 'Confidence scoring'],
                  icon: <Zap className="h-6 w-6" />,
                  color: 'from-yellow-500 to-orange-500'
                },
                {
                  title: 'Custom Question Templates',
                  description: 'Create tailored interview questions for different roles and skill levels.',
                  features: ['Role-specific questions', 'Difficulty levels', 'Question categories', 'Custom scoring'],
                  icon: <FileText className="h-6 w-6" />,
                  color: 'from-blue-500 to-purple-500'
                },
                {
                  title: 'Team Collaboration',
                  description: 'Work together with your team to evaluate candidates effectively.',
                  features: ['Shared evaluations', 'Comment system', 'Role permissions', 'Real-time updates'],
                  icon: <Users className="h-6 w-6" />,
                  color: 'from-green-500 to-teal-500'
                },
                {
                  title: 'Advanced Reporting',
                  description: 'Generate comprehensive reports and analytics for data-driven decisions.',
                  features: ['Performance metrics', 'Trend analysis', 'Export options', 'Custom dashboards'],
                  icon: <Star className="h-6 w-6" />,
                  color: 'from-purple-500 to-pink-500'
                }
              ].map((feature, index) => (
                <Card key={index} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                      <div className="text-white">{feature.icon}</div>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.features.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      Learn More
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'api-reference':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">API Reference</h2>
              <p className="text-lg text-gray-600 mb-6">
                Complete reference for the Gradii API with code examples in multiple languages.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800">JavaScript Examples</h3>
                {codeExamples.javascript.map((example, index) => (
                  <Card key={index} className="border-0 bg-gray-900 text-white overflow-hidden">
                    <CardHeader className="bg-gray-800">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center space-x-2">
                          <Code className="h-5 w-5" />
                          <span>{example.title}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-gray-700"
                          onClick={() => copyToClipboard(example.code, `js-${index}`)}
                        >
                          {copiedCode === `js-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <pre className="p-4 overflow-x-auto text-sm">
                        <code>{example.code}</code>
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800">Python Examples</h3>
                {codeExamples.python.map((example, index) => (
                  <Card key={index} className="border-0 bg-gray-900 text-white overflow-hidden">
                    <CardHeader className="bg-gray-800">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center space-x-2">
                          <Code className="h-5 w-5" />
                          <span>{example.title}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-gray-700"
                          onClick={() => copyToClipboard(example.code, `py-${index}`)}
                        >
                          {copiedCode === `py-${index}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <pre className="p-4 overflow-x-auto text-sm">
                        <code>{example.code}</code>
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 'faqs':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600 mb-6">
                Find answers to common questions about Gradii.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  category: 'Getting Started',
                  questions: [
                    {
                      q: 'How do I create my first interview?',
                      a: 'Navigate to the Dashboard and click "New Interview". Select your interview template, add candidate details, and configure your questions. The AI will guide you through the setup process.'
                    },
                    {
                      q: 'What types of questions can I create?',
                      a: 'Gradii supports technical, behavioral, situational, and custom questions. You can also use our pre-built question libraries for common roles like Software Engineer, Product Manager, and Sales Representative.'
                    }
                  ]
                },
                {
                  category: 'AI Analysis',
                  questions: [
                    {
                      q: 'How accurate is the AI analysis?',
                      a: 'Our AI models are trained on millions of interview responses and achieve 95%+ accuracy in skill assessment. However, we recommend using AI insights as a supplement to human judgment, not a replacement.'
                    },
                    {
                      q: 'Can I customize the AI scoring criteria?',
                      a: 'Yes! Pro and Enterprise plans allow you to customize scoring weights, add custom evaluation criteria, and train the AI on your specific requirements.'
                    }
                  ]
                },
                {
                  category: 'Integration & API',
                  questions: [
                    {
                      q: 'Which ATS systems do you integrate with?',
                      a: 'We integrate with popular ATS platforms including Greenhouse, Lever, Workday, BambooHR, and many others. Enterprise customers can also request custom integrations.'
                    },
                    {
                      q: 'What are the API rate limits?',
                      a: 'Free plans have 100 requests/hour, Pro plans have 1,000 requests/hour, and Enterprise plans have custom limits. Rate limits reset every hour.'
                    }
                  ]
                }
              ].map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{category.category}</h3>
                  <div className="space-y-4">
                    {category.questions.map((faq, faqIndex) => (
                      <Card key={faqIndex} className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-800">{faq.q}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'configuration':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Configuration</h2>
              <p className="text-gray-600 mb-6">Configure Gradii to match your organization's needs and integrate with your existing systems.</p>
            </div>
            
            {/* Environment Setup */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Environment Variables</h3>
                <p className="text-gray-600 mb-4">Configure these environment variables for proper functionality:</p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm">
{`# Database Configuration
NEXT_PUBLIC_DRIZZLE_DB_URL="postgresql://username:password@localhost:5432/gradii"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="your-openai-api-key"

# File Storage
AZURE_STORAGE_CONNECTION_STRING="your-azure-connection-string"
AZURE_STORAGE_CONTAINER_NAME="resumes"

# Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Application Settings
NODE_ENV="production"
PORT=3000`}
                  </pre>
                </div>
                <button 
                  onClick={() => copyToClipboard(`# Database Configuration\nNEXT_PUBLIC_DRIZZLE_DB_URL="postgresql://username:password@localhost:5432/gradii"\n\n# Authentication\nNEXTAUTH_SECRET="your-secret-key-here"\nNEXTAUTH_URL="http://localhost:3000"\n\n# AI Services\nOPENAI_API_KEY="your-openai-api-key"\n\n# File Storage\nAZURE_STORAGE_CONNECTION_STRING="your-azure-connection-string"\nAZURE_STORAGE_CONTAINER_NAME="resumes"\n\n# Email Service\nSMTP_HOST="smtp.gmail.com"\nSMTP_PORT=587\nSMTP_USER="your-email@gmail.com"\nSMTP_PASS="your-app-password"\n\n# Application Settings\nNODE_ENV="production"\nPORT=3000`, 'config')}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                >
                  Copy Configuration
                </button>
              </CardContent>
            </Card>
            
            {/* Database Setup */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Database Setup</h3>
                <p className="text-gray-600 mb-4">Set up your PostgreSQL database with the required schema:</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">1. Install Dependencies</h4>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <code className="text-green-400">npm install drizzle-orm @neondatabase/serverless</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">2. Run Migrations</h4>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <code className="text-green-400">npm run db:migrate</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">3. Seed Initial Data</h4>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <code className="text-green-400">npm run db:seed</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Integration Settings */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Third-Party Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Google Maps API</h4>
                    <p className="text-gray-600 text-sm mb-2">For interactive maps on contact page</p>
                    <div className="bg-gray-100 rounded p-2 text-sm">
                      <code>GOOGLE_MAPS_API_KEY="your-api-key"</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Stripe Integration</h4>
                    <p className="text-gray-600 text-sm mb-2">For payment processing</p>
                    <div className="bg-gray-100 rounded p-2 text-sm">
                      <code>STRIPE_SECRET_KEY="sk_test_..."</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Slack Notifications</h4>
                    <p className="text-gray-600 text-sm mb-2">For team notifications</p>
                    <div className="bg-gray-100 rounded p-2 text-sm">
                      <code>SLACK_WEBHOOK_URL="https://hooks.slack.com/..."</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Calendar Integration</h4>
                    <p className="text-gray-600 text-sm mb-2">For interview scheduling</p>
                    <div className="bg-gray-100 rounded p-2 text-sm">
                      <code>GOOGLE_CALENDAR_API_KEY="your-api-key"</code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Section Coming Soon</h2>
            <p className="text-gray-600">This documentation section is currently being developed.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
              <BookOpen className="h-3 w-3 mr-1" />
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent leading-tight">
              Developer Documentation
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Everything you need to integrate and use Gradii effectively. From quick start guides to advanced API references.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800">Documentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {docSections.map((section) => (
                    <div key={section.id}>
                      <Button
                        variant={activeSection === section.id ? 'default' : 'ghost'}
                        className={`w-full justify-start text-left ${
                          activeSection === section.id 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        {section.icon}
                        <span className="ml-2">{section.title}</span>
                      </Button>
                      
                      {section.subsections && activeSection === section.id && (
                        <div className="ml-6 mt-2 space-y-1">
                          {section.subsections.map((subsection) => (
                            <Button
                              key={subsection.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left text-gray-600 hover:bg-gray-100"
                            >
                              <ChevronRight className="h-3 w-3 mr-2" />
                              {subsection.title}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:w-3/4">
              <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
                <CardContent className="p-8">
                  {renderContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Need More Help?</h2>
            <p className="text-xl opacity-90 mb-8">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  icon: <MessageSquare className="h-6 w-6" />,
                  title: 'Live Chat',
                  description: 'Get instant help from our support team'
                },
                {
                  icon: <FileText className="h-6 w-6" />,
                  title: 'Submit Ticket',
                  description: 'Create a support ticket for detailed assistance'
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: 'Community',
                  description: 'Join our developer community forum'
                }
              ].map((item, index) => (
                <Card key={index} className="border-0 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 p-3 bg-white/20 rounded-xl w-fit">
                      {item.icon}
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm opacity-90">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DocumentationPage;