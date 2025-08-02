import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };

// AI Models configuration
export const AI_MODELS = {
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4O: 'gpt-4o',
} as const;

// Default configurations for different AI tasks
export const AI_CONFIGS = {
  RESUME_PARSING: {
    model: AI_MODELS.GPT_4O_MINI,
    maxTokens: 30000,
    temperature: 0.1, // Very low for consistent parsing
  },
  CONTENT_GENERATION: {
    model: AI_MODELS.GPT_4O_MINI,
    maxTokens: 20000,
    temperature: 0.7,
  },
  ANALYSIS: {
    model: AI_MODELS.GPT_4O_MINI,
    maxTokens: 15000,
    temperature: 0.3,
  },
  CREATIVE: {
    model: AI_MODELS.GPT_4O_MINI,
    maxTokens: 25000,
    temperature: 0.8,
  },
} as const;

// Helper function to generate content using OpenAI GPT-4 mini
export async function generateWithOpenAI(prompt: string, options?: {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}) {
  try {
    const response = await openai.chat.completions.create({
      model: options?.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate content with OpenAI');
  }
}

// Helper function for JSON responses
export async function generateJSONWithOpenAI(prompt: string, options?: {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}) {
  try {
    const response = await openai.chat.completions.create({
      model: options?.model || AI_CONFIGS.ANALYSIS.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],            
      max_tokens: options?.maxTokens || AI_CONFIGS.ANALYSIS.maxTokens,
      temperature: options?.temperature || AI_CONFIGS.ANALYSIS.temperature,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    // Return the string content instead of parsed JSON to fix trim() error
    return content;
  } catch (error) {
    console.error('OpenAI JSON API error:', error);
    throw new Error('Failed to generate JSON with OpenAI');
  }
}

// Advanced resume parsing with structured prompts
export async function parseResumeWithAdvancedAI(resumeText: string) {
  const systemPrompt = `You are an expert resume parser. Extract structured information from resumes with high accuracy. Always return valid JSON.`;
  
  const userPrompt = `Parse this resume and extract all relevant information into the following JSON structure:

{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State/Country",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "portfolio": "Portfolio URL"
  },
  "summary": "Professional summary or objective",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "description": "Job description and achievements",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree type",
      "field": "Field of study",
      "graduationYear": "YYYY",
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": {
    "technical": ["Programming languages, frameworks, tools"],
    "soft": ["Communication, leadership, etc."],
    "languages": ["English, Spanish, etc."],
    "frameworks": ["React, Angular, etc."],
    "tools": ["Git, Docker, etc."]
  },
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "date": "MM/YYYY",
      "expiryDate": "MM/YYYY or null"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"],
      "url": "Project URL if available"
    }
  ],
  "totalExperience": "Total years of experience as number"
}

Resume text:
${resumeText}

Extract all available information accurately. If information is not available, use null or empty arrays/strings as appropriate.`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIGS.RESUME_PARSING.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: AI_CONFIGS.RESUME_PARSING.maxTokens,
      temperature: AI_CONFIGS.RESUME_PARSING.temperature,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Advanced AI resume parsing failed:', error);
    throw new Error('Failed to parse resume with AI');
  }
}

// AI-powered CV scoring against job requirements
export async function calculateAICVScore(resumeData: any, jobRequirements: any) {
  const prompt = `Analyze this resume against the job requirements and provide a detailed scoring.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

Provide a JSON response with:
{
  "overallScore": "Score from 0-100",
  "breakdown": {
    "skillsMatch": "Score 0-100",
    "experienceMatch": "Score 0-100",
    "educationMatch": "Score 0-100",
    "culturalFit": "Score 0-100"
  },
  "strengths": ["List of candidate strengths"],
  "gaps": ["List of skill/experience gaps"],
  "recommendations": ["Recommendations for improvement"],
  "reasoning": "Detailed explanation of the scoring"
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.ANALYSIS);
  } catch (error) {
    console.error('AI CV scoring failed:', error);
    throw new Error('Failed to calculate CV score with AI');
  }
}

// Generate interview questions based on resume and job requirements
export async function generateInterviewQuestions(resumeData: any, jobRequirements: any, questionCount: number = 10) {
  const prompt = `Generate ${questionCount} tailored interview questions based on the candidate's resume and job requirements.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

Generate questions that:
1. Test technical skills mentioned in the resume
2. Explore experience gaps
3. Assess cultural fit
4. Validate achievements
5. Test problem-solving abilities

Return JSON:
{
  "questions": [
    {
      "question": "Interview question",
      "category": "technical|behavioral|situational|experience",
      "difficulty": "easy|medium|hard",
      "reasoning": "Why this question is relevant"
    }
  ]
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.CONTENT_GENERATION);
  } catch (error) {
    console.error('AI question generation failed:', error);
    throw new Error('Failed to generate interview questions with AI');
  }
}

// Analyze and improve job descriptions
export async function optimizeJobDescription(jobDescription: string, targetAudience?: string) {
  const prompt = `Analyze and improve this job description to make it more attractive and inclusive.

Current Job Description:
${jobDescription}

Target Audience: ${targetAudience || 'General tech professionals'}

Provide improvements in JSON format:
{
  "improvedDescription": "Enhanced job description",
  "suggestions": [
    {
      "category": "clarity|inclusivity|appeal|structure",
      "suggestion": "Specific improvement suggestion",
      "reasoning": "Why this improvement helps"
    }
  ],
  "keywordOptimization": ["SEO keywords to include"],
  "inclusivityScore": "Score 0-100 for inclusive language"
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.CONTENT_GENERATION);
  } catch (error) {
    console.error('Job description optimization failed:', error);
    throw new Error('Failed to optimize job description with AI');
  }
}

// Generate skill templates based on job category and requirements
export async function generateSkillTemplate(jobCategory: string, jobLevel: string, specificRequirements?: string) {
  const prompt = `Generate a comprehensive skill template for a ${jobLevel} level ${jobCategory} position.

${specificRequirements ? `Specific Requirements: ${specificRequirements}` : ''}

Provide a JSON response with:
{
  "templateName": "Suggested template name",
  "skills": [
    {
      "name": "Skill name",
      "level": "beginner|intermediate|advanced|expert",
      "category": "technical|soft|domain",
      "priority": "required|preferred|nice-to-have",
      "description": "Brief description of the skill"
    }
  ],
  "jobDuties": ["List of key job duties"],
  "recommendations": ["Suggestions for skill assessment"]
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.CONTENT_GENERATION);
  } catch (error) {
    console.error('Skill template generation failed:', error);
    throw new Error('Failed to generate skill template with AI');
  }
}

