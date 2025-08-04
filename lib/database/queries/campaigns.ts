import { eq, desc, and, or, like, count, gte, lte, SQL, ne, isNull, sql } from 'drizzle-orm';
import { db, executeWithRetry } from '../connection';
import { 
  jobCampaigns, 
  candidates, 
  candidateApplications,
  candidateUsers,
  companies,
  scoringParameters, 
  candidateScores, 
  interviewSetups, 
  campaignInterviews,
  questions,
  skillTemplates,
  jobDescriptionTemplates
} from '../schema';

// Job Campaign Operations
export async function createJobCampaign(data: {
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  experienceLevel: string;
  employeeType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
  currency?: string;
  numberOfOpenings: number;
  jobDescription: string;
  jobDuties?: string;
  jobRequirements?: string;
  jobBenefits?: string;
  requiredSkills?: string;
  competencies?: string;
  minExperience?: number;
  maxExperience?: number;
  jobDescriptionTemplateId?: string;
  skillTemplateId?: string;
  campaignType?: string;
  applicationDeadline?: Date;
  targetHireDate?: Date;
  isRemote?: boolean;
  isHybrid?: boolean;

  createdBy: string;
  companyId: string;
  status?: string;
}) {
  try {
    const [campaign] = await db.insert(jobCampaigns).values({
      ...data,
      status: data.status || 'draft'
    }).returning();
    
    return campaign;
  } catch (error) {
    console.error('Error creating job campaign:', error);
    throw error;
  }
}

