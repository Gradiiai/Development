import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateProfiles } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch candidate profile data with extended profile information
    const candidateProfile = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.candidateId, candidateUser[0].id))
      .limit(1);

    const transformedProfile = {
      // Basic user information
      id: candidateUser[0].id,
      firstName: candidateUser[0].firstName,
      lastName: candidateUser[0].lastName,
      email: candidateUser[0].email,
      phone: candidateUser[0].phone,
      profileImage: candidateUser[0].profileImage,
      timezone: candidateUser[0].timezone,
      locale: candidateUser[0].locale,
      onboardingCompleted: candidateUser[0].onboardingCompleted,
      marketingOptIn: candidateUser[0].marketingOptIn,
      isActive: candidateUser[0].isActive,
      isEmailVerified: candidateUser[0].isEmailVerified,
      lastLoginAt: candidateUser[0].lastLoginAt,
      createdAt: candidateUser[0].createdAt,
      updatedAt: candidateUser[0].updatedAt,
      // Extended profile information
      headline: candidateProfile[0]?.headline,
      summary: candidateProfile[0]?.summary,
      currentTitle: candidateProfile[0]?.currentTitle,
      currentCompany: candidateProfile[0]?.currentCompany,
      totalExperience: candidateProfile[0]?.totalExperience,
      expectedSalary: candidateProfile[0]?.expectedSalary,
      currency: candidateProfile[0]?.currency,
      noticePeriod: candidateProfile[0]?.noticePeriod,
      location: candidateProfile[0]?.location,
      isOpenToRemote: candidateProfile[0]?.isOpenToRemote,
      isOpenToRelocation: candidateProfile[0]?.isOpenToRelocation,
      skills: candidateProfile[0]?.skills ? 
        (() => {
          try {
            const parsed = JSON.parse(candidateProfile[0].skills);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      education: candidateProfile[0]?.education ? 
        (() => {
          try {
            const parsed = JSON.parse(candidateProfile[0].education);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      experience: candidateProfile[0]?.experience ? 
        (() => {
          try {
            const parsed = JSON.parse(candidateProfile[0].experience);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      certifications: candidateProfile[0]?.certifications ? 
        (() => {
          try {
            const parsed = JSON.parse(candidateProfile[0].certifications);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      languages: candidateProfile[0]?.languages ? 
        (() => {
          try {
            const parsed = JSON.parse(candidateProfile[0].languages);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      portfolioUrl: candidateProfile[0]?.portfolioUrl,
      linkedinUrl: candidateProfile[0]?.linkedinUrl,
      githubUrl: candidateProfile[0]?.githubUrl,
      websiteUrl: candidateProfile[0]?.websiteUrl,
      resumeUrl: candidateProfile[0]?.resumeUrl,
      profileCompleteness: candidateProfile[0]?.profileCompleteness || 0,
      isPublic: candidateProfile[0]?.isPublic ?? true,
    };

    return NextResponse.json(transformedProfile);
  } catch (error) {
    console.error('Error fetching candidate profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      profileImage,
      timezone,
      locale,
      headline,
      summary,
      currentTitle,
      currentCompany,
      totalExperience,
      expectedSalary,
      currency,
      noticePeriod,
      location,
      isOpenToRemote,
      isOpenToRelocation,
      skills,
      education,
      experience,
      certifications,
      languages,
      portfolioUrl,
      linkedinUrl,
      githubUrl,
      websiteUrl,
      resumeUrl,
      isPublic,
    } = body;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update basic user information
    const [updatedUser] = await db
      .update(candidateUsers)
      .set({
        firstName: firstName || existingUser[0].firstName,
        lastName: lastName || existingUser[0].lastName,
        phone: phone || existingUser[0].phone,
        profileImage: profileImage || existingUser[0].profileImage,
        timezone: timezone || existingUser[0].timezone,
        locale: locale || existingUser[0].locale,
        updatedAt: new Date(),
      })
      .where(eq(candidateUsers.email, session.user.email))
      .returning();

    // Check if profile exists
    const existingProfile = await db
      .select()
      .from(candidateProfiles)
      .where(eq(candidateProfiles.candidateId, updatedUser.id))
      .limit(1);

    let updatedProfile;
    if (existingProfile.length) {
      // Update existing profile
      [updatedProfile] = await db
        .update(candidateProfiles)
        .set({
          headline: headline || existingProfile[0].headline,
          summary: summary || existingProfile[0].summary,
          currentTitle: currentTitle || existingProfile[0].currentTitle,
          currentCompany: currentCompany || existingProfile[0].currentCompany,
          totalExperience: totalExperience || existingProfile[0].totalExperience,
          expectedSalary: expectedSalary || existingProfile[0].expectedSalary,
          currency: currency || existingProfile[0].currency,
          noticePeriod: noticePeriod || existingProfile[0].noticePeriod,
          location: location || existingProfile[0].location,
          isOpenToRemote: isOpenToRemote ?? existingProfile[0].isOpenToRemote,
          isOpenToRelocation: isOpenToRelocation ?? existingProfile[0].isOpenToRelocation,
          skills: skills ? JSON.stringify(skills) : existingProfile[0].skills,
          education: education ? JSON.stringify(education) : existingProfile[0].education,
          experience: experience ? JSON.stringify(experience) : existingProfile[0].experience,
          certifications: certifications ? JSON.stringify(certifications) : existingProfile[0].certifications,
          languages: languages ? JSON.stringify(languages) : existingProfile[0].languages,
          portfolioUrl: portfolioUrl || existingProfile[0].portfolioUrl,
          linkedinUrl: linkedinUrl || existingProfile[0].linkedinUrl,
          githubUrl: githubUrl || existingProfile[0].githubUrl,
          websiteUrl: websiteUrl || existingProfile[0].websiteUrl,
          resumeUrl: resumeUrl || existingProfile[0].resumeUrl,
          isPublic: isPublic ?? existingProfile[0].isPublic,
          updatedAt: new Date(),
        })
        .where(eq(candidateProfiles.candidateId, updatedUser.id))
        .returning();
    } else {
      // Create new profile
      [updatedProfile] = await db
        .insert(candidateProfiles)
        .values({
          candidateId: updatedUser.id,
          headline,
          summary,
          currentTitle,
          currentCompany,
          totalExperience,
          expectedSalary,
          currency,
          noticePeriod,
          location,
          isOpenToRemote: isOpenToRemote ?? true,
          isOpenToRelocation: isOpenToRelocation ?? false,
          skills: skills ? JSON.stringify(skills) : null,
          education: education ? JSON.stringify(education) : null,
          experience: experience ? JSON.stringify(experience) : null,
          certifications: certifications ? JSON.stringify(certifications) : null,
          languages: languages ? JSON.stringify(languages) : null,
          portfolioUrl,
          linkedinUrl,
          githubUrl,
          websiteUrl,
          resumeUrl,
          isPublic: isPublic ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    // Transform the response
    const transformedProfile = {
      // Basic user information
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      timezone: updatedUser.timezone,
      locale: updatedUser.locale,
      onboardingCompleted: updatedUser.onboardingCompleted,
      marketingOptIn: updatedUser.marketingOptIn,
      isActive: updatedUser.isActive,
      isEmailVerified: updatedUser.isEmailVerified,
      lastLoginAt: updatedUser.lastLoginAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      // Extended profile information
      headline: updatedProfile?.headline,
      summary: updatedProfile?.summary,
      currentTitle: updatedProfile?.currentTitle,
      currentCompany: updatedProfile?.currentCompany,
      totalExperience: updatedProfile?.totalExperience,
      expectedSalary: updatedProfile?.expectedSalary,
      currency: updatedProfile?.currency,
      noticePeriod: updatedProfile?.noticePeriod,
      location: updatedProfile?.location,
      isOpenToRemote: updatedProfile?.isOpenToRemote,
      isOpenToRelocation: updatedProfile?.isOpenToRelocation,
      skills: updatedProfile?.skills ? 
        (() => {
          try {
            const parsed = JSON.parse(updatedProfile.skills);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      education: updatedProfile?.education ? 
        (() => {
          try {
            const parsed = JSON.parse(updatedProfile.education);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      experience: updatedProfile?.experience ? 
        (() => {
          try {
            const parsed = JSON.parse(updatedProfile.experience);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      certifications: updatedProfile?.certifications ? 
        (() => {
          try {
            const parsed = JSON.parse(updatedProfile.certifications);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      languages: updatedProfile?.languages ? 
        (() => {
          try {
            const parsed = JSON.parse(updatedProfile.languages);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })() : [],
      portfolioUrl: updatedProfile?.portfolioUrl,
      linkedinUrl: updatedProfile?.linkedinUrl,
      githubUrl: updatedProfile?.githubUrl,
      websiteUrl: updatedProfile?.websiteUrl,
      resumeUrl: updatedProfile?.resumeUrl,
      profileCompleteness: updatedProfile?.profileCompleteness || 0,
      isPublic: updatedProfile?.isPublic ?? true,
    };

    return NextResponse.json(transformedProfile);
  } catch (error) {
    console.error('Error updating candidate profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}