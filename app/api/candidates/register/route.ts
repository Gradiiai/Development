import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { candidateUsers, candidateProfiles, candidatePreferences } from "@/lib/database/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { azureStorageService } from "@/lib/integrations/storage/azure";



// Helper function to validate candidate email domains
function isAllowedCandidateEmail(email: string): boolean {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  // Allow Gmail and Outlook
  const allowedConsumerDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com'];
  
  // Check for educational domains (.edu, .ac.*, .edu.*)
  const isEducationalDomain = emailDomain.endsWith('.edu') || 
                             emailDomain.includes('.edu.') || 
                             emailDomain.includes('.ac.');
  
  return allowedConsumerDomains.includes(emailDomain) || isEducationalDomain;
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  marketingOptIn: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Validate candidate email domain
    if (!isAllowedCandidateEmail(validatedData.email)) {
      return NextResponse.json(
        { error: "Please use a Gmail, Outlook, or educational email address for candidate registration." },
        { status: 400 }
      );
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = validatedData.email.toLowerCase();

    // Check if candidate already exists
    const existingCandidate = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, normalizedEmail))
      .limit(1);

    if (existingCandidate.length > 0) {
      return NextResponse.json(
        { error: "Candidate with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create candidate user
    const newCandidate = await db
      .insert(candidateUsers)
      .values({
        email: normalizedEmail,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        marketingOptIn: validatedData.marketingOptIn,
        isEmailVerified: false,
        onboardingCompleted: false,
      })
      .returning();

    const candidateId = newCandidate[0].id;

    // Create candidate profile
    await db.insert(candidateProfiles).values({
      candidateId,
      profileCompleteness: 10, // Basic info completed
    });

    // Create candidate preferences with defaults
    await db.insert(candidatePreferences).values({
      candidateId,
      emailNotifications: true,
      pushNotifications: true,
      jobAlerts: true,
      profileVisibility: "public",
      allowRecruiterContact: true,
      availabilityStatus: "open",
    });

    // Create Azure Blob Storage folder structure for the candidate
    try {
      await azureStorageService.createCandidateFolder(candidateId);
      console.log(`Azure folder structure created for candidate: ${candidateId}`);
    } catch (azureError) {
      console.error(`Failed to create Azure folder for candidate ${candidateId}:`, azureError);
      // Don't fail registration if Azure folder creation fails
    }

    // Return success (without sensitive data)
    return NextResponse.json(
      {
        message: "Candidate registered successfully",
        candidate: {
          id: candidateId,
          email: normalizedEmail,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          isEmailVerified: false,
          onboardingCompleted: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}