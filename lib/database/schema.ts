import { pgTable, serial, varchar, text, boolean, date, timestamp, uuid, primaryKey, integer, jsonb, numeric } from 'drizzle-orm/pg-core';
import { AdapterAccount } from "@auth/core/adapters";

// Core Interview Tables
export const Interview = pgTable("interview", {
  id: serial("id").primaryKey(),
  interviewQuestions: text("interviewQuestions").notNull(),
  jobPosition: varchar("jobPosition", { length: 255 }).notNull(),
  jobDescription: text("jobDescription").notNull(),
  jobExperience: varchar("jobExperience", { length: 100 }).notNull(),
  fileData: text("file_data"),
  createdBy: uuid("createdBy").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").references(() => jobCampaigns.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  interviewId: varchar("interviewId", { length: 255 }).notNull().unique(),
  candidateName: varchar("candidateName", { length: 255 }),
  candidateEmail: varchar("candidateEmail", { length: 255 }),
  interviewDate: date("interviewDate"),
  interviewTime: varchar("interviewTime", { length: 50 }),
  interviewStatus: varchar("interviewStatus", { length: 50 }).default("scheduled"),
  interviewLink: varchar("interviewLink", { length: 1000 }),
  linkExpiryTime: timestamp("linkExpiryTime"),
  interviewType: varchar("interviewType", { length: 50 }).default("behavioral"),
});

// UserAnswer table removed - migrated to candidateInterviewHistory.feedback

export const CodingInterview = pgTable("coding_interview", {
  id: serial("id").primaryKey(),
  codingQuestions: text("codingQuestions").notNull(),
  interviewId: varchar("interview_id", { length: 255 }).notNull().unique(),
  interviewTopic: varchar("interview_topic", { length: 255 }).notNull(),
  difficultyLevel: varchar("difficulty_level", { length: 50 }).notNull(),
  problemDescription: text("problem_description").notNull(),
  timeLimit: integer("time_limit").notNull(),
  programmingLanguage: varchar("programming_language", { length: 100 }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  candidateName: varchar("candidateName", { length: 255 }),
  candidateEmail: varchar("candidateEmail", { length: 255 }),
  interviewDate: date("interviewDate"),
  interviewTime: varchar("interviewTime", { length: 50 }),
  interviewStatus: varchar("interviewStatus", { length: 50 }).default("scheduled"),
  interviewLink: varchar("interviewLink", { length: 1000 }),
  linkExpiryTime: timestamp("linkExpiryTime"),
});

// UserCodeAnswer table removed - migrated to candidateInterviewHistory.feedback

export const InterviewAnalytics = pgTable("interview_analytics", {
  id: serial("id").primaryKey(),
  interviewId: varchar("interviewId", { length: 255 }).notNull(),
  interviewType: varchar("interviewType", { length: 100 }).notNull(),
  completionStatus: boolean("completionStatus").default(false),
  candidateName: varchar("candidateName", { length: 255 }),
  candidateEmail: varchar("candidateEmail", { length: 255 }),
  interviewerEmail: varchar("interviewerEmail", { length: 255 }).notNull(),
  scheduledTime: timestamp("scheduledTime"),
  completionTime: timestamp("completionTime"),
  overallRating: integer("overallRating"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
});

// Authentication Tables
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  domain: varchar("domain", { length: 255 }).unique(),
  description: text("description"),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("free"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("active"),
  monthlyRevenue: integer("monthly_revenue").default(0),
  yearlyRevenue: integer("yearly_revenue").default(0),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  maxInterviews: integer("max_interviews").default(10),
  maxUsers: integer("max_users").default(5),
  // Stripe integration fields
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  stripeCurrentPeriodStart: timestamp("stripe_current_period_start"),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
  stripeStatus: varchar("stripe_status", { length: 50 }),
  stripeCancelAtPeriodEnd: boolean("stripe_cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  logo: varchar("logo", { length: 500 }),
  industry: varchar("industry", { length: 255 }),
  size: varchar("size", { length: 100 }),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: varchar("image", { length: 255 }),
  password: varchar("password", { length: 255 }),
  role: varchar("role", { length: 50 }).default("company"), // super-admin, company, candidate
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  department: varchar("department", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  otpLoginEnabled: boolean("otp_login_enabled").default(true), // OTP login preference
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).notNull().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// OTP Storage for authentication
export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 50 }).notNull(), // 'signup', 'signin', 'candidate_access'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
});

