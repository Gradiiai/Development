import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { generateWithOpenAI } from '@/lib/integrations/ai/openai';



if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

export async function POST(req: NextRequest) {
  let requestBody: any;
  
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body once
    requestBody = await req.json();
    const { jobTitle, jobDescription, companyType, experienceLevel } = requestBody;

    if (!jobTitle) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      );
    }

    // Generate AI-powered job duties
    const prompt = `Generate comprehensive and specific job duties for the following position:

Job Title: ${jobTitle}
${jobDescription ? `Job Description: ${jobDescription}` : ''}
${companyType ? `Company Type: ${companyType}` : ''}
${experienceLevel ? `Experience Level: ${experienceLevel}` : ''}

Generate 8-12 specific, actionable job duties that are:
- Clear and measurable
- Relevant to the position
- Progressive in responsibility
- Industry-appropriate
- Results-oriented

Format as a JSON array of strings, each duty starting with an action verb.

Example format:
[
  "Develop and implement strategic marketing campaigns",
  "Analyze market trends and competitor activities",
  "Manage cross-functional project teams"
]

Provide only the JSON array, no additional text.`;

    const duties = await generateWithOpenAI(prompt);
    
    if (!duties || duties.trim().length === 0) {
      // Fallback to template-based duties
      const fallbackDuties = generateFallbackDuties(jobTitle, experienceLevel);
      return NextResponse.json({
        success: true,
        jobDuties: fallbackDuties,
        generated: 'fallback'
      });
    }

    try {
      // Try to parse the AI response as JSON
      const parsedDuties = JSON.parse(duties);
      if (Array.isArray(parsedDuties)) {
        return NextResponse.json({
          success: true,
          jobDuties: parsedDuties,
          generated: 'ai'
        });
      } else {
        throw new Error('Invalid format');
      }
    } catch (parseError) {
      // If parsing fails, fallback to template
      const fallbackDuties = generateFallbackDuties(jobTitle, experienceLevel);
      return NextResponse.json({
        success: true,
        jobDuties: fallbackDuties,
        generated: 'fallback'
      });
    }

  } catch (error) {
    console.error('Error generating job duties:', error);
    
    // Fallback to template-based duties using parsed request body if available
    const fallbackJobTitle = requestBody?.jobTitle || 'Position';
    const fallbackExperienceLevel = requestBody?.experienceLevel;
    const fallbackDuties = generateFallbackDuties(fallbackJobTitle, fallbackExperienceLevel);
    
    return NextResponse.json({
      success: true,
      jobDuties: fallbackDuties,
      generated: 'fallback',
      error: 'AI generation failed, using template'
    });
  }
}

function generateFallbackDuties(jobTitle: string, experienceLevel?: string): string[] {
  const baseTitle = jobTitle.toLowerCase();
  const isEntry = experienceLevel?.toLowerCase().includes('entry') || experienceLevel?.toLowerCase().includes('junior');
  const isSenior = experienceLevel?.toLowerCase().includes('senior') || experienceLevel?.toLowerCase().includes('lead');
  
  // Generic duties that can apply to most positions
  const genericDuties = [
    `Perform core ${jobTitle} responsibilities and tasks`,
    "Collaborate with team members and stakeholders",
    "Maintain accurate records and documentation",
    "Follow company policies and procedures",
    "Participate in team meetings and planning sessions",
    "Contribute to continuous improvement initiatives",
    "Ensure quality standards are met in all deliverables",
    "Communicate effectively with internal and external parties"
  ];

  // Add level-specific duties
  if (isSenior) {
    genericDuties.unshift(
      `Lead and mentor junior ${jobTitle} team members`,
      "Develop strategic plans and initiatives",
      "Make key decisions and recommendations"
    );
  } else if (isEntry) {
    genericDuties.push(
      "Learn and apply best practices in the field",
      "Seek guidance and feedback from senior team members",
      "Complete assigned training and development programs"
    );
  }

  // Add role-specific duties based on common job titles
  if (baseTitle.includes('developer') || baseTitle.includes('engineer')) {
    genericDuties.splice(1, 0, 
      "Write, test, and maintain high-quality code",
      "Debug and resolve technical issues",
      "Participate in code reviews and technical discussions"
    );
  } else if (baseTitle.includes('manager') || baseTitle.includes('supervisor')) {
    genericDuties.splice(1, 0,
      "Manage and supervise team performance",
      "Set goals and monitor progress",
      "Conduct performance reviews and provide feedback"
    );
  } else if (baseTitle.includes('analyst')) {
    genericDuties.splice(1, 0,
      "Analyze data and generate insights",
      "Prepare reports and presentations",
      "Identify trends and patterns in data"
    );
  } else if (baseTitle.includes('sales') || baseTitle.includes('marketing')) {
    genericDuties.splice(1, 0,
      "Develop and maintain client relationships",
      "Achieve sales targets and objectives",
      "Identify new business opportunities"
    );
  }

  return genericDuties.slice(0, 10); // Return up to 10 duties
}