// Get all candidates for a company from both old and new systems
export async function getAllCandidatesByCompany(companyId: string, filters?: {
  status?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  campaignId?: string;
}) {
  try {
    // Get candidates from old system (candidates table)
    const oldSystemConditions: (SQL | undefined)[] = [eq(jobCampaigns.companyId, companyId)];
    
    if (filters) {
      if (filters.status) {
        oldSystemConditions.push(eq(candidates.status, filters.status));
      }
      
      if (filters.source) {
        oldSystemConditions.push(eq(candidates.source, filters.source));
      }
      
      if (filters.campaignId) {
        oldSystemConditions.push(eq(candidates.campaignId, filters.campaignId));
      }
      
      if (filters.minScore !== undefined) {
        oldSystemConditions.push(gte(candidates.overallScore, filters.minScore));
      }
      
      if (filters.maxScore !== undefined) {
        oldSystemConditions.push(lte(candidates.overallScore, filters.maxScore));
      }
      
      if (filters.search) {
        const searchConditions = [
          like(candidates.name, `%${filters.search}%`),
          like(candidates.email, `%${filters.search}%`),
          like(candidates.currentCompany, `%${filters.search}%`),
          like(jobCampaigns.campaignName, `%${filters.search}%`),
          like(jobCampaigns.jobTitle, `%${filters.search}%`)
        ].filter((c): c is SQL => Boolean(c));

        if (searchConditions.length > 0) {
          oldSystemConditions.push(or(...searchConditions));
        }
      }
    }
    
    const oldSystemFinalConditions = oldSystemConditions.filter((c): c is SQL => Boolean(c));
      
    const oldSystemCandidates = await db.select({
      // Candidate fields
      id: candidates.id,
      campaignId: candidates.campaignId,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      resumeUrl: candidates.resumeUrl,
      linkedinUrl: candidates.linkedinUrl,
      portfolioUrl: candidates.portfolioUrl,
      experience: candidates.experience,
      currentCompany: candidates.currentCompany,
      currentRole: candidates.currentRole,
      skills: candidates.skills,
      source: candidates.source,
      status: candidates.status,
      overallScore: candidates.overallScore,
      talentFitScore: candidates.talentFitScore,
      aiParsedData: candidates.aiParsedData,
      notes: candidates.notes,
      appliedAt: candidates.appliedAt,
      updatedAt: candidates.updatedAt,
      lastContactedAt: candidates.lastContactedAt,
      expectedSalary: candidates.expectedSalary,
      noticePeriod: candidates.noticePeriod,
      location: candidates.location,
      educationLevel: candidates.educationLevel,
      educationInstitution: candidates.educationInstitution,
      // Campaign fields
      campaignName: jobCampaigns.campaignName,
      jobTitle: jobCampaigns.jobTitle,
      department: jobCampaigns.department,
      // System identifier
      applicationSource: candidates.source
    })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...oldSystemFinalConditions));

    // Get candidates from new system (candidateApplications table)
    const newSystemConditions: (SQL | undefined)[] = [eq(candidateApplications.companyId, companyId)];
    
    if (filters) {
      if (filters.status) {
        newSystemConditions.push(eq(candidateApplications.status, filters.status));
      }
      
      if (filters.source) {
        newSystemConditions.push(eq(candidateApplications.applicationSource, filters.source));
      }
      
      if (filters.campaignId) {
        newSystemConditions.push(eq(candidateApplications.campaignId, filters.campaignId));
      }
      
      if (filters.minScore !== undefined) {
        newSystemConditions.push(gte(candidateApplications.overallScore, filters.minScore));
      }
      
      if (filters.maxScore !== undefined) {
        newSystemConditions.push(lte(candidateApplications.overallScore, filters.maxScore));
      }
      
      if (filters.search) {
        const searchConditions = [
          like(candidateUsers.firstName, `%${filters.search}%`),
          like(candidateUsers.lastName, `%${filters.search}%`),
          like(candidateUsers.email, `%${filters.search}%`),
          like(jobCampaigns.campaignName, `%${filters.search}%`),
          like(jobCampaigns.jobTitle, `%${filters.search}%`)
        ].filter((c): c is SQL => Boolean(c));

        if (searchConditions.length > 0) {
          newSystemConditions.push(or(...searchConditions));
        }
      }
    }
    
    const newSystemFinalConditions = newSystemConditions.filter((c): c is SQL => Boolean(c));
      
    const newSystemCandidates = await db.select({
      // Candidate fields (mapped from candidateApplications and candidateUsers)
      id: candidateApplications.id,
      campaignId: candidateApplications.campaignId,
      firstName: candidateUsers.firstName,
      lastName: candidateUsers.lastName,
      name: candidateUsers.firstName, // Will be transformed later
      email: candidateUsers.email,
      phone: candidateUsers.phone,
      resumeUrl: candidateApplications.id, // placeholder, will be set to null
      linkedinUrl: candidateApplications.id, // placeholder, will be set to null
      portfolioUrl: candidateApplications.id, // placeholder, will be set to null
      experience: candidateApplications.id, // placeholder, will be set to null
      currentCompany: candidateApplications.id, // placeholder, will be set to null
      currentRole: candidateApplications.id, // placeholder, will be set to null
      skills: candidateApplications.id, // placeholder, will be set to null
      source: candidateApplications.applicationSource,
      status: candidateApplications.status,
      overallScore: candidateApplications.overallScore,
      talentFitScore: candidateApplications.id, // placeholder, will be set to null
      aiParsedData: candidateApplications.id, // placeholder, will be set to null
      notes: candidateApplications.candidateNotes,
      appliedAt: candidateApplications.appliedAt,
      updatedAt: candidateApplications.lastUpdatedAt,
      lastContactedAt: candidateApplications.id, // placeholder, will be set to null
      expectedSalary: candidateApplications.expectedSalary,
      noticePeriod: candidateApplications.id, // placeholder, will be set to null
      location: candidateApplications.id, // placeholder, will be set to null
      educationLevel: candidateApplications.id, // placeholder, will be set to null
      educationInstitution: candidateApplications.id, // placeholder, will be set to null
      // Campaign fields
      campaignName: jobCampaigns.campaignName,
      jobTitle: jobCampaigns.jobTitle,
      department: jobCampaigns.department,
      // System identifier
      applicationSource: candidateApplications.applicationSource
    })
      .from(candidateApplications)
      .innerJoin(candidateUsers, eq(candidateApplications.candidateId, candidateUsers.id))
      .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .where(and(...newSystemFinalConditions));

    // Combine and sort all candidates
    const allCandidates = [...oldSystemCandidates, ...newSystemCandidates];

    // Transform candidates to normalize data structure
    const transformedCandidates = allCandidates.map(candidate => {
      // Check if this is from the new system (has firstName/lastName fields)
      const isNewSystem = 'firstName' in candidate;
      
      return {
        ...candidate,
        // Set system type identifier
        systemType: isNewSystem ? 'new' as const : 'old' as const,
        // Concatenate first and last name for new system candidates
        name: isNewSystem 
          ? `${(candidate as any).firstName} ${(candidate as any).lastName || ''}`.trim()
          : candidate.name,
        // Set null values for new system placeholders
        resumeUrl: isNewSystem ? null : candidate.resumeUrl,
        linkedinUrl: isNewSystem ? null : candidate.linkedinUrl,
        portfolioUrl: isNewSystem ? null : candidate.portfolioUrl,
        experience: isNewSystem ? null : candidate.experience,
        currentCompany: isNewSystem ? null : candidate.currentCompany,
        currentRole: isNewSystem ? null : candidate.currentRole,
        skills: isNewSystem ? null : candidate.skills,
        talentFitScore: isNewSystem ? null : candidate.talentFitScore,
        aiParsedData: isNewSystem ? null : candidate.aiParsedData,
        lastContactedAt: isNewSystem ? null : candidate.lastContactedAt,
        noticePeriod: isNewSystem ? null : candidate.noticePeriod,
        location: isNewSystem ? null : candidate.location,
        educationLevel: isNewSystem ? null : candidate.educationLevel,
        educationInstitution: isNewSystem ? null : candidate.educationInstitution,
        // Update source display for new system
        source: isNewSystem 
          ? `${candidate.applicationSource || 'direct'} (Gradii Portal)`
          : candidate.source
      };
    })
     .sort((a, b) => {
       const dateA = new Date(a.appliedAt);
       const dateB = new Date(b.appliedAt);
       return dateB.getTime() - dateA.getTime();
     });
      
    return { success: true, data: transformedCandidates };
  } catch (error) {
    console.error('Error fetching all candidates by company:', error);
    return { success: false, error: 'Failed to fetch candidates' };
  }
}