// ===== UNIFIED INTERVIEW SYSTEM REMOVED =====
// You only use Direct and Campaign interviews, so unified system was removed for optimization

// Temporary candidate access for interview links (DEPRECATED - will be removed)
export const candidateAccess = pgTable("candidate_access", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  candidateEmail: varchar("candidate_email", { length: 255 }).notNull(),
  interviewId: varchar("interview_id").notNull(),
  interviewType: varchar("interview_type").notNull(), // 'regular' or 'coding'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  companyId: uuid("company_id").references(() => companies.id),
  otpVerified: boolean("otp_verified").default(false),
  sessionStartedAt: timestamp("session_started_at"),
  sessionExpiresAt: timestamp("session_expires_at"),
});

// Job Campaign Management Tables
export const jobCampaigns = pgTable("job_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  experienceLevel: varchar("experience_level", { length: 100 }).notNull(),
  employeeType: varchar("employee_type", { length: 100 }).notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
   salaryNegotiable: boolean("salary_negotiable").default(false),
  currency: varchar("currency", { length: 10 }).default("INR"),
  numberOfOpenings: integer("number_of_openings").notNull(),
  jobDescription: text("job_description").notNull(),
  jobDuties: text("job_duties"),
  jobRequirements: text("job_requirements"), // Skills and requirements
  jobBenefits: text("job_benefits"), // Company benefits
  requiredSkills: text("required_skills"), // JSON array of required skills with weights
  competencies: text("competencies"), // JSON array of competencies with weights
  minExperience: integer("min_experience").default(0), // Minimum years of experience
  maxExperience: integer("max_experience"), // Maximum years of experience
  jobDescriptionTemplateId: uuid("job_description_template_id").references(() => jobDescriptionTemplates.id),
  skillTemplateId: uuid("skill_template_id").references(() => skillTemplates.id),
  status: varchar("status", { length: 50 }).default("draft"), // draft, active, paused, closed
  campaignType: varchar("campaign_type", { length: 20 }).default("specific").notNull(), // permanent, specific
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  applicationDeadline: timestamp("application_deadline"),
  targetHireDate: timestamp("target_hire_date"),
  isRemote: boolean("is_remote").default(false).notNull(),
  isHybrid: boolean("is_hybrid").default(false).notNull(),
  totalApplicants: integer("total_applicants").default(0).notNull(),
  activeApplicants: integer("active_applicants").default(0).notNull(),

});

// jobPortalSyncs table removed - job portal sync functionality deprecated

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  resumeUrl: varchar("resume_url", { length: 500 }),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  experience: varchar("experience", { length: 100 }),
  currentCompany: varchar("current_company", { length: 255 }),
  currentRole: varchar("current_role", { length: 255 }),
  skills: text("skills"), // JSON array of skills
  source: varchar("source", { length: 100 }).notNull(), // manual, linkedin, indeed, naukri, etc.
  status: varchar("status", { length: 50 }).default("applied"), // applied, screening, interview, hired, rejected
  overallScore: integer("overall_score").default(0),
  talentFitScore: integer("talent_fit_score").default(0),
  aiParsedData: text("ai_parsed_data"), // JSON data from AI resume parsing
  notes: text("notes"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastContactedAt: timestamp("last_contacted_at"),
  expectedSalary: integer("expected_salary"),
  noticePeriod: integer("notice_period"), // in days
  location: varchar("location", { length: 255 }),
  educationLevel: varchar("education_level", { length: 255 }),
  educationInstitution: varchar("education_institution", { length: 255 }),
});