// Enhance question bank with AI-generated questions
export async function generateQuestionBankQuestions(category: string, difficultyLevel: string, questionType: string, count: number = 5) {
  const prompt = `Generate ${count} high-quality ${questionType} interview questions for ${category} with ${difficultyLevel} difficulty level.

For each question, provide:
{
  "questions": [
    {
      "question": "The interview question",
      "category": "${category}",
      "questionType": "${questionType}",
      "difficultyLevel": "${difficultyLevel}",
      "expectedAnswer": "Key points for a good answer",
      "sampleAnswer": "Example of a strong response",
      "scoringRubric": {
        "excellent": "Criteria for excellent response",
        "good": "Criteria for good response",
        "average": "Criteria for average response",
        "poor": "Criteria for poor response"
      },
      "tags": ["relevant", "tags"],
      "followUpQuestions": ["Potential follow-up questions"]
    }
  ]
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.CONTENT_GENERATION);
  } catch (error) {
    console.error('Question bank generation failed:', error);
    throw new Error('Failed to generate question bank questions with AI');
  }
}

// Analyze and improve existing questions
export async function enhanceQuestionQuality(question: string, category: string, difficultyLevel: string) {
  const prompt = `Analyze and improve this interview question to make it more effective and comprehensive.

Current Question: ${question}
Category: ${category}
Difficulty: ${difficultyLevel}

Provide improvements in JSON format:
{
  "improvedQuestion": "Enhanced version of the question",
  "suggestions": [
    {
      "type": "clarity|specificity|relevance|difficulty",
      "suggestion": "Specific improvement",
      "reasoning": "Why this improves the question"
    }
  ],
  "alternativeVersions": ["Alternative ways to ask the same question"],
  "assessmentTips": ["Tips for evaluating responses"]
}`;

  try {
    return await generateJSONWithOpenAI(prompt, AI_CONFIGS.ANALYSIS);
  } catch (error) {
    console.error('Question enhancement failed:', error);
    throw new Error('Failed to enhance question with AI');
  }
}