export async function getJobCampaigns(params: {
  companyId: string;
  limit?: number;
  offset?: number;
  search?: string;
  department?: string;
  location?: string;
  employeeType?: string;
  experienceLevel?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  isRemote?: boolean;
}) {
  try {
    const {
      companyId,
      limit = 10,
      offset = 0,
      search,
      department,
      location,
      employeeType,
      experienceLevel,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isRemote
    } = params;

    // Build where conditions
    const conditions: (SQL | undefined)[] = [
      eq(jobCampaigns.companyId, companyId),
      // Exclude direct interview campaigns
      ne(jobCampaigns.campaignName, 'Direct Interview')
    ];

    if (search) {
      conditions.push(
        or(
          like(jobCampaigns.campaignName, `%${search}%`),
          like(jobCampaigns.jobTitle, `%${search}%`),
          like(jobCampaigns.jobDescription, `%${search}%`),
          like(jobCampaigns.department, `%${search}%`)
        )
      );
    }

    if (department) {
      conditions.push(eq(jobCampaigns.department, department));
    }

    if (location) {
      conditions.push(like(jobCampaigns.location, `%${location}%`));
    }

    if (employeeType) {
      conditions.push(eq(jobCampaigns.employeeType, employeeType as any));
    }

    if (experienceLevel) {
      conditions.push(eq(jobCampaigns.experienceLevel, experienceLevel as any));
    }

    if (isRemote !== undefined) {
      conditions.push(eq(jobCampaigns.isRemote, isRemote));
    }

    if (status) {
      conditions.push(eq(jobCampaigns.status, status as any));
    }

    // Determine sort column
    let sortColumn;
    if (sortBy === 'createdAt') {
      sortColumn = sortOrder === 'asc' ? jobCampaigns.createdAt : desc(jobCampaigns.createdAt);
    } else if (sortBy === 'jobTitle') {
      sortColumn = sortOrder === 'asc' ? jobCampaigns.jobTitle : desc(jobCampaigns.jobTitle);
    } else if (sortBy === 'department') {
      sortColumn = sortOrder === 'asc' ? jobCampaigns.department : desc(jobCampaigns.department);
    } else {
      sortColumn = desc(jobCampaigns.createdAt); // default
    }

    // Filter out undefined conditions
    const finalConditions = conditions.filter((c): c is SQL => Boolean(c));

    // Get total count
    const totalResult = await executeWithRetry(async () => {
      return await db
        .select({ count: count() })
        .from(jobCampaigns)
        .where(and(...finalConditions));
    });

    const total = totalResult[0]?.count || 0;

    // Get campaigns with candidate counts from both old and new systems
    const campaignsWithCounts = await executeWithRetry(async () => {
      // Get counts from old system (candidates table)
      const oldSystemCounts = await db
        .select({
          id: jobCampaigns.id,
          oldCandidatesCount: count(candidates.id)
        })
        .from(jobCampaigns)
        .leftJoin(candidates, eq(jobCampaigns.id, candidates.campaignId))
        .where(and(...finalConditions))
        .groupBy(jobCampaigns.id);

      // Get counts from new system (candidateApplications table)
      const newSystemCounts = await db
        .select({
          id: jobCampaigns.id,
          newCandidatesCount: count(candidateApplications.id)
        })
        .from(jobCampaigns)
        .leftJoin(candidateApplications, eq(jobCampaigns.id, candidateApplications.campaignId))
        .where(and(...finalConditions))
        .groupBy(jobCampaigns.id);

      // Combine counts from both systems
      const oldCountsMap = new Map(oldSystemCounts.map(c => [c.id, c.oldCandidatesCount]));
      const newCountsMap = new Map(newSystemCounts.map(c => [c.id, c.newCandidatesCount]));

      // Get all unique campaign IDs
      const allCampaignIds = new Set([
        ...oldSystemCounts.map(c => c.id),
        ...newSystemCounts.map(c => c.id)
      ]);

      // Combine counts for each campaign
      const combinedCounts = Array.from(allCampaignIds).map(id => ({
        id,
        candidatesCount: (oldCountsMap.get(id) || 0) + (newCountsMap.get(id) || 0)
      }));

      // Apply sorting and pagination
      const sortedCounts = combinedCounts.sort((a, b) => {
        // We need to get the actual campaign data for sorting
        // For now, we'll sort by candidatesCount if needed, otherwise maintain order
        if (sortBy === 'candidatesCount') {
          return sortOrder === 'asc' ? a.candidatesCount - b.candidatesCount : b.candidatesCount - a.candidatesCount;
        }
        return 0; // Will be sorted later when we get full campaign data
      });

      return sortedCounts.slice(offset, offset + limit);
    });

    // Get full campaign details for the filtered campaigns
    const campaignIds = campaignsWithCounts.map(c => c.id);
    const campaigns = await executeWithRetry(async () => {
      return await db
        .select()
        .from(jobCampaigns)
        .where(and(
          eq(jobCampaigns.companyId, companyId),
          campaignIds.length > 0 ? or(...campaignIds.map(id => eq(jobCampaigns.id, id))) : undefined
        ))
        .orderBy(sortColumn);
    });

    // Merge candidate counts with campaign data
    const campaignsWithCountsMap = new Map(campaignsWithCounts.map(c => [c.id, c.candidatesCount]));
    const enrichedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      candidatesCount: campaignsWithCountsMap.get(campaign.id) || 0
    }));
    
    return { 
      success: true, 
      jobCampaigns: enrichedCampaigns,
      total
    };
  } catch (error) {
    console.error('Error fetching job campaigns:', error);
    return { success: false, error: 'Failed to fetch job campaigns' };
  }
}

