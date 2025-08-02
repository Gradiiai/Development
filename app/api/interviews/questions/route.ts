import { NextRequest, NextResponse } from 'next/server';
import { generateJSONWithOpenAI } from '@/lib/integrations/ai/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

// OpenAI configuration is handled in the openai-config utility

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const jobPosition = formData.get("jobPosition") as string;
    const jobDescription = formData.get("jobDescription") as string;
    const yearsOfExperience = formData.get("yearsOfExperience") as string;
    const resumeText = formData.get("resumeText") as string;

    if (!jobPosition || !jobDescription) {
      return NextResponse.json(
        { error: "Job position and description are required" },
        { status: 400 }
      );
    }

    // Using OpenAI instead of Gemini chat session

    const prompt = `
Generate 5 interview questions for a ${jobPosition} role:
- Job Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}

Requirements:
1. Create unique, role-specific questions
2. Include mix of technical and behavioral questions
3. Format strictly as JSON array with 'Question' and 'Answer' keys
4. Answers should demonstrate professional insight
`;

    const responseText = await generateJSONWithOpenAI(prompt);

    return NextResponse.json({
      questions: responseText,
      metadata: {
        jobPosition,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Interview Question Generator API",
    endpoints: {
      POST: "Generate custom interview questions",
      requiredParams: [
        "jobPosition (required)",
        "jobDescription (required)",
        "yearsOfExperience (optional)",
        "resumeText (optional)",
      ],
    },
  });
}
