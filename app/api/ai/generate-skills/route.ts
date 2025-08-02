import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { generateJSONWithOpenAI } from '@/lib/integrations/ai/openai';



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

    const { jobRole, industry, experienceLevel, skillType, count } = await req.json();

    if (!jobRole) {
      return NextResponse.json(
        { error: 'Job role is required' },
        { status: 400 }
      );
    }

    const skillCount = count || 10;
    const type = skillType || 'all';

    // Generate AI-powered skills
    const prompt = `Generate ${skillCount} relevant skills for the following position:

Job Role: ${jobRole}
${industry ? `Industry: ${industry}` : ''}
${experienceLevel ? `Experience Level: ${experienceLevel}` : ''}
${skillType && skillType !== 'all' ? `Focus on: ${skillType} skills` : ''}

Generate skills that are:
1. Relevant to the job role and industry
2. Appropriate for the experience level
3. Mix of technical and soft skills (unless specific type requested)
4. Include importance rating (1-5, where 5 is most critical)
5. Include proficiency level expected (Beginner, Intermediate, Advanced, Expert)
6. Include category (Technical, Soft, Industry-Specific, Tools, Certifications)

${skillType === 'technical' ? 'Focus only on technical/hard skills like programming languages, frameworks, tools, methodologies.' : ''}
${skillType === 'soft' ? 'Focus only on soft/interpersonal skills like communication, leadership, teamwork, problem-solving.' : ''}
${skillType === 'tools' ? 'Focus only on tools, software, platforms, and technologies.' : ''}
${skillType === 'certifications' ? 'Focus only on relevant certifications and qualifications.' : ''}

Format as JSON with this structure:
{
  "skills": [
    {
      "name": "Skill name",
      "category": "Technical|Soft|Industry-Specific|Tools|Certifications",
      "importance": 5,
      "proficiency": "Advanced",
      "description": "Brief description of what this skill involves",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],
  "metadata": {
    "jobRole": "${jobRole}",
    "industry": "${industry || 'General'}",
    "experienceLevel": "${experienceLevel || 'Mid-level'}",
    "skillType": "${type}",
    "totalCount": ${skillCount},
    "averageImportance": 0
  }
}

Provide exactly ${skillCount} skills. Calculate averageImportance based on the generated skills.`;

    const expectedFormat = {
      skills: [{
        name: "string",
        category: "string",
        importance: "number",
        proficiency: "string",
        description: "string",
        keywords: ["string"]
      }],
      metadata: {
        jobRole: "string",
        industry: "string",
        experienceLevel: "string",
        skillType: "string",
        totalCount: "number",
        averageImportance: "number"
      }
    };

    const resultString = await generateJSONWithOpenAI(prompt);
    
    if (!resultString) {
      // Fallback to template-based skills
      const fallbackSkills = generateFallbackSkills(jobRole, industry, experienceLevel, skillType, skillCount);
      return NextResponse.json({
        success: true,
        data: fallbackSkills,
        generated: 'fallback'
      });
    }

    let result;
    try {
      result = JSON.parse(resultString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      const fallbackSkills = generateFallbackSkills(jobRole, industry, experienceLevel, skillType, skillCount);
      return NextResponse.json({
        success: true,
        data: fallbackSkills,
        generated: 'fallback'
      });
    }

    if (!result || !result.skills || !Array.isArray(result.skills)) {
      // Fallback to template-based skills
      const fallbackSkills = generateFallbackSkills(jobRole, industry, experienceLevel, skillType, skillCount);
      return NextResponse.json({
        success: true,
        data: fallbackSkills,
        generated: 'fallback'
      });
    }

    // Calculate average importance if not provided
    if (result.skills.length > 0) {
      const avgImportance = result.skills.reduce((sum: number, skill: any) => sum + (skill.importance || 3), 0) / result.skills.length;
      result.metadata.averageImportance = Math.round(avgImportance * 10) / 10;
      result.metadata.totalCount = result.skills.length;
    }

    return NextResponse.json({
      success: true,
      data: result,
      generated: 'ai'
    });

  } catch (error) {
    console.error('Error generating skills:', error);
    
    // Fallback to template-based skills
    try {
      const { jobRole, industry, experienceLevel, skillType, count } = await req.json();
      const fallbackSkills = generateFallbackSkills(jobRole, industry, experienceLevel, skillType, count || 10);
      
      return NextResponse.json({
        success: true,
        data: fallbackSkills,
        generated: 'fallback'
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate skills' },
        { status: 500 }
      );
    }
  }
}

