import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import { createJobCampaign, getJobCampaigns, deleteJobCampaign, updateJobCampaign } from '@/lib/database/queries/campaigns';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }

    const {
      campaignName,
      jobTitle,
      department,
      location,
      experienceLevel,
      employeeType,
      employmentType, // Handle both field names
      salaryMin,
      salaryMax,
      salaryNegotiable,
      numberOfOpenings,
      jobDescription,
      jobDuties,
      jobRequirements,
      requirements,
      benefits,
      skills,
      companyId,
      currency,
      campaignType,
      applicationDeadline,
      targetHireDate,
      isRemote,
      isHybrid,
      minExperience,
      maxExperience,
      competencies,
      jobDescriptionTemplateId,
      skillTemplateId,
    } = body;

    // Use employmentType if employeeType is not provided (for backward compatibility)
    const finalEmployeeType = employeeType || employmentType;

    // Enhanced validation with detailed error messages
    const validationErrors: Record<string, string> = {};
    
    if (!campaignName || campaignName.trim().length < 3) {
      validationErrors.campaignName = 'Campaign name must be at least 3 characters long';
    }
    if (!jobTitle || jobTitle.trim().length < 2) {
      validationErrors.jobTitle = 'Job title must be at least 2 characters long';
    }
    if (!department || department.trim().length < 2) {
      validationErrors.department = 'Department is required';
    }
    if (!location || location.trim().length < 2) {
      validationErrors.location = 'Location is required';
    }
    if (!experienceLevel) {
      validationErrors.experienceLevel = 'Experience level is required';
    }
    if (!finalEmployeeType) {
      validationErrors.employeeType = 'Employment type is required';
    }
    if (!numberOfOpenings || numberOfOpenings < 1 || numberOfOpenings > 100) {
      validationErrors.numberOfOpenings = 'Number of openings must be between 1 and 100';
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      validationErrors.jobDescription = 'Job description must be at least 50 characters long';
    }
    if (!companyId) {
      validationErrors.companyId = 'Company ID is required';
    }
    
    // Salary validation
    if (salaryMin && salaryMax && parseInt(salaryMin.toString()) > parseInt(salaryMax.toString())) {
      validationErrors.salary = 'Minimum salary cannot be greater than maximum salary';
    }
    
    // Date validation
    if (applicationDeadline) {
      const deadline = new Date(applicationDeadline);
      if (deadline <= new Date()) {
        validationErrors.applicationDeadline = 'Application deadline must be in the future';
      }
    }
    
    if (targetHireDate && applicationDeadline) {
      const deadline = new Date(applicationDeadline);
      const hireDate = new Date(targetHireDate);
      if (hireDate <= deadline) {
        validationErrors.targetHireDate = 'Target hire date must be after application deadline';
      }
    }
    


    if (Object.keys(validationErrors).length > 0) {
      console.error('Validation failed:', validationErrors);
      console.error('Received data:', body);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          validationErrors,
          message: 'Please fix the validation errors and try again'
        },
        { status: 400 }
      );
    }

    // Prepare data for database insertion
    const campaignData = {
      campaignName: campaignName.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      location: location.trim(),
      experienceLevel,
      employeeType: finalEmployeeType,
      salaryMin: salaryMin ? parseInt(salaryMin.toString()) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax.toString()) : undefined,
      salaryNegotiable: Boolean(salaryNegotiable),
      currency: currency || 'USD',
      numberOfOpenings: parseInt(numberOfOpenings.toString()),
      jobDescription: jobDescription.trim(),
      jobDuties: (typeof jobDuties === 'string' ? jobDuties.trim() : Array.isArray(jobDuties) ? jobDuties.join('\n').trim() : '') || '',
      jobRequirements: jobRequirements?.trim() || (typeof requirements === 'string' ? requirements.trim() : Array.isArray(requirements) ? requirements.join('\n').trim() : '') || '',
      jobBenefits: (typeof benefits === 'string' ? benefits.trim() : Array.isArray(benefits) ? benefits.join('\n').trim() : '') || '',
      requiredSkills: typeof skills === 'string' ? skills.trim() : JSON.stringify(skills || []),
      competencies: typeof competencies === 'string' ? competencies.trim() : JSON.stringify(competencies || []),
      minExperience: minExperience ? parseInt(minExperience.toString()) : undefined,
      maxExperience: maxExperience ? parseInt(maxExperience.toString()) : undefined,
      campaignType: campaignType || 'specific',
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
      targetHireDate: targetHireDate ? new Date(targetHireDate) : undefined,
      isRemote: Boolean(isRemote),
      isHybrid: Boolean(isHybrid),
      jobDescriptionTemplateId: jobDescriptionTemplateId || undefined,
      skillTemplateId: skillTemplateId || undefined,
      
      createdBy: session.user.id,
      companyId
    };

    const result = await createJobCampaign(campaignData);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Job campaign created successfully'
    });

  } catch (error) {
    console.error('Error in job campaign API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const result = await getJobCampaigns({
      companyId,
      limit,
      offset
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.jobCampaigns,
      total: result.total
    });

  } catch (error) {
    console.error('Error in job campaigns GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteJobCampaign(campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job campaign deleted successfully'
    });

  } catch (error) {
    console.error('Error in job campaign DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}