// MIGRATED: Previously at app/api/job-folder/job-description-pdf/route.ts
// MIGRATED DATE: Phase 2C - Directory Structure Cleanup
// REASON: Moved from confusing job-folder structure to logical campaigns structure
// NEW LOCATION: /api/campaigns/pdf/

import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { generateJobDescriptionPDF, getJobDescriptionPDFBlob } from '@/lib/services/campaign/pdf-generator';
import { getJobCampaignById } from '@/lib/database/queries/campaigns';

// POST /api/campaigns/pdf (previously /api/job-folder/job-description-pdf)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, download = false } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Fetch campaign data
    const campaignResult = await getJobCampaignById(campaignId);
    if (!campaignResult.success || !campaignResult.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignResult.data;

    // Prepare data for PDF generation
    const pdfData = {
      campaignName: campaign.campaignName,
      jobTitle: campaign.jobTitle,
      department: campaign.department,
      location: campaign.location,
      experienceLevel: campaign.experienceLevel,
      employeeType: campaign.employeeType,
      salaryMin: campaign.salaryMin ?? undefined,
      salaryMax: campaign.salaryMax ?? undefined,
      numberOfOpenings: campaign.numberOfOpenings,
      jobDescription: campaign.jobDescription,
      jobDuties: campaign.jobDuties,
      companyName: session.user.name || 'Company',
      skills: [],
      competencies: []
    };

    if (download) {
      // Generate PDF blob for download
      const pdfBlob = getJobDescriptionPDFBlob({
        ...pdfData,
        jobDuties: pdfData.jobDuties || undefined
      });
      const buffer = await pdfBlob.arrayBuffer();
      
      const filename = `${campaign.jobTitle.replace(/\s+/g, '_')}_JD.pdf`;
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.byteLength.toString(),
        },
      });
    } else {
      // Return success response for client-side generation
      return NextResponse.json({ 
        success: true, 
        data: pdfData,
        message: 'PDF data prepared successfully' 
      });
    }
  } catch (error) {
    console.error('Error generating job description PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Fetch campaign data
    const campaignResult = await getJobCampaignById(campaignId);
    if (!campaignResult.success || !campaignResult.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignResult.data;

    // Prepare data for PDF generation
    const pdfData = {
      campaignName: campaign.campaignName,
      jobTitle: campaign.jobTitle,
      department: campaign.department,
      location: campaign.location,
      experienceLevel: campaign.experienceLevel,
      employeeType: campaign.employeeType,
      salaryMin: campaign.salaryMin ?? undefined,
      salaryMax: campaign.salaryMax ?? undefined,
      numberOfOpenings: campaign.numberOfOpenings,
      jobDescription: campaign.jobDescription,
      jobDuties: campaign.jobDuties,
      companyName: session.user.name || 'Company',
      skills: [],
      competencies: []
    };

    // Generate PDF blob for download
    const pdfBlob = getJobDescriptionPDFBlob({
      ...pdfData,
      jobDuties: pdfData.jobDuties || undefined
    });
    const buffer = await pdfBlob.arrayBuffer();
    
    const filename = `${campaign.jobTitle.replace(/\s+/g, '_')}_JD.pdf`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating job description PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}