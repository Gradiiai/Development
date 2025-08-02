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

    const { jobRole, industry, experienceLevel, templateType } = await req.json();

    if (!jobRole) {
      return NextResponse.json(
        { error: 'Job role is required' },
        { status: 400 }
      );
    }

    // Generate AI-powered skill template
    const prompt = `Generate a comprehensive skill template for the following position:

Job Role: ${jobRole}
${industry ? `Industry: ${industry}` : ''}
${experienceLevel ? `Experience Level: ${experienceLevel}` : ''}
${templateType ? `Template Type: ${templateType}` : ''}

Create a detailed skill template that includes:
1. Technical skills (hard skills)
2. Soft skills (interpersonal skills)
3. Industry-specific skills
4. Tools and technologies
5. Certifications (if applicable)

For each skill category, provide:
- Skill name
- Importance level (1-5, where 5 is most important)
- Proficiency level expected (Beginner, Intermediate, Advanced, Expert)
- Description of what this skill entails

Format as JSON with this structure:
{
  "templateName": "${jobRole} Skill Template",
  "jobRole": "${jobRole}",
  "industry": "${industry || 'General'}",
  "experienceLevel": "${experienceLevel || 'Mid-level'}",
  "skillCategories": {
    "technical": [
      {
        "name": "Skill name",
        "importance": 5,
        "proficiency": "Advanced",
        "description": "What this skill involves"
      }
    ],
    "soft": [
      {
        "name": "Skill name",
        "importance": 4,
        "proficiency": "Intermediate",
        "description": "What this skill involves"
      }
    ],
    "industrySpecific": [
      {
        "name": "Skill name",
        "importance": 4,
        "proficiency": "Advanced",
        "description": "What this skill involves"
      }
    ],
    "tools": [
      {
        "name": "Tool/Technology name",
        "importance": 3,
        "proficiency": "Intermediate",
        "description": "What this tool is used for"
      }
    ],
    "certifications": [
      {
        "name": "Certification name",
        "importance": 3,
        "proficiency": "Certified",
        "description": "What this certification validates"
      }
    ]
  },
  "totalSkills": 0,
  "averageImportance": 0
}

Provide 5-8 skills per category where applicable. Calculate totalSkills and averageImportance based on the generated skills.`;

    const expectedFormat = {
      templateName: "string",
      jobRole: "string",
      industry: "string",
      experienceLevel: "string",
      skillCategories: {
        technical: [{
          name: "string",
          importance: "number",
          proficiency: "string",
          description: "string"
        }],
        soft: [{
          name: "string",
          importance: "number",
          proficiency: "string",
          description: "string"
        }],
        industrySpecific: [{
          name: "string",
          importance: "number",
          proficiency: "string",
          description: "string"
        }],
        tools: [{
          name: "string",
          importance: "number",
          proficiency: "string",
          description: "string"
        }],
        certifications: [{
          name: "string",
          importance: "number",
          proficiency: "string",
          description: "string"
        }]
      },
      totalSkills: "number",
      averageImportance: "number"
    };

    const resultString = await generateJSONWithOpenAI(prompt);
    
    if (!resultString) {
      // Fallback to template-based skill template
      const fallbackTemplate = generateFallbackSkillTemplate(jobRole, industry, experienceLevel);
      return NextResponse.json({
        success: true,
        template: fallbackTemplate,
        generated: 'fallback'
      });
    }

    let result;
    try {
      result = JSON.parse(resultString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      const fallbackTemplate = generateFallbackSkillTemplate(jobRole, industry, experienceLevel);
      return NextResponse.json({
        success: true,
        template: fallbackTemplate,
        generated: 'fallback'
      });
    }

    // Calculate totals if not provided by AI
    if (result.skillCategories) {
      const allSkills = [
        ...(result.skillCategories.technical || []),
        ...(result.skillCategories.soft || []),
        ...(result.skillCategories.industrySpecific || []),
        ...(result.skillCategories.tools || []),
        ...(result.skillCategories.certifications || [])
      ];
      
      result.totalSkills = allSkills.length;
      result.averageImportance = allSkills.length > 0 
        ? Math.round((allSkills.reduce((sum, skill) => sum + (skill.importance || 3), 0) / allSkills.length) * 10) / 10
        : 0;
    }

    return NextResponse.json({
      success: true,
      template: result,
      generated: 'ai'
    });

  } catch (error) {
    console.error('Error generating skill template:', error);
    
    // Fallback to template-based skill template
    try {
      const { jobRole, industry, experienceLevel } = await req.json();
      const fallbackTemplate = generateFallbackSkillTemplate(jobRole, industry, experienceLevel);
      
      return NextResponse.json({
        success: true,
        template: fallbackTemplate,
        generated: 'fallback'
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate skill template' },
        { status: 500 }
      );
    }
  }
}