export const scoringParameters = pgTable("scoring_parameters", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  parameterType: varchar("parameter_type", { length: 100 }).notNull(), // skill, competency, experience, education
  parameterName: varchar("parameter_name", { length: 255 }).notNull(),
  weight: integer("weight").notNull(), // percentage weight
  proficiencyLevel: varchar("proficiency_level", { length: 100 }), // beginner, intermediate, advanced, expert
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description"),
  scoringMethod: varchar("scoring_method", { length: 100 }).default("manual"), // manual, ai, hybrid
});

export const candidateScores = pgTable("candidate_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  parameterId: uuid("parameter_id").notNull().references(() => scoringParameters.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  aiGenerated: boolean("ai_generated").default(true),
  manualOverride: boolean("manual_override").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  scoredBy: uuid("scored_by").references(() => users.id),
  evidenceText: text("evidence_text"),
});

export const interviewSetups = pgTable("interview_setups", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  roundName: varchar("round_name", { length: 255 }).notNull(),
  interviewType: varchar("interview_type", { length: 100 }).notNull(), // behavioral, coding, mcq, combo
  timeLimit: integer("time_limit").notNull(), // in minutes
  questionCollectionId: uuid("question_collection_id").references(() => questionCollections.id), // Updated to reference questionCollections
  numberOfQuestions: integer("number_of_questions").notNull(),
  randomizeQuestions: boolean("randomize_questions").default(true),
  difficultyLevel: varchar("difficulty_level", { length: 100 }).notNull(),
  instructions: text("instructions"),
  passingScore: integer("passing_score").default(70),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  isAutomated: boolean("is_automated").default(true),
  interviewerInstructions: text("interviewer_instructions"),
});

export const campaignInterviews = pgTable("campaign_interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  setupId: uuid("setup_id").references(() => interviewSetups.id, { onDelete: "cascade" }),
  interviewId: varchar("interview_id").notNull(), // links to existing Interview or CodingInterview
  interviewType: varchar("interview_type", { length: 100 }).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, in_progress, completed, cancelled
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  interviewerNotes: text("interviewer_notes"),
  candidateNotes: text("candidate_notes"),
  interviewLink: varchar("interview_link", { length: 1000 }),
  interviewerId: uuid("interviewer_id").references(() => users.id),
  recordingUrl: varchar("recording_url", { length: 500 }),
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
});

