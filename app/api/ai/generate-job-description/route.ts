import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { generateWithOpenAI } from '@/lib/integrations/ai/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { portalName, syncId, jobDetails } = await req.json();

    if (!portalName) {
      return NextResponse.json(
        { error: 'Portal name is required' },
        { status: 400 }
      );
    }

    // Use AI to generate a customized job description

    const prompt = `Generate a professional job description optimized for ${portalName} job portal.

${jobDetails ? `Job Details:
${JSON.stringify(jobDetails, null, 2)}` : ''}

Requirements:
- Make it engaging and professional
- Include clear job responsibilities
- List required qualifications
- Add company benefits if applicable
- Format it appropriately for ${portalName}
- Include application instructions

Generate a complete, ready-to-post job description.`;

    const description = await generateWithOpenAI(prompt);
    
    if (!description || description.trim().length === 0) {
      // Fallback to template-based description
      const fallbackDescription = generateFallbackDescription(portalName, jobDetails);
      return NextResponse.json({
        success: true,
        description: fallbackDescription,
        generated: 'fallback'
      });
    }

    return NextResponse.json({
      success: true,
      description,
      generated: 'ai'
    });

  } catch (error) {
    console.error('Error generating job description:', error);
    
    // Fallback to template-based description
    const { portalName, jobDetails } = await req.json();
    const fallbackDescription = generateFallbackDescription(portalName, jobDetails);
    
    return NextResponse.json({
      success: true,
      description: fallbackDescription,
      generated: 'fallback'
    });
  }
}

function generateFallbackDescription(portalName: string, jobDetails?: any): string {
  const companyName = jobDetails?.companyName || 'Our Company';
  const jobTitle = jobDetails?.jobTitle || 'Position';
  const location = jobDetails?.location || 'Various Locations';
  const salaryRange = jobDetails?.salaryMin && jobDetails?.salaryMax 
    ? `$${jobDetails.salaryMin.toLocaleString()} - $${jobDetails.salaryMax.toLocaleString()}` 
    : 'Competitive Salary';

  return `JOB POSTING FOR ${portalName.toUpperCase()}

🏢 COMPANY: ${companyName}
📍 LOCATION: ${location}
💰 SALARY: ${salaryRange}
📅 POSTED: ${new Date().toLocaleDateString()}

═══════════════════════════════════════

🎯 POSITION: ${jobTitle}

We are seeking a talented ${jobTitle} to join our dynamic team. This is an excellent opportunity for a motivated professional to contribute to our growing organization.

📋 KEY RESPONSIBILITIES:
• Lead and execute key projects
• Collaborate with cross-functional teams
• Drive innovation and continuous improvement
• Maintain high standards of quality and performance
• Contribute to strategic planning and execution

🎓 REQUIRED QUALIFICATIONS:
• Bachelor's degree in relevant field
• Proven experience in similar role
• Strong analytical and problem-solving skills
• Excellent communication and interpersonal skills
• Ability to work independently and in team environments

🌟 PREFERRED QUALIFICATIONS:
• Advanced degree or relevant certifications
• Industry-specific experience
• Leadership experience
• Technical proficiency in relevant tools

💼 WHAT WE OFFER:
• Competitive salary and benefits package
• Professional development opportunities
• Collaborative and inclusive work environment
• Flexible work arrangements
• Health and wellness programs

📧 HOW TO APPLY:
Please submit your resume and cover letter through ${portalName}.

${companyName} is an equal opportunity employer committed to diversity and inclusion.

═══════════════════════════════════════
Generated on: ${new Date().toLocaleDateString()}
Optimized for: ${portalName}`;
}