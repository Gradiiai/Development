import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";
import { updateJobCampaign, getJobCampaignById, deleteJobCampaign } from '@/lib/database/queries/campaigns';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }
    
    // Check if this is a status-only update
    if (Object.keys(body).length === 1 && body.status) {
      // Handle status-only update
      const result = await updateJobCampaign(campaignId, {
        status: body.status
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Campaign status updated successfully'
      });
    }
    
    // Handle full campaign update
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
      applicationDeadline,
      targetHireDate,
      isRemote,
      isHybrid,
      minExperience,
      maxExperience,
      competencies,
      jobDescriptionTemplateId,
      skillTemplateId,
      autoScheduleConfig,
      status
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
    if(!applicationDeadline){
      validationErrors.applicationDeadline = 'Application deadline is required';
    }
    if(!targetHireDate){
      validationErrors.targetHireDate = 'Target hire date is required';
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
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          validationErrors,
          message: 'Please fix the validation errors and try again'
        },
        { status: 400 }
      );
    }

    // Check if campaign exists and user has permission
    const existingCampaign = await getJobCampaignById(campaignId);
    if (!existingCampaign.success || !existingCampaign.data) {
      return NextResponse.json(
        { error: 'Job campaign not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this campaign
    if (existingCampaign.data.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this campaign' },
        { status: 403 }
      );
    }

    const updateData: any = {
      campaignName: campaignName.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      location: location.trim(),
      experienceLevel,
      employeeType: finalEmployeeType,
      salaryMin: salaryMin ? parseInt(String(salaryMin)) : undefined,
      salaryMax: salaryMax ? parseInt(String(salaryMax)) : undefined,
      salaryNegotiable: Boolean(salaryNegotiable),
      currency: currency || 'USD',
      numberOfOpenings: parseInt(String(numberOfOpenings)),
      jobDescription: jobDescription.trim(),
      jobDuties: (typeof jobDuties === 'string' ? jobDuties.trim() : Array.isArray(jobDuties) ? jobDuties.join('\n').trim() : '') || '',
      jobRequirements: jobRequirements?.trim() || (typeof requirements === 'string' ? requirements.trim() : Array.isArray(requirements) ? requirements.join('\n').trim() : '') || '',
      jobBenefits: (typeof benefits === 'string' ? benefits.trim() : Array.isArray(benefits) ? benefits.join('\n').trim() : '') || '',
      requiredSkills: typeof skills === 'string' ? skills.trim() : JSON.stringify(skills || []),
      competencies: typeof competencies === 'string' ? competencies.trim() : JSON.stringify(competencies || []),
      minExperience: minExperience ? parseInt(minExperience.toString()) : undefined,
      maxExperience: maxExperience ? parseInt(maxExperience.toString()) : undefined,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
      targetHireDate: targetHireDate ? new Date(targetHireDate) : undefined,
      isRemote: Boolean(isRemote),
      isHybrid: Boolean(isHybrid),
      jobDescriptionTemplateId: jobDescriptionTemplateId || undefined,
      skillTemplateId: skillTemplateId || undefined,
      autoScheduleConfig: autoScheduleConfig || undefined,
      companyId
    };

    // Include status if provided
    if (status) {
      updateData.status = status;
    }

    const result = await updateJobCampaign(campaignId, updateData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Job campaign updated successfully'
    });

  } catch (error) {
    console.error('Error in job campaign PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const result = await getJobCampaignById(campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: 'Job campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in job campaign GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    
    // Check if campaign exists and user has permission
    const existingCampaign = await getJobCampaignById(campaignId);
    if (!existingCampaign.success || !existingCampaign.data) {
      return NextResponse.json(
        { error: 'Job campaign not found' },
        { status: 404 }
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