export async function getJobCampaignById(id: string) {
  try {
    const [campaign] = await db
      .select()
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, id));
    
    return { success: true, data: campaign };
  } catch (error) {
    console.error('Error fetching job campaign:', error);
    return { success: false, error: 'Failed to fetch job campaign' };
  }
}

// Helper function to validate if a campaign exists
export async function validateCampaignExists(campaignId: string) {
  try {
    const result = await getJobCampaignById(campaignId);
    return result.success && result.data;
  } catch (error) {
    console.error('Error validating campaign existence:', error);
    return false;
  }
}

export async function updateJobCampaign(id: string, data: Partial<typeof jobCampaigns.$inferInsert>) {
  try {
    const [campaign] = await db
      .update(jobCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobCampaigns.id, id))
      .returning();
    
    return { success: true, data: campaign };
  } catch (error) {
    console.error('Error updating job campaign:', error);
    return { success: false, error: 'Failed to update job campaign' };
  }
}

export async function deleteJobCampaign(id: string) {
  try {
    await db
      .delete(jobCampaigns)
      .where(eq(jobCampaigns.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting job campaign:', error);
    return { success: false, error: 'Failed to delete job campaign' };
  }
}

// Job Portal Sync Operations - REMOVED
// This functionality has been deprecated and removed

// Candidate Operations
export async function createCandidate(data: {
  campaignId: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experience?: string;
  currentCompany?: string;
  currentRole?: string;
  skills?: string;
  source: string;
  aiParsedData?: string;
}) {
  try {
    const [candidate] = await db.insert(candidates).values(data).returning();
    return { success: true, data: candidate };
  } catch (error) {
    console.error('Error creating candidate:', error);
    return { success: false, error: 'Failed to create candidate' };
  }
}

export async function getCandidatesByCampaign(campaignId: string, filters?: {
  status?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
}) {
  try {
    const conditions: (SQL | undefined)[] = [eq(candidates.campaignId, campaignId)];
    
    if (filters) {
      if (filters.status) {
        conditions.push(eq(candidates.status, filters.status));
      }
      
      if (filters.source) {
        conditions.push(eq(candidates.source, filters.source));
      }
      
      if (filters.minScore !== undefined) {
        conditions.push(gte(candidates.overallScore, filters.minScore));
      }
      
      if (filters.maxScore !== undefined) {
        conditions.push(lte(candidates.overallScore, filters.maxScore));
      }
      
      if (filters.search) {
        const searchConditions = [
          like(candidates.name, `%${filters.search}%`),
          like(candidates.email, `%${filters.search}%`),
          like(candidates.currentCompany, `%${filters.search}%`)
        ].filter((c): c is SQL => Boolean(c));

        if (searchConditions.length > 0) {
          conditions.push(or(...searchConditions));
        }
      }
    }
    
    const finalConditions = conditions.filter((c): c is SQL => Boolean(c));
      
    const candidateList = await executeWithRetry(async () => {
      return await db.select()
        .from(candidates)
        .where(and(...finalConditions))
        .orderBy(desc(candidates.appliedAt));
    });
      
    return { success: true, data: candidateList };
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return { success: false, error: 'Failed to fetch candidates' };
  }
}

// Get candidates for a campaign
export async function getCandidates(campaignId: string, limit = 10, offset = 0, status?: string) {
  try {
    // Build conditions array
    const conditions = [eq(candidates.campaignId, campaignId)];
    
    if (status) {
      conditions.push(eq(candidates.status, status));
    }
    
    // Execute query with all conditions at once
    const result = await db.select()
      .from(candidates)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error getting candidates:', error);
    return {
      success: false,
      error: 'Failed to get candidates'
    };
  }
}

// Get all candidates for a company across all campaigns
export async function getCandidatesByCompany(companyId: string, filters?: {
  status?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  campaignId?: string;
}) {
  try {
    const conditions: (SQL | undefined)[] = [eq(jobCampaigns.companyId, companyId)];
    
    if (filters) {
      if (filters.status) {
        conditions.push(eq(candidates.status, filters.status));
      }
      
      if (filters.source) {
        conditions.push(eq(candidates.source, filters.source));
      }
      
      if (filters.campaignId) {
        conditions.push(eq(candidates.campaignId, filters.campaignId));
      }
      
      if (filters.minScore !== undefined) {
        conditions.push(gte(candidates.overallScore, filters.minScore));
      }
      
      if (filters.maxScore !== undefined) {
        conditions.push(lte(candidates.overallScore, filters.maxScore));
      }
      
      if (filters.search) {
        const searchConditions = [
          like(candidates.name, `%${filters.search}%`),
          like(candidates.email, `%${filters.search}%`),
          like(candidates.currentCompany, `%${filters.search}%`),
          like(jobCampaigns.campaignName, `%${filters.search}%`),
          like(jobCampaigns.jobTitle, `%${filters.search}%`)
        ].filter((c): c is SQL => Boolean(c));

        if (searchConditions.length > 0) {
          conditions.push(or(...searchConditions));
        }
      }
    }
    
    const finalConditions = conditions.filter((c): c is SQL => Boolean(c));
      
    const candidateList = await db.select({
      // Candidate fields
      id: candidates.id,
      campaignId: candidates.campaignId,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      resumeUrl: candidates.resumeUrl,
      linkedinUrl: candidates.linkedinUrl,
      portfolioUrl: candidates.portfolioUrl,
      experience: candidates.experience,
      currentCompany: candidates.currentCompany,
      currentRole: candidates.currentRole,
      skills: candidates.skills,
      source: candidates.source,
      status: candidates.status,
      overallScore: candidates.overallScore,
      talentFitScore: candidates.talentFitScore,
      aiParsedData: candidates.aiParsedData,
      notes: candidates.notes,
      appliedAt: candidates.appliedAt,
      updatedAt: candidates.updatedAt,
      lastContactedAt: candidates.lastContactedAt,
      expectedSalary: candidates.expectedSalary,
      noticePeriod: candidates.noticePeriod,
      location: candidates.location,
      educationLevel: candidates.educationLevel,
      educationInstitution: candidates.educationInstitution,
      // Campaign fields
      campaignName: jobCampaigns.campaignName,
      jobTitle: jobCampaigns.jobTitle,
      department: jobCampaigns.department
    })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...finalConditions))
      .orderBy(desc(candidates.appliedAt));
      
    return { success: true, data: candidateList };
  } catch (error) {
    console.error('Error fetching candidates by company:', error);
    return { success: false, error: 'Failed to fetch candidates' };
  }
}

