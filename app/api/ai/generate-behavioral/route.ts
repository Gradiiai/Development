import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey });
const MODEL = "gpt-4o-mini"; // Or "gpt-4o-mini" if available and whitelisted

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check if this is topic-based (question bank) or job-based (standalone interview)
    const topic = formData.get("topic") as string;
    const jobPosition = formData.get("jobPosition") as string;
    const jobDescription = formData.get("jobDescription") as string;
    const yearsOfExperience = formData.get("yearsOfExperience") as string;
    const resumeText = formData.get("resumeText") as string;
    const totalQuestions = parseInt(formData.get("totalQuestions") as string) || (topic ? 3 : 5);

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = `Generate exactly ${totalQuestions} behavioral interview questions related to the topic: "${topic}".

For each question, provide the following:
1. Question text
2. Purpose of the question
3. Key points to look for in answers
4. Follow-up questions
5. Difficulty level
6. Category
7. Tips for candidates

Format the response as a JSON array:
[
  {
    "question": "Tell me about a time when...",
    "purpose": "To assess leadership and problem-solving skills",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "followUpQuestions": ["Follow-up 1", "Follow-up 2"],
    "difficulty": "Easy | Medium | Hard",
    "category": "Leadership | Teamwork | Problem-solving | Communication",
    "tips": "Tips for answering this question effectively"
  }
]

Generate ${totalQuestions} questions now:`;
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation
      prompt = `Generate exactly ${totalQuestions} behavioral interview questions for a ${jobPosition} role:
- Job Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}

Requirements:
1. Create unique, role-specific behavioral questions
2. Focus on past experiences, problem-solving, and interpersonal skills
3. Format strictly as JSON array with each object having 'Question', 'Answer', and 'type': 'behavioral' fields
4. Answers should provide guidance on what to look for in responses
5. Avoid STAR method references - focus on direct, conversational questions

Example:
[
  {
    "Question": "How do you handle working under tight deadlines?",
    "Answer": "Look for examples of prioritization, time management, stress handling, and communication with stakeholders.",
    "type": "behavioral"
  },
  {
    "Question": "Describe a time you disagreed with a colleague. How did you handle it?",
    "Answer": "Assess communication skills, empathy, active listening, conflict resolution, and ability to find common ground.",
    "type": "behavioral"
  }
]
Generate the list now:`;
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

    // Clean up formatting if wrapped in Markdown
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json\s*/, "").replace(/```\s*$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/```\s*/, "").replace(/```\s*$/, "");
    }

    const jsonStart = responseText.indexOf("[");
    const jsonEnd = responseText.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    // Parse and validate
    let parsed;
    try {
      parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
      
      for (const q of parsed) {
        if (topic) {
          // Question bank format validation
          if (!q.question || !q.purpose) {
            throw new Error("Invalid question bank format");
          }
        } else {
          // Standalone interview format validation
          if (!q.Question || !q.Answer) {
            throw new Error("Invalid question structure");
          }
        }
      }
    } catch (err) {
      console.error("Parsing error:", err);
      return NextResponse.json(
        { error: "Malformed AI response, couldn't parse questions" },
        { status: 500 }
      );
    }

    if (topic) {
      // Question bank response format
      return new NextResponse(JSON.stringify(parsed), {
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
          "Keep-Alive": "timeout=60",
        },
      });
    } else {
      // Standalone interview response format
      return NextResponse.json({
        questions: parsed,
        metadata: {
          jobPosition,
          generatedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Interview Question Generator API (OpenAI GPT-4o)",
    endpoints: {
      POST: "Generate 5 custom interview questions",
      requiredParams: [
        "jobPosition (required)",
        "jobDescription (required)",
        "yearsOfExperience (optional)",
        "resumeText (optional)",
      ],
    },
  });
}