function generateFallbackSkillTemplate(jobRole: string, industry?: string, experienceLevel?: string) {
  const baseRole = jobRole.toLowerCase();
  const level = experienceLevel || 'Mid-level';
  const sector = industry || 'General';

  // Base skills that apply to most roles
  const baseSkills = {
    technical: [
      {
        name: "Problem Solving",
        importance: 5,
        proficiency: "Advanced",
        description: "Ability to analyze complex problems and develop effective solutions"
      },
      {
        name: "Data Analysis",
        importance: 4,
        proficiency: "Intermediate",
        description: "Interpreting and analyzing data to make informed decisions"
      }
    ],
    soft: [
      {
        name: "Communication",
        importance: 5,
        proficiency: "Advanced",
        description: "Clear verbal and written communication with team members and stakeholders"
      },
      {
        name: "Teamwork",
        importance: 4,
        proficiency: "Advanced",
        description: "Collaborating effectively with diverse teams"
      },
      {
        name: "Time Management",
        importance: 4,
        proficiency: "Intermediate",
        description: "Prioritizing tasks and managing deadlines effectively"
      },
      {
        name: "Adaptability",
        importance: 4,
        proficiency: "Intermediate",
        description: "Adjusting to changing requirements and environments"
      }
    ],
    industrySpecific: [
      {
        name: `${sector} Domain Knowledge`,
        importance: 4,
        proficiency: "Intermediate",
        description: `Understanding of ${sector} industry practices and standards`
      }
    ],
    tools: [
      {
        name: "Microsoft Office Suite",
        importance: 3,
        proficiency: "Intermediate",
        description: "Proficiency in Word, Excel, PowerPoint for documentation and presentations"
      },
      {
        name: "Project Management Tools",
        importance: 3,
        proficiency: "Beginner",
        description: "Using tools like Jira, Trello, or Asana for project tracking"
      }
    ],
    certifications: []
  };

  // Add role-specific skills
  if (baseRole.includes('developer') || baseRole.includes('engineer')) {
    baseSkills.technical.push(
      {
        name: "Programming Languages",
        importance: 5,
        proficiency: "Advanced",
        description: "Proficiency in relevant programming languages for the role"
      },
      {
        name: "Software Architecture",
        importance: 4,
        proficiency: "Intermediate",
        description: "Understanding of software design patterns and architecture principles"
      }
    );
    baseSkills.tools.push(
      {
        name: "Version Control (Git)",
        importance: 5,
        proficiency: "Advanced",
        description: "Managing code versions and collaboration through Git"
      },
      {
        name: "IDE/Code Editors",
        importance: 4,
        proficiency: "Advanced",
        description: "Proficiency in development environments and code editors"
      }
    );
  } else if (baseRole.includes('manager') || baseRole.includes('lead')) {
    baseSkills.soft.push(
      {
        name: "Leadership",
        importance: 5,
        proficiency: "Advanced",
        description: "Leading and motivating teams to achieve goals"
      },
      {
        name: "Strategic Thinking",
        importance: 4,
        proficiency: "Advanced",
        description: "Developing long-term strategies and vision"
      }
    );
    baseSkills.technical.push(
      {
        name: "Budget Management",
        importance: 4,
        proficiency: "Intermediate",
        description: "Planning and managing project or department budgets"
      }
    );
  } else if (baseRole.includes('analyst')) {
    baseSkills.technical.push(
      {
        name: "Statistical Analysis",
        importance: 5,
        proficiency: "Advanced",
        description: "Applying statistical methods to analyze data and trends"
      },
      {
        name: "Report Writing",
        importance: 4,
        proficiency: "Advanced",
        description: "Creating comprehensive reports and documentation"
      }
    );
    baseSkills.tools.push(
      {
        name: "Data Visualization Tools",
        importance: 4,
        proficiency: "Intermediate",
        description: "Using tools like Tableau, Power BI for data visualization"
      }
    );
  }

  // Calculate totals
  const allSkills = [
    ...baseSkills.technical,
    ...baseSkills.soft,
    ...baseSkills.industrySpecific,
    ...baseSkills.tools,
    ...baseSkills.certifications
  ];

  return {
    templateName: `${jobRole} Skill Template`,
    jobRole,
    industry: sector,
    experienceLevel: level,
    skillCategories: baseSkills,
    totalSkills: allSkills.length,
    averageImportance: Math.round((allSkills.reduce((sum, skill) => sum + skill.importance, 0) / allSkills.length) * 10) / 10
  };
}