function generateFallbackSkills(jobRole: string, industry?: string, experienceLevel?: string, skillType?: string, count: number = 10) {
  const baseRole = jobRole.toLowerCase();
  const level = experienceLevel || 'Mid-level';
  const sector = industry || 'General';
  const type = skillType || 'all';

  // Base skill pools
  const technicalSkills = [
    {
      name: "Problem Solving",
      category: "Technical",
      importance: 5,
      proficiency: "Advanced",
      description: "Ability to analyze complex problems and develop effective solutions",
      keywords: ["analysis", "debugging", "troubleshooting"]
    },
    {
      name: "Data Analysis",
      category: "Technical",
      importance: 4,
      proficiency: "Intermediate",
      description: "Interpreting and analyzing data to make informed decisions",
      keywords: ["statistics", "metrics", "reporting"]
    },
    {
      name: "System Design",
      category: "Technical",
      importance: 4,
      proficiency: "Intermediate",
      description: "Designing scalable and efficient systems and architectures",
      keywords: ["architecture", "scalability", "design patterns"]
    }
  ];

  const softSkills = [
    {
      name: "Communication",
      category: "Soft",
      importance: 5,
      proficiency: "Advanced",
      description: "Clear verbal and written communication with team members and stakeholders",
      keywords: ["presentation", "documentation", "collaboration"]
    },
    {
      name: "Teamwork",
      category: "Soft",
      importance: 4,
      proficiency: "Advanced",
      description: "Collaborating effectively with diverse teams",
      keywords: ["collaboration", "cooperation", "team dynamics"]
    },
    {
      name: "Time Management",
      category: "Soft",
      importance: 4,
      proficiency: "Intermediate",
      description: "Prioritizing tasks and managing deadlines effectively",
      keywords: ["prioritization", "scheduling", "productivity"]
    },
    {
      name: "Leadership",
      category: "Soft",
      importance: 4,
      proficiency: "Intermediate",
      description: "Leading and motivating teams to achieve goals",
      keywords: ["mentoring", "guidance", "motivation"]
    },
    {
      name: "Adaptability",
      category: "Soft",
      importance: 4,
      proficiency: "Intermediate",
      description: "Adjusting to changing requirements and environments",
      keywords: ["flexibility", "change management", "resilience"]
    }
  ];

  const toolSkills = [
    {
      name: "Microsoft Office Suite",
      category: "Tools",
      importance: 3,
      proficiency: "Intermediate",
      description: "Proficiency in Word, Excel, PowerPoint for documentation and presentations",
      keywords: ["excel", "powerpoint", "word"]
    },
    {
      name: "Project Management Tools",
      category: "Tools",
      importance: 3,
      proficiency: "Beginner",
      description: "Using tools like Jira, Trello, or Asana for project tracking",
      keywords: ["jira", "trello", "asana"]
    },
    {
      name: "Version Control (Git)",
      category: "Tools",
      importance: 4,
      proficiency: "Intermediate",
      description: "Managing code versions and collaboration through Git",
      keywords: ["git", "github", "version control"]
    }
  ];

  const industrySkills = [
    {
      name: `${sector} Domain Knowledge`,
      category: "Industry-Specific",
      importance: 4,
      proficiency: "Intermediate",
      description: `Understanding of ${sector} industry practices and standards`,
      keywords: [sector.toLowerCase(), "domain", "industry"]
    }
  ];

  const certificationSkills = [
    {
      name: "Professional Certification",
      category: "Certifications",
      importance: 3,
      proficiency: "Certified",
      description: "Relevant professional certification for the role",
      keywords: ["certification", "qualification", "credential"]
    }
  ];

  // Add role-specific skills
  if (baseRole.includes('developer') || baseRole.includes('engineer')) {
    technicalSkills.push(
      {
        name: "Programming Languages",
        category: "Technical",
        importance: 5,
        proficiency: "Advanced",
        description: "Proficiency in relevant programming languages for the role",
        keywords: ["coding", "programming", "development"]
      },
      {
        name: "Software Architecture",
        category: "Technical",
        importance: 4,
        proficiency: "Intermediate",
        description: "Understanding of software design patterns and architecture principles",
        keywords: ["architecture", "design patterns", "software design"]
      }
    );
    toolSkills.push(
      {
        name: "IDE/Code Editors",
        category: "Tools",
        importance: 4,
        proficiency: "Advanced",
        description: "Proficiency in development environments and code editors",
        keywords: ["ide", "vscode", "development environment"]
      }
    );
  }

  // Select skills based on type filter
  let availableSkills = [];
  if (type === 'technical') {
    availableSkills = technicalSkills;
  } else if (type === 'soft') {
    availableSkills = softSkills;
  } else if (type === 'tools') {
    availableSkills = toolSkills;
  } else if (type === 'certifications') {
    availableSkills = certificationSkills;
  } else if (type === 'industry') {
    availableSkills = industrySkills;
  } else {
    // Mix of all types
    availableSkills = [
      ...technicalSkills,
      ...softSkills,
      ...toolSkills,
      ...industrySkills,
      ...certificationSkills
    ];
  }

  // Select requested number of skills
  const selectedSkills = availableSkills.slice(0, Math.min(count, availableSkills.length));
  
  // If we need more skills, duplicate and modify some
  while (selectedSkills.length < count && availableSkills.length > 0) {
    const baseSkill = availableSkills[selectedSkills.length % availableSkills.length];
    const modifiedSkill = {
      ...baseSkill,
      name: `Advanced ${baseSkill.name}`,
      proficiency: "Expert",
      importance: Math.min(baseSkill.importance + 1, 5)
    };
    selectedSkills.push(modifiedSkill);
  }

  const avgImportance = selectedSkills.length > 0 
    ? Math.round((selectedSkills.reduce((sum, skill) => sum + skill.importance, 0) / selectedSkills.length) * 10) / 10
    : 0;

  return {
    skills: selectedSkills,
    metadata: {
      jobRole,
      industry: sector,
      experienceLevel: level,
      skillType: type,
      totalCount: selectedSkills.length,
      averageImportance: avgImportance
    }
  };
}