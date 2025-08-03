# Gradii - AI-Powered Interview Platform

![Gradii Logo](https://gradii.ai/logo.png)

**Version:** 2.7  
**Status:** Beta (Active Development)

Gradii is a comprehensive AI-powered interview platform that transforms the hiring process with intelligent assessments, automated screening, and data-driven insights. Built with Next.js 15, TypeScript, and modern technologies.

## 🌟 Overview

Gradii revolutionizes recruitment by combining artificial intelligence with intuitive user experiences to make hiring fairer, faster, and more effective. The platform serves both employers and candidates with distinct portals optimized for their specific needs.

## 🚀 Key Features

### ✅ **Fully Implemented Features**

#### **Authentication & User Management**
- **Multi-role authentication** (Company users, Candidates, Super Admin)
- **SSO Integration** with SAML and OAuth providers
- **OTP-based authentication** for secure access
- **Domain-based SSO detection** for enterprise users
- **NextAuth.js integration** with custom providers

#### **Interview System**
- **Multiple interview types:**
  - ✅ Behavioral interviews with AI-generated questions
  - ✅ Coding interviews with real-time code editor
  - ✅ Multiple Choice Questions (MCQ) assessments  
  - ✅ Combo interviews (Behavioral + MCQ + Coding)
- **AI-powered question generation** using Google Gemini
- **Real-time interview conduct** with webcam and audio
- **Automated interview scheduling** with calendar integration
- **Interview analytics and scoring** with AI insights

#### **Candidate Management**
- **Comprehensive candidate portal** with profile management
- **Resume upload and parsing** with AI extraction
- **Job application tracking** with status management
- **Interview history and feedback** viewing
- **Document management** system

#### **Job Campaign System**
- **Multi-round interview campaigns** 
- **Job posting and management**
- **Candidate pipeline tracking**
- **Automated candidate screening**
- **Campaign analytics and reporting**

#### **Question Bank & Templates**
- **Dynamic question bank** with categorization
- **AI-powered skill templates** generation
- **Question dependencies** and relationships
- **Template customization** and reuse
- **Difficulty level management**

#### **Analytics & Reporting**
- **Comprehensive dashboard** with real-time metrics
- **Interview performance analytics**
- **Candidate pipeline insights** 
- **Company-wide reporting**
- **Performance trend analysis**

#### **Admin Panel**
- **Super admin dashboard** with platform oversight
- **Company management** and subscription tracking
- **User management** across organizations
- **Platform settings** and configuration
- **Activity logging** and audit trails
- **Database management** tools

#### **Billing & Subscriptions**
- **Stripe integration** for payment processing
- **Multiple subscription plans** (Free, Pro, Enterprise)
- **Automated billing** and invoice management
- **Usage tracking** and limits enforcement
- **Subscription analytics**

#### **API & Integrations**
- **RESTful API** with comprehensive endpoints
- **Webhook system** for real-time updates
- **Azure Blob Storage** integration
- **Email notifications** with templates
- **LinkedIn integration** (in development)

### 🔄 **Partially Implemented Features**

#### **Advanced Analytics**
- ⚠️ **Performance trends** - Basic implementation, needs enhancement
- ⚠️ **Behavioral analysis** - Framework exists, AI models need refinement
- ⚠️ **Predictive scoring** - Data collection in place, ML pipeline pending

#### **Candidate Experience**
- ⚠️ **Job recommendations** - Basic matching, needs AI enhancement
- ⚠️ **Interview preparation** - Resources available, personalization pending
- ⚠️ **Feedback system** - Structure exists, detailed insights pending

#### **Enterprise Features**
- ⚠️ **Advanced SSO configurations** - Basic SAML/OAuth, custom configs pending
- ⚠️ **White-label branding** - UI framework ready, full customization pending
- ⚠️ **API rate limiting** - Basic implementation, advanced controls needed

### 📋 **Placeholder/Not Implemented Features**

#### **AI Enhancements**
- ❌ **Advanced sentiment analysis** during interviews
- ❌ **Facial expression analysis** for behavioral insights  
- ❌ **Voice pattern recognition** and analysis
- ❌ **Automated bias detection** in hiring decisions

#### **Advanced Integrations**
- ❌ **ATS integrations** (Workday, BambooHR, etc.)
- ❌ **Calendar integrations** beyond basic scheduling
- ❌ **Slack/Teams notifications** and collaboration
- ❌ **Advanced LinkedIn features** (posting, sourcing)

#### **Mobile Applications**
- ❌ **Native iOS app** for candidates and interviewers
- ❌ **Native Android app** with full feature parity
- ❌ **Mobile-optimized interview experience**

#### **Advanced Reporting**
- ❌ **Custom report builder** with drag-drop interface
- ❌ **Automated report scheduling** and distribution
- ❌ **Advanced data visualization** with custom charts
- ❌ **Compliance reporting** for regulatory requirements

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Radix UI** for accessible components
- **React Hook Form** for form management

### **Backend Stack**
- **Next.js API Routes** for serverless functions
- **Drizzle ORM** with PostgreSQL
- **NextAuth.js** for authentication
- **Zod** for runtime validation
- **Node.js** server environment

### **Database & Storage**
- **Neon PostgreSQL** for primary database
- **Azure Blob Storage** for file storage
- **Drizzle migrations** for schema management
- **Connection pooling** for performance

### **AI & Integrations**
- **Google Gemini** for AI question generation
- **OpenAI GPT** for advanced text processing
- **Stripe** for payment processing
- **Nodemailer** for email services
- **Azure Storage** for document management

### **Development Tools**
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Drizzle Kit** for database operations

## 📊 Database Schema

### **Core Entities**
- **Companies** - Multi-tenant organization management
- **Users** - Company users with role-based access
- **Candidates** - Separate candidate user system
- **Interviews** - Main interview records with types
- **Job Campaigns** - Multi-round hiring campaigns
- **Question Banks** - Organized question collections
- **Subscriptions** - Billing and plan management

### **Key Relationships**
- Companies → Users (1:many)
- Companies → Job Campaigns (1:many)
- Job Campaigns → Interviews (1:many)
- Interviews → Candidate Applications (1:many)
- Question Banks → Questions (1:many)

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL database
- Azure Storage account
- Stripe account (for billing)
- Google AI API key

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/your-org/gradii.git
cd gradii
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env.local
# Configure your environment variables
```

4. **Database setup**
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. **Run development server**
```bash
npm run dev
```

### **Environment Variables**
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
GOOGLE_AI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"

# Storage
AZURE_STORAGE_CONNECTION_STRING="your-connection"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASS="your-password"
```

## 📱 User Portals

### **Company Dashboard** (`/dashboard`)
- **Overview** with key metrics and analytics
- **Job Campaigns** management and creation
- **Candidate** pipeline and management
- **Interview** scheduling and conduct
- **Question Bank** and template management
- **Analytics** and reporting tools
- **Settings** and configuration

### **Candidate Portal** (`/candidate`)
- **Profile** management and resume upload
- **Job Applications** tracking and status
- **Interview** scheduling and participation
- **Document** management and history
- **Settings** and preferences

### **Admin Panel** (`/admin`)
- **Platform** overview and statistics
- **Company** management and subscriptions
- **User** administration and roles
- **System** settings and configuration
- **Analytics** and platform insights

## 🔐 Authentication & Security

### **Authentication Methods**
- **Email/Password** with secure hashing
- **OTP Authentication** via email/SMS
- **SSO Integration** (SAML, OAuth)
- **Domain-based** automatic SSO detection

### **Security Features**
- **Role-based access control** (RBAC)
- **JWT token** management
- **Session** security and timeout
- **API rate limiting** and protection
- **Data encryption** at rest and transit

## 💳 Subscription Plans

### **Free Plan**
- 10 interviews/month
- 5 team members
- Basic analytics
- Email support

### **Pro Plan** ($49/month)
- 100 interviews/month
- 25 team members
- Advanced analytics
- Priority support
- Custom branding

### **Enterprise Plan** ($199/month)
- Unlimited interviews
- Unlimited team members
- White-label solution
- Dedicated support
- Custom integrations

## 🛠️ Development

### **Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate database migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

### **Project Structure**
```
gradii/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Company dashboard
│   ├── candidate/         # Candidate portal
│   ├── admin/            # Admin panel
│   └── auth/             # Authentication pages
├── components/            # Reusable components
├── lib/                  # Utility libraries
├── shared/               # Shared types and hooks
├── migrations/           # Database migrations
└── public/              # Static assets
```

## 🔧 Known Issues & Limitations

### **Current Limitations**
1. **Mobile responsiveness** needs improvement in interview interface
2. **Real-time collaboration** features are basic
3. **Advanced AI analytics** require more training data
4. **Bulk operations** in admin panel need optimization
5. **Email templates** need design improvements

### **Performance Considerations**
- **Database queries** need optimization for large datasets
- **File upload** size limits may need adjustment
- **Real-time features** may require WebSocket implementation
- **Caching strategy** needs enhancement for better performance

## 🗺️ Roadmap

### **Q1 2024**
- [ ] Mobile application development
- [ ] Advanced AI analytics implementation
- [ ] ATS integrations (Workday, BambooHR)
- [ ] Enhanced reporting and visualization

### **Q2 2024**
- [ ] White-label customization completion
- [ ] Advanced SSO configurations
- [ ] API v2 with GraphQL
- [ ] Machine learning pipeline for predictive scoring

### **Q3 2024**
- [ ] Voice and video analysis features
- [ ] Automated bias detection
- [ ] Advanced collaboration tools
- [ ] Compliance and audit features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.gradii.ai](https://docs.gradii.ai)
- **Email**: support@gradii.ai
- **Discord**: [Join our community](https://discord.gg/gradii)
- **Issues**: [GitHub Issues](https://github.com/your-org/gradii/issues)

## 🏢 Company

**Gradii Inc.**  
Building the future of AI-powered hiring.

- **Website**: [gradii.ai](https://gradii.ai)
- **LinkedIn**: [linkedin.com/company/gradii](https://linkedin.com/company/gradii)
- **Twitter**: [@gradii_ai](https://twitter.com/gradii_ai)

---

*Last updated: December 2024*
*Version: 2.7*