// Simplified Question Collections (replaces questionBanks + questionBankTemplates)
export const questionCollections = pgTable("question_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }), // Nullable for system templates
  createdBy: uuid("created_by").references(() => users.id), // Nullable for system templates
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Categorization
  category: varchar("category", { length: 100 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  tags: text("tags"), // JSON array of tags
  
  // Collection type (replaces separate template table)
  collectionType: varchar("collection_type", { length: 50 }).notNull().default("custom"), // custom, system_template, shared
  
  // Status and visibility
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  
  // Metadata
  questionCount: integer("question_count").default(0),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Template-specific fields (for system templates)
  targetRoles: text("target_roles"), // JSON array for templates
  difficultyLevels: text("difficulty_levels"), // JSON array for templates
  estimatedQuestions: integer("estimated_questions"), // For templates
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Simplified Questions (replaces questionBank with cleaner naming)
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id").references(() => questionCollections.id, { onDelete: "cascade" }), // Nullable for standalone questions
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }), // Nullable for system questions
  createdBy: uuid("created_by").notNull().references(() => users.id),
  
  // Question content
  questionType: varchar("question_type", { length: 50 }).notNull(),
  question: text("question").notNull(),
  
  // Answers and scoring
  expectedAnswer: text("expected_answer"),
  sampleAnswer: text("sample_answer"),
  scoringRubric: jsonb("scoring_rubric"),
  
  // MCQ specific
  multipleChoiceOptions: jsonb("multiple_choice_options"),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  
  // Categorization
  category: varchar("category", { length: 100 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  difficultyLevel: varchar("difficulty_level", { length: 50 }).notNull(),
  
  // Metadata
  tags: text("tags"), // JSON array
  skills: text("skills"), // JSON array of skills assessed
  competencies: text("competencies"), // JSON array of competencies
  timeToAnswer: integer("time_to_answer"), // in seconds
  
  // Status and tracking
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false),
  aiGenerated: boolean("ai_generated").default(false),
  
  // Analytics
  usageCount: integer("usage_count").default(0),
  averageScore: integer("average_score"),
  
  // Quality assurance
  validatedBy: uuid("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  revisionNumber: integer("revision_number").default(1),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Simplified Usage Tracking (replaces questionBankUsage)
export const questionUsage = pgTable("question_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  collectionId: uuid("collection_id").references(() => questionCollections.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  setupId: uuid("setup_id").references(() => interviewSetups.id, { onDelete: "cascade" }),
  interviewId: uuid("interview_id"), // references interviews
  candidateId: uuid("candidate_id"), // references candidates
  
  usageType: varchar("usage_type", { length: 50 }).notNull(), // interview, practice, assessment
  roundNumber: integer("round_number"),
  score: integer("score"), // actual score received
  
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// Skill Templates for job requirements
export const skillTemplates = pgTable("skill_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  jobCategory: varchar("job_category", { length: 100 }).notNull(), // software-engineering, marketing, sales, etc.
  skills: jsonb("skills").notNull(), // JSON array of skills with proficiency levels
  jobDuties: text("job_duties"), // Common job responsibilities
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  description: text("description"),
  experienceLevel: varchar("experience_level", { length: 100 }),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  aiGenerated: boolean("ai_generated").default(false),
  metadata: jsonb("metadata"), // Additional AI generation metadata
  usageCount: integer("usage_count").default(0),
});

// Interview Templates
export const interviewTemplates = pgTable("interview_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  description: text("description"),
  jobCategory: varchar("job_category", { length: 100 }).notNull(),
  interviewType: varchar("interview_type", { length: 100 }).notNull(), // behavioral, coding, mcq, combo
  difficultyLevel: varchar("difficulty_level", { length: 50 }).notNull(),
  timeLimit: integer("time_limit").notNull(), // in minutes
  questionIds: text("question_ids"), // JSON array of question IDs
  instructions: text("instructions"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false),
  aiGenerated: boolean("ai_generated").default(false),
  metadata: jsonb("metadata"), // Additional AI generation metadata
  usageCount: integer("usage_count").default(0),
  rounds: jsonb("rounds"), // JSON array of interview rounds
});

// Webhooks
export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  events: jsonb("events").notNull(), // Array of event types
  headers: jsonb("headers"), // Custom headers
  isActive: boolean("is_active").default(true),
  timeout: integer("timeout").default(30000), // milliseconds
  retryAttempts: integer("retry_attempts").default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Webhook Deliveries
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookId: uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  payload: text("payload").notNull(),
  success: boolean("success").notNull(),
  statusCode: integer("status_code"),
  response: text("response"),
  error: text("error"),
  duration: integer("duration"), // milliseconds
  attempt: integer("attempt").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Description Templates
export const jobDescriptionTemplates = pgTable("job_description_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  jobCategory: varchar("job_category", { length: 100 }).notNull(),
  templateContent: text("template_content").notNull(),
  placeholders: text("placeholders"), // JSON array of placeholder variables
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  aiGenerated: boolean("ai_generated").default(false),
  metadata: jsonb("metadata"), // Additional AI generation metadata
  usageCount: integer("usage_count").default(0),
});

// Admin Activity Logs
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 100 }).notNull(), // login, user_creation, subscription_change, etc.
  description: text("description").notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  planName: varchar("plan_name", { length: 100 }).notNull().unique(),
  description: text("description"),
  monthlyPrice: integer("monthly_price").notNull(),
  yearlyPrice: integer("yearly_price").notNull(),
  maxInterviews: integer("max_interviews").notNull(),
  maxUsers: integer("max_users").notNull(),
  features: jsonb("features"), // JSON array of features
  // Stripe integration fields
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripeMonthlyPriceId: varchar("stripe_monthly_price_id", { length: 255 }),
  stripeYearlyPriceId: varchar("stripe_yearly_price_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription Transactions
export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
  transactionAmount: integer("transaction_amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull(), // success, failed, pending, refunded
  transactionId: varchar("transaction_id", { length: 255 }),
  subscriptionPeriod: varchar("subscription_period", { length: 50 }).notNull(), // monthly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  // Stripe integration fields
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  paymentProcessor: varchar("payment_processor", { length: 100 }), // stripe,
  receiptUrl: varchar("receipt_url", { length: 500 }),
  metadata: jsonb("metadata"),
});

