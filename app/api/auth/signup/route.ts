import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/database/connection";
import { users, companies, subscriptionPlans } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyOTP } from "@/lib/services/email/otp";



// Helper function to validate company email domain
function validateCompanyEmail(email: string, companyDomain?: string): boolean {
  if (!companyDomain) return true; // If no domain specified, allow any business email
  
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const normalizedCompanyDomain = companyDomain.toLowerCase().replace(/^www\./i, '');
  
  return emailDomain === normalizedCompanyDomain;
}

// Helper function to check if email is from a business domain (not consumer domains)
function isBusinessEmail(email: string): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const consumerDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
  
  return !consumerDomains.includes(emailDomain);
}

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyDomain: z.string().optional(),
  phoneNumber: z.string().optional(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, companyDomain, phoneNumber, otp } = signUpSchema.parse(body);

    // Validate company email domain
    if (!isBusinessEmail(email)) {
      return NextResponse.json(
        { error: "Please use a business email address. Consumer email providers (Gmail, Yahoo, etc.) are not allowed for company registration." },
        { status: 400 }
      );
    }

    if (companyDomain && !validateCompanyEmail(email, companyDomain)) {
      return NextResponse.json(
        { error: `Email domain must match the company domain: ${companyDomain}` },
        { status: 400 }
      );
    }

    // Verify OTP first
    const otpVerification = await verifyOTP(email.toLowerCase(), otp, 'signup');
    if (!otpVerification.success) {
      return NextResponse.json(
        { error: otpVerification.error || 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if company domain already exists (if provided)
    if (companyDomain) {
      const existingCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.domain, companyDomain))
        .limit(1);

      if (existingCompany.length > 0) {
        return NextResponse.json(
          { error: "Company with this domain already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get free plan configuration
    const freePlan = await db
      .select({
        maxInterviews: subscriptionPlans.maxInterviews,
        maxUsers: subscriptionPlans.maxUsers,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planName, "free"))
      .limit(1);

    // Use default values if free plan not found in database
    const planConfig = freePlan[0] || { maxInterviews: 10, maxUsers: 5 };

    // Create company first
    const newCompany = await db
      .insert(companies)
      .values({
        name: companyName,
        domain: companyDomain,
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        maxInterviews: planConfig.maxInterviews,
        maxUsers: planConfig.maxUsers,
      })
      .returning({ id: companies.id });

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "company",
        companyId: newCompany[0].id,
        phoneNumber: phoneNumber || null,
        otpLoginEnabled: true, // Default to true for new users
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        companyId: users.companyId,
      });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: newUser[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign up error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}