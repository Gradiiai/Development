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

    // Generate AI-powered skills with improved prompt for concise, real-world skills
    const prompt = `Generate ${skillCount} relevant, concise skills for the following position:

Job Role: ${jobRole}
${industry ? `Industry: ${industry}` : ''}
${experienceLevel ? `Experience Level: ${experienceLevel}` : ''}
${skillType && skillType !== 'all' ? `Focus on: ${skillType} skills` : ''}

IMPORTANT REQUIREMENTS:
1. Skills must be SHORT (1-2 words maximum)
2. Skills must be REAL-WORLD, commonly recognized skills
3. Use proper names for technologies (e.g., "React", "Python", "AWS")
4. Avoid generic phrases or long descriptions
5. Focus on specific, actionable skills

EXAMPLES OF GOOD SKILLS:
- Technical: "React", "Python", "AWS", "Docker", "SQL", "Git", "Node.js"
- Design: "Figma", "Photoshop", "UI Design", "UX Research"
- Soft: "Leadership", "Communication", "Teamwork"
- Tools: "Jira", "Slack", "Excel", "Tableau"

EXAMPLES OF BAD SKILLS (DO NOT USE):
- "Ability to work in fast-paced environments"
- "Strong problem-solving and analytical thinking"
- "Experience with modern development practices"
- "Understanding of software development lifecycle"

${skillType === 'technical' ? 'Focus only on specific technologies, programming languages, frameworks, and technical tools.' : ''}
${skillType === 'soft' ? 'Focus only on concise soft skills like "Leadership", "Communication", "Teamwork".' : ''}
${skillType === 'tools' ? 'Focus only on specific software, platforms, and tools with their proper names.' : ''}
${skillType === 'certifications' ? 'Focus only on specific, well-known certifications.' : ''}

Format as JSON with this structure:
{
  "skills": [
    {
      "name": "Skill name (1-2 words max)",
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

    // Validate and filter skills
    const validatedSkills = validateAndFilterSkills(result.skills);
    result.skills = validatedSkills;

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

// Validation function to filter out invalid skills
function validateAndFilterSkills(skills: any[]): any[] {
  const invalidPatterns = [
    /ability to/i,
    /experience with/i,
    /understanding of/i,
    /knowledge of/i,
    /strong.*skills?/i,
    /excellent/i,
    /proficiency in/i,
    /working with/i,
    /familiarity with/i,
    /background in/i
  ];

  const maxWordCount = 3; // Allow up to 3 words for compound skills like "UI Design"
  const minLength = 2; // Minimum 2 characters
  const maxLength = 25; // Maximum 25 characters

  return skills.filter(skill => {
    if (!skill || !skill.name || typeof skill.name !== 'string') {
      return false;
    }

    const skillName = skill.name.trim();
    
    // Check length constraints
    if (skillName.length < minLength || skillName.length > maxLength) {
      return false;
    }

    // Check word count
    const wordCount = skillName.split(/\s+/).length;
    if (wordCount > maxWordCount) {
      return false;
    }

    // Check for invalid patterns
    const hasInvalidPattern = invalidPatterns.some(pattern => pattern.test(skillName));
    if (hasInvalidPattern) {
      return false;
    }

    // Check for overly generic terms
    const genericTerms = [
      'skills', 'abilities', 'experience', 'knowledge', 'understanding',
      'proficiency', 'expertise', 'competency', 'capability'
    ];
    const lowerSkillName = skillName.toLowerCase();
    const hasGenericTerm = genericTerms.some(term => lowerSkillName.includes(term));
    if (hasGenericTerm) {
      return false;
    }

    return true;
  });
}

function generateFallbackSkills(jobRole: string, industry?: string, experienceLevel?: string, skillType?: string, count: number = 10) {
  const baseRole = jobRole.toLowerCase();
  const level = experienceLevel || 'Mid-level';
  const sector = industry || 'General';
  const type = skillType || 'all';

  // Base skill pools with concise, real-world skills
  const technicalSkills = [
    {
      name: "Python",
      category: "Technical",
      importance: 5,
      proficiency: "Advanced",
      description: "Python programming language",
      keywords: ["programming", "scripting", "development"]
    },
    {
      name: "JavaScript",
      category: "Technical",
      importance: 5,
      proficiency: "Advanced",
      description: "JavaScript programming language",
      keywords: ["frontend", "backend", "web development"]
    },
    {
      name: "React",
      category: "Technical",
      importance: 4,
      proficiency: "Intermediate",
      description: "React JavaScript library",
      keywords: ["frontend", "ui", "components"]
    },
    {
      name: "SQL",
      category: "Technical",
      importance: 4,
      proficiency: "Intermediate",
      description: "Structured Query Language for databases",
      keywords: ["database", "queries", "data"]
    },
    {
      name: "AWS",
      category: "Technical",
      importance: 4,
      proficiency: "Intermediate",
      description: "Amazon Web Services cloud platform",
      keywords: ["cloud", "infrastructure", "deployment"]
    }
  ];

  const softSkills = [
    {
      name: "Communication",
      category: "Soft",
      importance: 5,
      proficiency: "Advanced",
      description: "Effective verbal and written communication",
      keywords: ["presentation", "documentation", "collaboration"]
    },
    {
      name: "Teamwork",
      category: "Soft",
      importance: 4,
      proficiency: "Advanced",
      description: "Collaborative work with teams",
      keywords: ["collaboration", "cooperation", "team dynamics"]
    },
    {
      name: "Leadership",
      category: "Soft",
      importance: 4,
      proficiency: "Intermediate",
      description: "Leading and motivating teams",
      keywords: ["mentoring", "guidance", "motivation"]
    },
    {
      name: "Problem Solving",
      category: "Soft",
      importance: 5,
      proficiency: "Advanced",
      description: "Analytical thinking and solution development",
      keywords: ["analysis", "critical thinking", "troubleshooting"]
    },
    {
      name: "Adaptability",
      category: "Soft",
      importance: 4,
      proficiency: "Intermediate",
      description: "Flexibility in changing environments",
      keywords: ["flexibility", "change management", "resilience"]
    }
  ];

  const toolSkills = [
    {
      name: "Excel",
      category: "Tools",
      importance: 3,
      proficiency: "Intermediate",
      description: "Microsoft Excel spreadsheet software",
      keywords: ["spreadsheet", "data analysis", "formulas"]
    },
    {
      name: "Jira",
      category: "Tools",
      importance: 3,
      proficiency: "Beginner",
      description: "Project management and issue tracking",
      keywords: ["project management", "tickets", "agile"]
    },
    {
      name: "Git",
      category: "Tools",
      importance: 4,
      proficiency: "Intermediate",
      description: "Version control system",
      keywords: ["version control", "github", "collaboration"]
    },
    {
      name: "Docker",
      category: "Tools",
      importance: 4,
      proficiency: "Intermediate",
      description: "Containerization platform",
      keywords: ["containers", "deployment", "devops"]
    },
    {
      name: "Figma",
      category: "Tools",
      importance: 4,
      proficiency: "Advanced",
      description: "Design and prototyping tool",
      keywords: ["design", "ui", "prototyping"]
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
        name: "Node.js",
        category: "Technical",
        importance: 4,
        proficiency: "Advanced",
        description: "JavaScript runtime environment",
        keywords: ["backend", "server", "javascript"]
      },
      {
        name: "TypeScript",
        category: "Technical",
        importance: 4,
        proficiency: "Intermediate",
        description: "Typed JavaScript superset",
        keywords: ["javascript", "types", "development"]
      },
      {
        name: "REST APIs",
        category: "Technical",
        importance: 4,
        proficiency: "Advanced",
        description: "RESTful web services",
        keywords: ["api", "web services", "http"]
      }
    );
    toolSkills.push(
      {
        name: "VS Code",
        category: "Tools",
        importance: 4,
        proficiency: "Advanced",
        description: "Visual Studio Code editor",
        keywords: ["ide", "editor", "development"]
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