// Campaign Analytics for Dashboard
export const campaignAnalytics = pgTable("campaign_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  totalApplications: integer("total_applications").default(0).notNull(),
  firstRoundInterviews: integer("first_round_interviews").default(0).notNull(),
  firstRoundShortlisted: integer("first_round_shortlisted").default(0).notNull(),
  secondRoundInterviews: integer("second_round_interviews").default(0).notNull(),
  secondRoundShortlisted: integer("second_round_shortlisted").default(0).notNull(),
  thirdRoundInterviews: integer("third_round_interviews").default(0).notNull(),
  thirdRoundShortlisted: integer("third_round_shortlisted").default(0).notNull(),
  finalHires: integer("final_hires").default(0).notNull(),
  averageScore: numeric("average_score", { precision: 5, scale: 2 }).default("0").notNull(),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  timeToHire: integer("time_to_hire").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interview Round Results
export const interviewRoundResults = pgTable("interview_round_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignInterviewId: uuid("campaign_interview_id").notNull().references(() => campaignInterviews.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  roundName: varchar("round_name", { length: 100 }).notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  maxScore: numeric("max_score", { precision: 5, scale: 2 }).notNull(),
  passed: boolean("passed").default(false).notNull(),
  feedback: text("feedback"),
  interviewerNotes: text("interviewer_notes"),
  timeSpent: integer("time_spent"), // in minutes
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Application Status History
export const applicationStatusHistory = pgTable("application_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  reason: text("reason"),
  changedBy: uuid("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Company Branding removed as per requirements

// Azure Storage Configuration
export const azureStorageConfig = pgTable("azure_storage_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  storageAccountName: varchar("storage_account_name", { length: 255 }).notNull(),
  containerName: varchar("container_name", { length: 255 }).notNull(),
  connectionString: text("connection_string").notNull(), // Encrypted
  accessKey: text("access_key").notNull(), // Encrypted
  blobEndpoint: varchar("blob_endpoint", { length: 500 }),
  cdnEndpoint: varchar("cdn_endpoint", { length: 500 }),
  isActive: boolean("is_active").default(true),
  maxFileSize: integer("max_file_size").default(10485760), // 10MB in bytes
  allowedFileTypes: text("allowed_file_types").default("pdf,doc,docx,jpg,jpeg,png"), // Comma-separated
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});

// File Storage Tracking
export const fileStorage = pgTable("file_storage", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  storageProvider: varchar("storage_provider", { length: 50 }).default("azure"), // azure, aws, local
  entityType: varchar("entity_type", { length: 100 }).notNull(), // resume, logo, document, etc.
  entityId: uuid("entity_id"), // ID of the related entity
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  metadata: jsonb("metadata"),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 100 }).notNull(), // interview_invitation, rejection, offer, etc.
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: text("variables"), // JSON array of template variables
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Notifications
export const systemNotifications = pgTable("system_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // info, warning, error, success
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url", { length: 500 }),
  actionText: varchar("action_text", { length: 100 }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"),
});

// API Keys and Integrations
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  hashedToken: varchar("hashed_token", { length: 255 }).notNull(),
  keyName: varchar("key_name", { length: 255 }).notNull(),
  keyValue: text("key_value").notNull(), // Encrypted
  keyType: varchar("key_type", { length: 100 }).notNull(), // openai, azure, aws, etc.
  permissions: jsonb("permissions").notNull().default('[]'), // JSON array of permissions
  ipWhitelist: jsonb("ip_whitelist").default('[]'), // JSON array of allowed IPs
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  usageCount: integer("usage_count").default(0),
  rateLimit: integer("rate_limit"), // requests per hour
});

