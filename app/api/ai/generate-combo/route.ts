import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey });
const MODEL = "gpt-4o"; // or "gpt-4o-mini" if available in your tier

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check if this is topic-based (question bank) or job-based (standalone interview)
    const topic = formData.get("topic") as string;
    const jobPosition = formData.get("jobPosition") as string;
    const jobDescription = formData.get("jobDescription") as string;
    const yearsOfExperience = formData.get("yearsOfExperience") as string;
    const resumeText = formData.get("resumeText") as string;
    const codingQuestions = parseInt(formData.get("coding") as string) || 2;
    const behavioralQuestions = parseInt(formData.get("behavioral") as string) || 2;
    const mcqQuestions = parseInt(formData.get("mcq") as string) || 2;

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = `Generate a combination of interview questions related to the topic: "${topic}".

Generate exactly:
- ${codingQuestions} coding questions
- ${behavioralQuestions} behavioral questions  
- ${mcqQuestions} multiple-choice questions

Format the response as a JSON object with three arrays:
{
  "coding": [
    {
      "title": "Question title",
    "description": "Problem description",
    "examples": [{"input": "example input", "output": "expected output", "explanation": "why this output"}],
    "difficulty": "Easy | Medium | Hard",
    "constraints": ["constraint 1", "constraint 2"],
    "hints": ["hint 1", "hint 2"],
    "solutions": {
      "javascript": "function solution() {\n    // Complete solution with proper code formatting\n}",
      "python": "def solution():\n    # Complete solution with proper code formatting\n    pass",
      "typescript": "function solution(): any {\n    // Complete solution with proper code formatting\n}"
      }
         "explanation": "Detailed explanation of the solution approach"
    }
  ],
  "behavioral": [
    {
      "question": "Tell me about a time when...",
      "purpose": "To assess specific skills",
      "keyPoints": ["Point 1", "Point 2"],
      "followUpQuestions": ["Follow-up 1"],
      "difficulty": "Easy | Medium | Hard",
      "category": "Leadership | Teamwork | Problem-solving",
      "tips": "Tips for answering"
    }
  ],
  "mcq": [
    {
      "question": "Question text?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct",
      "difficulty": "Easy | Medium | Hard",
      "category": "Technical category",
      "timeEstimate": "2 minutes"
    }
  ]
}

Generate the questions now:`;
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation
      prompt = `Generate a comprehensive interview question set for a ${jobPosition} role:
- Job Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}

Generate exactly:
- ${codingQuestions} coding questions
- ${behavioralQuestions} behavioral questions
- ${mcqQuestions} multiple-choice questions

Format as JSON object with three arrays, each containing questions with 'Question', 'Answer', and 'type' fields:
{
  "coding": [
    {
      "Question": "Write a function to...",
      "Answer": "Detailed solution with code examples",
      "type": "coding"
    }
  ],
  "behavioral": [
    {
      "Question": "Tell me about a time when...",
      "Answer": "Look for specific examples, problem-solving approach, and outcomes achieved",
      "type": "behavioral"
    }
  ],
  "mcq": [
    {
      "Question": "Which of the following...?",
      "Answer": "Correct option with explanation",
      "type": "mcq"
    }
  ]
}

Generate the questions now:`;
    } else {
      return NextResponse.json(
        { error: "Either 'topic' (for question bank) or 'jobPosition' and 'jobDescription' (for standalone interview) are required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    let responseText = completion.choices[0].message.content?.trim() || "";

    // Clean up
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    try {
      let parsedResponse = JSON.parse(responseText);
      
      if (topic) {
        // Question bank mode - return the structured response directly
        return new NextResponse(JSON.stringify(parsedResponse), {
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
            "Keep-Alive": "timeout=60",
          },
        });
      } else {
        // Standalone interview mode - flatten the response
        let allQuestions = [];
        
        if (parsedResponse.coding) {
          allQuestions.push(...parsedResponse.coding);
        }
        if (parsedResponse.behavioral) {
          allQuestions.push(...parsedResponse.behavioral);
        }
        if (parsedResponse.mcq) {
          allQuestions.push(...parsedResponse.mcq);
        }

        return NextResponse.json({
          questions: allQuestions,
          metadata: {
            jobPosition,
            totalQuestions: allQuestions.length,
            distribution: {
              behavioral: behavioralQuestions,
              mcq: mcqQuestions,
              coding: codingQuestions,
            },
            generatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.error("JSON parsing error:", err);
      return NextResponse.json(
        { error: "Failed to parse valid interview questions from OpenAI." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Failed to generate combo interview questions." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Combo Interview Question Generator API (OpenAI GPT-4o)",
    endpoints: {
      POST: "Generate mixed interview questions (behavioral, MCQ, coding)",
      requiredParams: [
        "jobPosition (required)",
        "jobDescription (required)",
        "yearsOfExperience (optional)",
        "resumeText (optional)",
        "questionTypes (optional, default: 'behavioral,mcq,coding')",
        "totalQuestions (optional, default: 8)",
        "behavioralCount (optional, for combo interviews)",
        "mcqCount (optional, for combo interviews)",
        "codingCount (optional, for combo interviews)",
      ],
    },
  });
}
