import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";



const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface QuestionGenerationParams {
  interviewType: 'behavioral' | 'mcq' | 'coding' | 'combo';
  jobTitle: string;
  jobDescription?: string;
  companyName?: string;
  difficultyLevel?: string;
  numberOfQuestions: number;
  candidateName?: string;
}

/**
 * AI Fallback Question Generation for Campaign Interviews
 * This endpoint generates questions when question bank is unavailable
 * Uses campaign details and interview setup configuration
 */
export async function POST(request: NextRequest) {
  try {
    const params: QuestionGenerationParams = await request.json();
    
    const {
      interviewType,
      jobTitle,
      jobDescription = '',
      companyName = 'the company',
      difficultyLevel = 'medium',
      numberOfQuestions,
      candidateName = 'the candidate'
    } = params;

    console.log(`🤖 Generating ${numberOfQuestions} ${interviewType} questions using AI fallback for ${jobTitle}`);

    let prompt: string;
    let systemMessage: string;

    switch (interviewType.toLowerCase()) {
      case 'behavioral':
        systemMessage = "You are an expert HR interviewer who creates insightful behavioral questions that assess soft skills and job-specific competencies.";
        prompt = `Generate exactly ${numberOfQuestions} behavioral interview questions for a ${jobTitle} position at ${companyName}.

Job Description: ${jobDescription}
Difficulty Level: ${difficultyLevel}
Candidate: ${candidateName}

Requirements:
1. Return ONLY a valid JSON array
2. Each question should assess relevant skills for ${jobTitle}
3. Mix of situational, competency-based, and experience questions
4. Include expected answer guidelines for interviewers

Format each question as:
{
  "id": "unique_id",
  "question": "Question text",
  "expectedAnswer": "What to look for in the answer",
  "sampleAnswer": "Example of a good response",
            "questionType": "behavioral",
  "category": "relevant category (e.g., leadership, problem-solving, communication)",
  "difficultyLevel": "${difficultyLevel}"
}

Generate ${numberOfQuestions} questions now:`;
        break;

      case 'mcq':
        systemMessage = "You are a technical assessment expert who creates high-quality multiple choice questions that accurately test job-relevant knowledge and skills.";
        prompt = `Generate exactly ${numberOfQuestions} multiple choice questions for a ${jobTitle} role.

Job Description: ${jobDescription}
Difficulty Level: ${difficultyLevel}
Company: ${companyName}

Requirements:
1. Return ONLY a valid JSON array
2. Each question must have exactly 4 options
3. Only one correct answer per question
4. Include clear explanations
5. Focus on job-relevant technical and conceptual knowledge

Format each question as:
{
  "id": "unique_id",
  "question": "Question text",
  "questionType": "mcq",
  "category": "relevant category",
  "difficultyLevel": "${difficultyLevel}",
  "options": [
    {"id": "option1", "text": "Option 1", "isCorrect": false},
    {"id": "option2", "text": "Option 2", "isCorrect": true},
    {"id": "option3", "text": "Option 3", "isCorrect": false},
    {"id": "option4", "text": "Option 4", "isCorrect": false}
  ],
  "correctAnswer": "Correct answer text",
  "explanation": "Why this answer is correct"
}

Generate ${numberOfQuestions} questions now:`;
        break;

      case 'coding':
        systemMessage = "You are a senior software engineer who creates practical coding challenges that test real-world programming skills relevant to the job role.";
        prompt = `Generate exactly ${numberOfQuestions} coding questions for a ${jobTitle} position.

Job Description: ${jobDescription}
Difficulty Level: ${difficultyLevel}
Company: ${companyName}

Requirements:
1. Return ONLY a valid JSON array
2. Include problem statement, solution approach, and example code
3. Questions should be relevant to ${jobTitle} responsibilities
4. Vary complexity based on ${difficultyLevel} level

Format each question as:
{
  "id": "unique_id",
  "question": "Problem statement with clear requirements",
  "expectedAnswer": "Solution approach and key concepts to evaluate",
  "sampleAnswer": "Example solution with code if applicable",
  "questionType": "coding",
  "category": "relevant category (e.g., algorithms, data structures, system design)",
  "difficultyLevel": "${difficultyLevel}"
}

Generate ${numberOfQuestions} questions now:`;
        break;

      case 'combo':
        systemMessage = "You are a comprehensive interviewer who creates a balanced mix of behavioral, coding, and MCQ questions for thorough candidate assessment.";
        const behavioralCount = Math.ceil(numberOfQuestions * 0.4);
        const codingCount = Math.ceil(numberOfQuestions * 0.3);
        const mcqCount = numberOfQuestions - behavioralCount - codingCount;
        
        prompt = `Generate exactly ${numberOfQuestions} interview questions for a ${jobTitle} position (${behavioralCount} behavioral, ${codingCount} coding, ${mcqCount} MCQ).

Job Description: ${jobDescription}
Difficulty Level: ${difficultyLevel}
Company: ${companyName}

Requirements:
1. Return ONLY a valid JSON array
2. Mix of question types for comprehensive assessment
3. All questions relevant to ${jobTitle} role

Use the same format as previous examples, varying the questionType field appropriately.

Generate ${numberOfQuestions} questions now:`;
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported interview type: ${interviewType}. Supported types: behavioral, mcq, coding, combo` },
          { status: 400 }
        );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let responseText = completion.choices[0].message.content?.trim() || "";
    
    // Clean up response
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    // Extract JSON array
    const jsonStart = responseText.indexOf("[");
    const jsonEnd = responseText.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    const questions = JSON.parse(responseText);
    
    if (!Array.isArray(questions)) {
      throw new Error("AI response is not a valid JSON array");
    }

    // Ensure each question matches the database schema exactly
    const validatedQuestions = questions.map((q, index) => ({
      // Core fields (matching questions table schema)
      id: q.id || `ai_generated_${Date.now()}_${index}`,
      questionType: q.questionType || interviewType,
      question: q.question || `Generated question ${index + 1}`,
      
      // Answer fields
      expectedAnswer: q.expectedAnswer || "Evaluate based on relevance and depth of response",
      sampleAnswer: q.sampleAnswer || "Look for specific examples and clear reasoning",
      correctAnswer: q.correctAnswer || null,
      explanation: q.explanation || null,
      
      // MCQ specific - map options to multipleChoiceOptions (matching schema)
      multipleChoiceOptions: q.options ? JSON.stringify(q.options) : null,
      
      // Categorization
      category: q.category || "General",
      difficultyLevel: q.difficultyLevel || difficultyLevel,
      
      // Metadata
      aiGenerated: true, // Mark as AI generated
      isActive: true,
      tags: null,
      skills: null,
      competencies: null,
      timeToAnswer: null,
      usageCount: 0,
      averageScore: null,
      revisionNumber: 1
    }));

    console.log(`✅ Successfully generated ${validatedQuestions.length} questions using AI`);

    return NextResponse.json({
      success: true,
      questions: validatedQuestions,
      source: 'ai_fallback',
      metadata: {
        interviewType,
        jobTitle,
        companyName,
        difficultyLevel,
        numberOfQuestions: validatedQuestions.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ AI question generation failed:', error);
    
    return NextResponse.json({
      success: false,
      questions: [],
      source: 'ai_fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Fallback Question Generator API",
    description: "Generates interview questions when question bank is unavailable",
    supportedTypes: ["behavioral", "mcq", "coding", "combo"],
    endpoints: {
      POST: "Generate fallback questions for campaign interviews"
    },
    dataSource: {
      "jobTitle": "From job campaign",
      "companyName": "From company details", 
      "interviewType": "From interview setup",
      "difficultyLevel": "From interview setup (when job campaign interview setup was created)",
      "numberOfQuestions": "From interview setup (when job campaign interview setup was created)",
      "jobDescription": "From job campaign (if available)",
      "candidateName": "From candidate details"
    },
    requiredParams: [
      "interviewType (behavioral|mcq|coding|combo)",
      "jobTitle (string)",
      "numberOfQuestions (number)"
    ],
    optionalParams: [
      "jobDescription (string)",
      "companyName (string)", 
      "difficultyLevel (string)",
      "candidateName (string)"
    ]
  });
}