// API Tokens (separate from API Keys for different use cases)
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  hashedToken: varchar("hashed_token", { length: 255 }).notNull(),
  permissions: jsonb("permissions").notNull().default('[]'), // JSON array of permissions
  ipWhitelist: jsonb("ip_whitelist").default('[]'), // JSON array of allowed IPs
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: varchar("last_used_ip", { length: 45 }), // IPv4 or IPv6
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: uuid("revoked_by").references(() => users.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  usageCount: integer("usage_count").default(0),
  rateLimit: integer("rate_limit"), // requests per hour
});

// Platform Settings for Super Admin
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Database Settings
  databaseBackupFrequency: varchar("database_backup_frequency", { length: 20 }).default("daily"),
  databaseRetentionDays: integer("database_retention_days").default(30),
  databaseAutoBackup: boolean("database_auto_backup").default(true),
  databaseOptimization: boolean("database_optimization").default(true),
  
  // Performance Settings
  cacheDuration: integer("cache_duration").default(3600),
  maxUploadSize: integer("max_upload_size").default(10),
  logLevel: varchar("log_level", { length: 20 }).default("info"),
  cacheEnabled: boolean("cache_enabled").default(true),
  
  // Email Settings
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUsername: varchar("smtp_username", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }),
  smtpSecure: boolean("smtp_secure").default(true),
  emailFromAddress: varchar("email_from_address", { length: 255 }),
  emailFromName: varchar("email_from_name", { length: 255 }).default("Interview AI"),
  
  // Notification Settings
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  notificationRetentionDays: integer("notification_retention_days").default(90),
  
  // Security Settings
  sessionTimeout: integer("session_timeout").default(480),
  maxLoginAttempts: integer("max_login_attempts").default(5),
  passwordMinLength: integer("password_min_length").default(8),
  requireTwoFactor: boolean("require_two_factor").default(false),
  ipWhitelistEnabled: boolean("ip_whitelist_enabled").default(false),
  
  // Feature Flags
  maintenanceMode: boolean("maintenance_mode").default(false),
  registrationEnabled: boolean("registration_enabled").default(true),
  apiRateLimit: integer("api_rate_limit").default(1000),
  debugMode: boolean("debug_mode").default(false),
  
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Backup Logs
export const systemBackupLogs = pgTable("system_backup_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  backupType: varchar("backup_type", { length: 100 }).notNull(), // manual, automatic, scheduled
  status: varchar("status", { length: 50 }).notNull(), // pending, running, completed, failed
  backupSize: varchar("backup_size", { length: 50 }), // in bytes as string
  backupLocation: varchar("backup_location", { length: 500 }),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System Cache Management
export const systemCacheLogs = pgTable("system_cache_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  cacheType: varchar("cache_type", { length: 100 }).notNull(), // redis, memory, file
  action: varchar("action", { length: 50 }).notNull(), // clear, refresh, invalidate
  cacheKey: varchar("cache_key", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(), // success, failed
  executionTime: integer("execution_time"), // in milliseconds
  triggeredBy: uuid("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Company Branding
export const companyBranding = pgTable("company_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  primaryColor: varchar("primary_color", { length: 7 }).default("#3B82F6"), // Hex color code
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#1E40AF"),
  accentColor: varchar("accent_color", { length: 7 }).default("#F59E0B"),
  backgroundColor: varchar("background_color", { length: 7 }).default("#FFFFFF"),
  textColor: varchar("text_color", { length: 7 }).default("#1F2937"),
  logoUrl: varchar("logo_url", { length: 500 }),
  faviconUrl: varchar("favicon_url", { length: 500 }),
  brandName: varchar("brand_name", { length: 255 }),
  tagline: varchar("tagline", { length: 500 }),
  fontFamily: varchar("font_family", { length: 100 }).default("Inter"),
  customCss: text("custom_css"),
  themeMode: varchar("theme_mode", { length: 20 }).default("light"), // light, dark, auto
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SSO Configurations for OAuth and SAML
export const ssoConfigurations = pgTable("sso_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // google, microsoft, saml, etc.
  configuration: jsonb("configuration").notNull(), // Provider-specific config (client_id, client_secret, etc.)
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional provider-specific metadata
});

// LinkedIn Integrations for posting job campaigns
export const linkedinIntegrations = pgTable("linkedin_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  accessToken: varchar("access_token", { length: 1000 }).notNull(),
  refreshToken: varchar("refresh_token", { length: 1000 }),
  tokenType: varchar("token_type", { length: 50 }).default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: varchar("scope", { length: 500 }),
  organizationId: varchar("organization_id", { length: 255 }),
  profileId: varchar("profile_id", { length: 255 }),
  profileName: varchar("profile_name", { length: 255 }),
  profileEmail: varchar("profile_email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional LinkedIn-specific data
});

// ===== CANDIDATE ACCOUNT MANAGEMENT SYSTEM =====

// Dedicated Candidate Users (Separate from Company Users)
export const candidateUsers = pgTable("candidate_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified"),
  password: varchar("password", { length: 255 }), // Optional for social login
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  profileImage: varchar("profile_image", { length: 500 }),
  isActive: boolean("is_active").default(true),
  isEmailVerified: boolean("is_email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  timezone: varchar("timezone", { length: 100 }).default("UTC"),
  locale: varchar("locale", { length: 10 }).default("en"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  marketingOptIn: boolean("marketing_opt_in").default(false)
});

// Candidate Profiles (Resume, Skills, Experience)
export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }).unique(),
  headline: varchar("headline", { length: 255 }), // Professional headline
  summary: text("summary"), // Professional summary
  currentTitle: varchar("current_title", { length: 255 }),
  currentCompany: varchar("current_company", { length: 255 }),
  totalExperience: integer("total_experience"), // in months
  expectedSalary: integer("expected_salary"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  noticePeriod: integer("notice_period"), // in days
  location: varchar("location", { length: 255 }),
  isOpenToRemote: boolean("is_open_to_remote").default(true),
  isOpenToRelocation: boolean("is_open_to_relocation").default(false),
  skills: text("skills"), // JSON array of skills with proficiency
  education: text("education"), // JSON array of education details
  experience: text("experience"), // JSON array of work experience
  certifications: text("certifications"), // JSON array of certifications
  languages: text("languages"), // JSON array of languages with proficiency
  portfolioUrl: varchar("portfolio_url", { length: 500 }),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  githubUrl: varchar("github_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  resumeUrl: varchar("resume_url", { length: 500 }),
  profileCompleteness: integer("profile_completeness").default(0), // 0-100%
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Candidate Applications (Job Application Tracking)
export const candidateApplications = pgTable("candidate_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id").notNull().references(() => jobCampaigns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  applicationSource: varchar("application_source", { length: 100 }).default("direct"), // direct, linkedin, referral, etc.
  status: varchar("status", { length: 50 }).default("applied"), // applied, screening, interview, offer, hired, rejected
  currentStage: varchar("current_stage", { length: 100 }), // specific stage in process
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  coverLetter: text("cover_letter"),
  customAnswers: text("custom_answers"), // JSON for application form answers
  resumeVersion: varchar("resume_version", { length: 500 }), // specific resume used
  overallScore: integer("overall_score").default(0),
  recruiterNotes: text("recruiter_notes"),
  candidateNotes: text("candidate_notes"),
  rejectionReason: text("rejection_reason"),
  offerDetails: text("offer_details"), // JSON for offer information
  expectedSalary: integer("expected_salary"),
  negotiatedSalary: integer("negotiated_salary"),
  startDate: timestamp("start_date"),
  isWithdrawn: boolean("is_withdrawn").default(false),
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawnReason: text("withdrawn_reason"),
});

// Candidate Interview History
export const candidateInterviewHistory = pgTable("candidate_interview_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => candidateApplications.id, { onDelete: "cascade" }), // Optional for direct interviews
  interviewId: varchar("interview_id").notNull(), // Links to Interview/CodingInterview tables
  interviewType: varchar("interview_type", { length: 100 }).notNull(), // behavioral, coding, mcq, combo
  roundNumber: integer("round_number").notNull(),
  roundName: varchar("round_name", { length: 255 }),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, in_progress, completed, cancelled, no_show
  duration: integer("duration"), // actual duration in minutes
  score: integer("score"),
  maxScore: integer("max_score"),
  passed: boolean("passed"),
  feedback: text("feedback"), // Feedback visible to candidate
  programmingLanguage: varchar("programming_language", { length: 100 }), // For coding interviews
  internalNotes: text("internal_notes"), // Internal recruiter notes
  candidateExperience: text("candidate_experience"), // Candidate's feedback about interview
  candidateRating: integer("candidate_rating"), // 1-5 rating of interview experience
  interviewerName: varchar("interviewer_name", { length: 255 }),
  interviewerEmail: varchar("interviewer_email", { length: 255 }),
  recordingUrl: varchar("recording_url", { length: 500 }),
  interviewLink: varchar("interview_link", { length: 1000 }),
  preparationMaterials: text("preparation_materials"), // JSON of prep materials
  nextSteps: text("next_steps"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Candidate Notifications
export const candidateNotifications = pgTable("candidate_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => candidateApplications.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(), // application_update, interview_scheduled, feedback_available, etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  isEmailSent: boolean("is_email_sent").default(false),
  isSMSSent: boolean("is_sms_sent").default(false),
  actionUrl: varchar("action_url", { length: 500 }),
  actionText: varchar("action_text", { length: 100 }),
  expiresAt: timestamp("expires_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Candidate Sessions (Proper Session Management)
export const candidateSessions = pgTable("candidate_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  deviceInfo: text("device_info"), // JSON with device/browser info
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  location: varchar("location", { length: 255 }), // Geo location
  isActive: boolean("is_active").default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  loggedOutAt: timestamp("logged_out_at"),
});

// Candidate Documents (Resume Versions, Certificates, Portfolio)
export const candidateDocuments = pgTable("candidate_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // resume, cover_letter, certificate, portfolio, etc.
  documentName: varchar("document_name", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  fileType: varchar("file_type", { length: 100 }).notNull(), // pdf, doc, jpg, etc.
  version: integer("version").default(1),
  isDefault: boolean("is_default").default(false), // default resume/cover letter
  isPublic: boolean("is_public").default(true),
  description: text("description"),
  tags: text("tags"), // JSON array of tags
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // for temporary documents
  downloadCount: integer("download_count").default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  metadata: jsonb("metadata"), // parsed resume data, etc.
});

// Candidate Preferences (Interview, Availability, Communication)
export const candidatePreferences = pgTable("candidate_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").notNull().references(() => candidateUsers.id, { onDelete: "cascade" }).unique(),
  // Interview Preferences
  preferredInterviewTimes: text("preferred_interview_times"), // JSON with time slots
  timeZone: varchar("time_zone", { length: 100 }).default("UTC"),
  interviewModePreference: varchar("interview_mode_preference", { length: 50 }).default("any"), // video, phone, in_person, any
  maxInterviewDuration: integer("max_interview_duration").default(60), // minutes
  // Communication Preferences
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  marketingEmails: boolean("marketing_emails").default(false),
  weeklyDigest: boolean("weekly_digest").default(true),
  // Job Preferences
  jobAlerts: boolean("job_alerts").default(true),
  preferredJobTypes: text("preferred_job_types"), // JSON array: full_time, part_time, contract, etc.
  preferredWorkModes: text("preferred_work_modes"), // JSON array: remote, hybrid, onsite
  preferredLocations: text("preferred_locations"), // JSON array of preferred locations
  salaryExpectations: text("salary_expectations"), // JSON with min/max by currency
  // Privacy Preferences
  profileVisibility: varchar("profile_visibility", { length: 20 }).default("public"), // public, private, recruiters_only
  allowRecruiterContact: boolean("allow_recruiter_contact").default(true),
  showSalaryExpectations: boolean("show_salary_expectations").default(true),
  // Availability
  availabilityStatus: varchar("availability_status", { length: 50 }).default("open"), // open, passive, not_looking
  availableStartDate: timestamp("available_start_date"),
  noticePeriod: integer("notice_period"), // in days
  // Technical Preferences
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  accessibilityNeeds: text("accessibility_needs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
