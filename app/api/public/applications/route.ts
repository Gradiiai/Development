import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateProfiles, candidateApplications, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      firstName,
      lastName,
      email,
      phone,
      location,
      experience,
      currentCompany,
      currentRole,
      expectedSalary,
      coverLetter,
      linkedinUrl,
      portfolioUrl,
      resumeUrl,
      applicationSource = 'applied_through_linkedin'
    } = body;

    // Validate required fields
    if (!campaignId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, firstName, lastName, email, phone' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if campaign exists and is active
    const campaign = await db
      .select({
        id: jobCampaigns.id,
        companyId: jobCampaigns.companyId,
        status: jobCampaigns.status,
        applicationDeadline: jobCampaigns.applicationDeadline,
      })
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { error: 'Job campaign not found' },
        { status: 404 }
      );
    }

    const jobCampaign = campaign[0];

    if (jobCampaign.status !== 'active') {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 410 }
      );
    }

    // Check application deadline
    if (jobCampaign.applicationDeadline) {
      const deadline = new Date(jobCampaign.applicationDeadline);
      const now = new Date();
      if (now > deadline) {
        return NextResponse.json(
          { error: 'Application deadline has passed' },
          { status: 410 }
        );
      }
    }

    // Check if candidate already applied to this campaign
    const existingApplication = await db
      .select({ id: candidateApplications.id })
      .from(candidateApplications)
      .innerJoin(candidateUsers, eq(candidateApplications.candidateId, candidateUsers.id))
      .where(
        and(
          eq(candidateApplications.campaignId, campaignId),
          eq(candidateUsers.email, email)
        )
      )
      .limit(1);

    if (existingApplication.length > 0) {
      return NextResponse.json(
        { error: 'You have already applied to this position' },
        { status: 409 }
      );
    }

    // Check if candidate user exists, if not create one
    let candidateUser = await db
      .select({ id: candidateUsers.id })
      .from(candidateUsers)
      .where(eq(candidateUsers.email, email))
      .limit(1);

    let candidateId: string;

    if (candidateUser.length === 0) {
      // Create new candidate user
      const [newUser] = await db.insert(candidateUsers).values({
        firstName,
        lastName,
        email,
        phone,
        isActive: true,
      }).returning({ id: candidateUsers.id });
      
      candidateId = newUser.id;

      // Create candidate profile with additional information
      await db.insert(candidateProfiles).values({
        candidateId,
        currentCompany,
        currentTitle: currentRole,
        location,
        totalExperience: experience ? parseInt(experience) : undefined,
        expectedSalary,
        linkedinUrl,
        portfolioUrl,
        resumeUrl,
      });
    } else {
      candidateId = candidateUser[0].id;
      
      // Update existing candidate with new information
      await db
        .update(candidateUsers)
        .set({
          firstName,
          lastName,
          phone,
        })
        .where(eq(candidateUsers.id, candidateId));

      // Update or create candidate profile
      const existingProfile = await db
        .select({ id: candidateProfiles.id })
        .from(candidateProfiles)
        .where(eq(candidateProfiles.candidateId, candidateId))
        .limit(1);

      if (existingProfile.length === 0) {
        // Create new profile
        await db.insert(candidateProfiles).values({
          candidateId,
          currentCompany,
          currentTitle: currentRole,
          location,
          totalExperience: experience ? parseInt(experience) : undefined,
          expectedSalary,
          linkedinUrl,
          portfolioUrl,
          resumeUrl,
        });
      } else {
        // Update existing profile
        await db
          .update(candidateProfiles)
          .set({
            currentCompany: currentCompany || undefined,
            currentTitle: currentRole || undefined,
            location: location || undefined,
            totalExperience: experience ? parseInt(experience) : undefined,
            expectedSalary: expectedSalary || undefined,
            linkedinUrl: linkedinUrl || undefined,
            portfolioUrl: portfolioUrl || undefined,
            resumeUrl: resumeUrl || undefined,
          })
          .where(eq(candidateProfiles.candidateId, candidateId));
      }
    }

    // Create application record
    await db.insert(candidateApplications).values({
      candidateId,
      campaignId,
      companyId: jobCampaign.companyId,
      applicationSource,
      status: 'applied',
      coverLetter,
      expectedSalary,
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
    });

  } catch (error) {
    console.error('Error submitting public application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}