export async function updateCandidate(id: string, data: Partial<typeof candidates.$inferInsert>) {
  try {
    const [candidate] = await db
      .update(candidates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    
    return { success: true, data: candidate };
  } catch (error) {
    console.error('Error updating candidate:', error);
    return { success: false, error: 'Failed to update candidate' };
  }
}

/**
 * Comprehensive candidate deletion function
 * Deletes a candidate and all associated data across multiple tables
 * This function calls the comprehensive deletion API endpoint
 */
export async function deleteCandidate(candidateId: string, companyId: string) {
  try {
    // Make a request to the comprehensive deletion endpoint
    const response = await fetch(`/api/candidates/${candidateId}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error || 'Failed to delete candidate' 
      };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return { success: false, error: 'Failed to delete candidate' };
  }
}

// Get job portal syncs for a campaign - REMOVED
// This functionality has been deprecated and removed

// Get scoring parameters for a campaign
export async function getScoringParameters(campaignId: string) {
  try {
    const result = await db.select().from(scoringParameters)
      .where(eq(scoringParameters.campaignId, campaignId));
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error getting scoring parameters:', error);
    return {
      success: false,
      error: 'Failed to get scoring parameters'
    };
  }
}

// Get interview setups for a campaign
export async function getInterviewSetups(campaignId: string) {
  try {
    const result = await db.select().from(interviewSetups)
      .where(and(
        eq(interviewSetups.campaignId, campaignId),
        eq(interviewSetups.isActive, true)
      ));
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error getting interview setups:', error);
    return {
      success: false,
      error: 'Failed to get interview setups'
    };
  }
}

// Get campaign interviews
export async function getCampaignInterviews(campaignId?: string, candidateId?: string, status?: string, limit = 10, offset = 0) {
  try {
    // Build the conditions array
    const conditions: any[] = [];
    
    if (campaignId) {
      conditions.push(eq(campaignInterviews.campaignId, campaignId));
    }
    
    if (candidateId) {
      conditions.push(eq(campaignInterviews.candidateId, candidateId));
    }
    
    if (status) {
      conditions.push(eq(campaignInterviews.status, status));
    }
    
    // Execute the query with all conditions at once
    const query = db.select()
      .from(campaignInterviews)
      .limit(limit)
      .offset(offset);
    
    const result = conditions.length > 0 
      ? await query.where(and(...conditions))
      : await query;
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error getting campaign interviews:', error);
    return {
      success: false,
      error: 'Failed to get campaign interviews'
    };
  }
}

// Scoring Parameters Operations
export async function createScoringParameter(data: {
  campaignId: string;
  parameterType: string;
  parameterName: string;
  weight: number;
  proficiencyLevel?: string;
  isRequired?: boolean;
}) {
  try {
    const [parameter] = await db.insert(scoringParameters).values(data).returning();
    return { success: true, data: parameter };
  } catch (error) {
    console.error('Error creating scoring parameter:', error);
    return { success: false, error: 'Failed to create scoring parameter' };
  }
}

export async function getScoringParametersByCampaign(campaignId: string) {
  try {
    const parameters = await db
      .select()
      .from(scoringParameters)
      .where(eq(scoringParameters.campaignId, campaignId))
      .orderBy(desc(scoringParameters.createdAt));
    
    return { success: true, data: parameters };
  } catch (error) {
    console.error('Error fetching scoring parameters:', error);
    return { success: false, error: 'Failed to fetch scoring parameters' };
  }
}

// Candidate Scores Operations
export async function createCandidateScore(data: {
  candidateId: string;
  parameterId: string;
  score: number;
  aiGenerated?: boolean;
  manualOverride?: boolean;
  notes?: string;
}) {
  try {
    const [score] = await db.insert(candidateScores).values(data).returning();
    return { success: true, data: score };
  } catch (error) {
    console.error('Error creating candidate score:', error);
    return { success: false, error: 'Failed to create candidate score' };
  }
}

export async function getCandidateScores(candidateId: string) {
  try {
    const scores = await db
      .select({
        id: candidateScores.id,
        score: candidateScores.score,
        aiGenerated: candidateScores.aiGenerated,
        manualOverride: candidateScores.manualOverride,
        notes: candidateScores.notes,
        parameterName: scoringParameters.parameterName,
        parameterType: scoringParameters.parameterType,
        weight: scoringParameters.weight
      })
      .from(candidateScores)
      .leftJoin(scoringParameters, eq(candidateScores.parameterId, scoringParameters.id))
      .where(eq(candidateScores.candidateId, candidateId));
    
    return { success: true, data: scores };
  } catch (error) {
    console.error('Error fetching candidate scores:', error);
    return { success: false, error: 'Failed to fetch candidate scores' };
  }
}

// Interview Setup Operations
export async function createInterviewSetup(data: {
  campaignId: string;
  roundNumber: number;
  roundName: string;
  interviewType: string;
  timeLimit: number;
  questionCollectionId?: string;
  numberOfQuestions: number;
  randomizeQuestions?: boolean;
  difficultyLevel: string;
  instructions?: string;
  passingScore?: number;
}) {
  try {
    // First, validate that the campaign exists
    const campaignResult = await getJobCampaignById(data.campaignId);
    if (!campaignResult.success || !campaignResult.data) {
      return { 
        success: false, 
        error: `Campaign with ID ${data.campaignId} does not exist. Please ensure the campaign is created before setting up interviews.` 
      };
    }

    const [setup] = await db.insert(interviewSetups).values(data).returning();
    return { success: true, data: setup };
  } catch (error) {
    console.error('Error creating interview setup:', error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
      return { 
        success: false, 
        error: `Campaign with ID ${data.campaignId} does not exist. Please ensure the campaign is created before setting up interviews.` 
      };
    }
    
    return { success: false, error: 'Failed to create interview setup' };
  }
}

export async function getInterviewSetupsByCampaign(campaignId: string) {
  try {
    const setups = await db
      .select()
      .from(interviewSetups)
      .where(eq(interviewSetups.campaignId, campaignId))
      .orderBy(interviewSetups.roundNumber);
    
    return { success: true, data: setups };
  } catch (error) {
    console.error('Error fetching interview setups:', error);
    return { success: false, error: 'Failed to fetch interview setups' };
  }
}

// Campaign Interview Operations
export async function createCampaignInterview(data: {
  campaignId: string;
  candidateId: string;
  setupId: string;
  interviewId: string;
  interviewType: string;
  scheduledAt?: Date;
}) {
  try {
    const [interview] = await db.insert(campaignInterviews).values(data).returning();
    return { success: true, data: interview };
  } catch (error) {
    console.error('Error creating campaign interview:', error);
    return { success: false, error: 'Failed to create campaign interview' };
  }
}

export async function updateCampaignInterview(id: string, data: {
  completedAt?: Date;
  status?: string;
  score?: number;
  feedback?: string;
}) {
  try {
    const [interview] = await db
      .update(campaignInterviews)
      .set(data)
      .where(eq(campaignInterviews.id, id))
      .returning();
    
    return { success: true, data: interview };
  } catch (error) {
    console.error('Error updating campaign interview:', error);
    return { success: false, error: 'Failed to update campaign interview' };
  }
}

// Question Bank Operations
export async function createQuestion(data: {
  collectionId: string;
  companyId: string;
  createdBy: string;
  questionType: string;
  category: string;
  difficultyLevel: string;
  question: string;
  expectedAnswer?: string;
  sampleAnswer?: string;
  scoringRubric?: any;
  tags?: string;
}) {
  try {
    const [question] = await db.insert(questions).values(data).returning();
    return { success: true, data: question };
  } catch (error) {
    console.error('Error creating question:', error);
    return { success: false, error: 'Failed to create question' };
  }
}

export async function getQuestions(filters: {
  companyId?: string;
  collectionId?: string;
  questionType?: string;
  category?: string;
  difficultyLevel?: string;
  search?: string;
  tags?: string;
  allowCrossCompany?: boolean; // Add flag for super admin access
}) {
  try {
    const conditions: (SQL | undefined)[] = [];

    // Allow access to questions from:
    // 1. Same company
    // 2. System questions (companyId is null)
    // 3. Questions in collections that the user has access to (via collectionId)
    // 4. Questions created by the current user (for company migration scenarios)
    // 5. Cross-company access for super admins
    if (filters.collectionId) {
      // If collectionId is specified, get questions from that collection
      conditions.push(eq(questions.collectionId, filters.collectionId));
      
      // For super admins or cross-company access, no additional filtering needed
      // For regular users, we already verified collection access in the API routes
      // So if they have access to the collection, they should have access to its questions
    } else if (filters.allowCrossCompany) {
      // Super admin can access all questions
      // No company restriction needed
    } else if (filters.companyId) {
      // If no collectionId specified, only show questions from same company or system questions
      conditions.push(or(
        eq(questions.companyId, filters.companyId),
        isNull(questions.companyId)
      ));
    }

    if (filters.questionType) {
      conditions.push(eq(questions.questionType, filters.questionType));
    }

    if (filters.category) {
      conditions.push(eq(questions.category, filters.category));
    }

    if (filters.difficultyLevel) {
      // Case-insensitive difficulty level matching
      conditions.push(sql`LOWER(${questions.difficultyLevel}) = LOWER(${filters.difficultyLevel})`);
    }

    if (filters.tags) {
      conditions.push(like(questions.tags, `%${filters.tags}%`));
    }

    if (filters.search) {
      const searchConditions = [
        like(questions.question, `%${filters.search}%`),
        like(questions.category, `%${filters.search}%`),
        like(questions.tags, `%${filters.search}%`)
      ].filter((c): c is SQL => Boolean(c));

      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
    }

    const finalConditions = conditions.filter((c): c is SQL => Boolean(c));
    
    const questionResults = await db.select()
      .from(questions)
      .where(finalConditions.length > 0 ? and(...finalConditions) : undefined)
      .orderBy(desc(questions.createdAt));

    console.log(`✅ getQuestions: Found ${questionResults.length} questions for collection ${filters.collectionId} (${filters.questionType}, ${filters.difficultyLevel})`);

    return { success: true, data: questionResults };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return { success: false, error: 'Failed to fetch questions' };
  }
}

export async function updateQuestion(id: string, data: Partial<typeof questions.$inferInsert>) {
  try {
    const [question] = await db
      .update(questions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    
    return { success: true, data: question };
  } catch (error) {
    console.error('Error updating question:', error);
    return { success: false, error: 'Failed to update question' };
  }
}

export async function deleteQuestion(id: string) {
  try {
    await db
      .delete(questions)
      .where(eq(questions.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting question:', error);
    return { success: false, error: 'Failed to delete question' };
  }
}

// Skill Template Operations
export async function createSkillTemplate(data: {
  companyId: string;
  createdBy: string;
  templateName: string;
  jobCategory: string;
  skills: any;
  jobDuties?: string;
  isDefault?: boolean;
}) {
  try {
    const [template] = await db.insert(skillTemplates).values(data).returning();
    return { success: true, data: template };
  } catch (error) {
    console.error('Error creating skill template:', error);
    return { success: false, error: 'Failed to create skill template' };
  }
}

export async function getSkillTemplates(companyId: string, jobCategory?: string) {
  try {
    // Start with the base condition for companyId
    const conditions = [eq(skillTemplates.companyId, companyId)];
    
    // Add job category filter if provided
    if (jobCategory) {
      conditions.push(eq(skillTemplates.jobCategory, jobCategory));
    }
    
    // Execute the query with all conditions at once
    const templates = await db.select()
      .from(skillTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(skillTemplates.createdAt));
      
    return { success: true, data: templates };
  } catch (error) {
    console.error('Error fetching skill templates:', error);
    return { success: false, error: 'Failed to fetch skill templates' };
  }
}

export async function updateSkillTemplate(id: string, data: Partial<typeof skillTemplates.$inferInsert>) {
  try {
    const [template] = await db
      .update(skillTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(skillTemplates.id, id))
      .returning();
    
    return { success: true, data: template };
  } catch (error) {
    console.error('Error updating skill template:', error);
    return { success: false, error: 'Failed to update skill template' };
  }
}

export async function deleteSkillTemplate(id: string) {
  try {
    await db
      .delete(skillTemplates)
      .where(eq(skillTemplates.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting skill template:', error);
    return { success: false, error: 'Failed to delete skill template' };
  }
}

// Analytics and Statistics
export async function getCampaignStats(campaignId: string) {
  try {
    const [candidateCount] = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.campaignId, campaignId));
    
    const [appliedCount] = await db
      .select({ count: count() })
      .from(candidates)
      .where(and(
        eq(candidates.campaignId, campaignId),
        eq(candidates.status, 'applied')
      ));
    
    const [interviewCount] = await db
      .select({ count: count() })
      .from(candidates)
      .where(and(
        eq(candidates.campaignId, campaignId),
        eq(candidates.status, 'interview')
      ));
    
    const [hiredCount] = await db
      .select({ count: count() })
      .from(candidates)
      .where(and(
        eq(candidates.campaignId, campaignId),
        eq(candidates.status, 'hired')
      ));
    
    return {
      success: true,
      data: {
        totalCandidates: candidateCount.count,
        applied: appliedCount.count,
        inInterview: interviewCount.count,
        hired: hiredCount.count
      }
    };
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return { success: false, error: 'Failed to fetch campaign stats' };
  }
}

// Function to get distinct job categories from skill templates
export async function getDistinctJobCategories(companyId: string) {
  try {
    // Query to get distinct job categories from skill templates
    const result = await db.selectDistinct({ jobCategory: skillTemplates.jobCategory })
      .from(skillTemplates)
      .where(eq(skillTemplates.companyId, companyId));
    
    // Extract job categories from result
    const categories = result.map((item: { jobCategory: string }) => item.jobCategory);
    
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error fetching distinct job categories:', error);
    return { success: false, error: 'Failed to fetch job categories' };
  }
}

// Job Description Template Functions
export async function getJobDescriptionTemplates(companyId: string) {
  try {
    const result = await db.select()
      .from(jobDescriptionTemplates)
      .where(and(
        eq(jobDescriptionTemplates.companyId, companyId),
        eq(jobDescriptionTemplates.isActive, true)
      ))
      .orderBy(desc(jobDescriptionTemplates.createdAt));
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching job description templates:', error);
    return { success: false, error: 'Failed to fetch job description templates' };
  }
}

export async function createJobDescriptionTemplate(data: {
  companyId: string;
  createdBy: string;
  templateName: string;
  jobCategory: string;
  templateContent: string;
  placeholders?: string[];
  description?: string;
  isDefault?: boolean;
}) {
  try {
    const templateData = {
      ...data,
      placeholders: data.placeholders ? JSON.stringify(data.placeholders) : null,
      isDefault: data.isDefault || false,
    };
    
    const [template] = await db.insert(jobDescriptionTemplates)
      .values(templateData)
      .returning();
    
    return { success: true, data: template };
  } catch (error) {
    console.error('Error creating job description template:', error);
    return { success: false, error: 'Failed to create job description template' };
  }
}

export async function updateJobDescriptionTemplate(id: string, data: {
  templateName?: string;
  jobCategory?: string;
  templateContent?: string;
  placeholders?: string[];
  description?: string;
  isDefault?: boolean;
}) {
  try {
    const updateData: any = { ...data };
    if (data.placeholders) {
      updateData.placeholders = JSON.stringify(data.placeholders);
    }
    updateData.updatedAt = new Date();
    
    const [template] = await db.update(jobDescriptionTemplates)
      .set(updateData)
      .where(eq(jobDescriptionTemplates.id, id))
      .returning();
    
    return { success: true, data: template };
  } catch (error) {
    console.error('Error updating job description template:', error);
    return { success: false, error: 'Failed to update job description template' };
  }
}

export async function deleteJobDescriptionTemplate(id: string) {
  try {
    await db.update(jobDescriptionTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobDescriptionTemplates.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting job description template:', error);
    return { success: false, error: 'Failed to delete job description template' };
  }
}

export async function getJobDescriptionTemplate(id: string) {
  try {
    const [template] = await db.select()
      .from(jobDescriptionTemplates)
      .where(and(
        eq(jobDescriptionTemplates.id, id),
        eq(jobDescriptionTemplates.isActive, true)
      ));
    
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    return { success: true, data: template };
  } catch (error) {
    console.error('Error fetching job description template:', error);
    return { success: false, error: 'Failed to fetch job description template' };
  }
}