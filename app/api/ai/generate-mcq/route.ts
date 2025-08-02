import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import logger, { performanceMonitor } from "@/lib/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL_NAME = "gpt-4o"; // Use "gpt-4o" or "gpt-4o-mini" if whitelisted

// Support for both question bank (topic-based) and standalone interview (job-based) generation
export async function POST(request: NextRequest) {
  const monitor = performanceMonitor;
  monitor.start("mcq-question-generation");

  try {
    logger.apiRequest("POST", "/api/ai/generate-mcq");
    const formData = await request.formData();
    
    // Check if this is topic-based (question bank) or job-based (standalone interview)
    const topic = formData.get("topic") as string;
    const jobPosition = formData.get("jobPosition") as string;
    const jobDescription = formData.get("jobDescription") as string;
    const yearsOfExperience = formData.get("yearsOfExperience") as string;
    const resumeText = formData.get("resumeText") as string;
    const totalQuestions = parseInt(formData.get("totalQuestions") as string) || (topic ? 3 : 10);
    const difficulty = (formData.get("difficulty") as string) || "medium";

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = `Generate exactly ${totalQuestions} multiple choice questions related to the topic: "${topic}".

For each question, provide the following:
1. Question text
2. Four answer options (A, B, C, D)
3. Correct answer
4. Explanation for the correct answer
5. Explanation for why other options are incorrect
6. Difficulty level
7. Category/Subject area
8. Time estimate to answer

Format the response as a JSON array:
[
  {
    "question": "What is the main purpose of...",
    "options": [
      {
        "id": "A",
        "text": "Option A text",
        "isCorrect": false
      },
      {
        "id": "B",
        "text": "Option B text",
        "isCorrect": true
      },
      {
        "id": "C",
        "text": "Option C text",
        "isCorrect": false
      },
      {
        "id": "D",
        "text": "Option D text",
        "isCorrect": false
      }
    ],
    "correctAnswer": "B",
    "explanation": {
      "correct": "Explanation for why B is correct",
      "incorrect": {
        "A": "Why A is wrong",
        "C": "Why C is wrong",
        "D": "Why D is wrong"
      }
    },
    "difficulty": "Easy | Medium | Hard",
    "category": "Technical | Conceptual | Practical",
    "timeEstimate": "30 seconds | 1 minute | 2 minutes"
  }
]

Generate ${totalQuestions} questions now:`;
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation
      prompt = `Generate exactly ${totalQuestions} multiple choice questions for a ${jobPosition} role.

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no additional text.

Job Details:
- Position: ${jobPosition}
- Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}
- Difficulty: ${difficulty}

Requirements:
1. Generate ONLY MCQ questions with exactly 4 options each
2. Each question must have exactly one correct answer
3. Format strictly as JSON array
4. Each question must include: question, correctAnswer, type: "mcq", options array, explanation
5. Options should have id, text, and isCorrect fields
6. Ensure all strings are properly escaped for JSON

Example:
[{"question":"What is binary search complexity?","correctAnswer":"O(log n)","type":"mcq","options":[{"id":"option1","text":"O(n)","isCorrect":false},{"id":"option2","text":"O(log n)","isCorrect":true},{"id":"option3","text":"O(n²)","isCorrect":false},{"id":"option4","text":"O(1)","isCorrect":false}],"explanation":"Binary search divides search space in half each iteration."}]


Generate ${totalQuestions} questions now:`;
    } else {
      return NextResponse.json(
        { error: "Either 'topic' (for question bank) or 'jobPosition' and 'jobDescription' (for standalone interview) are required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "You are a multiple choice question generator bot that produces high-quality JSON-formatted technical and conceptual questions with clear, unambiguous answers.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let responseText = completion.choices[0].message.content?.trim() || "";

    // Clean up
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

    // Validate JSON structure
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(responseText);
      if (!Array.isArray(parsedQuestions)) throw new Error("Response is not a JSON array");

      for (const question of parsedQuestions) {
        if (topic) {
          // Question bank format validation
          if (!question.question || !question.options || !Array.isArray(question.options)) {
            throw new Error("Invalid question bank format");
          }
        } else {
          // Standalone interview format validation - check for all possible formats
          const hasQuestion = question.Question || question.question;
          const hasAnswer = question.Answer || question.answer || question.correctAnswer;
          if (!hasQuestion || !hasAnswer) {
            throw new Error("Invalid structure - missing question or answer");
          }
       }

        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error("Each MCQ must have exactly 4 options");
        }

        const correctOptions = question.options.filter((o: any) => o.isCorrect);
        if (correctOptions.length !== 1) {
          throw new Error("Exactly one correct answer is required per MCQ");
        }
      }
    } catch (parseError) {
      logger.error("JSON parsing failed", parseError as Error, {
        responseLength: responseText.length,
        firstChars: responseText.substring(0, 100),
        lastChars: responseText.substring(Math.max(0, responseText.length - 100)),
      });

      return NextResponse.json(
        { error: "Failed to generate valid MCQ questions. The AI response was malformed." },
        { status: 500 }
      );
    }

    const duration = monitor.end("mcq-question-generation", {
      mode: topic ? "question-bank" : "standalone-interview",
      topic: topic || undefined,
      jobPosition: jobPosition || undefined,
      totalQuestions,
      difficulty,
      success: true,
    });

    logger.apiResponse("POST", "/api/ai/generate-mcq", 200, {
      duration,
      questionsGenerated: parsedQuestions.length,
    });

    if (topic) {
      // Question bank response format
      return new NextResponse(JSON.stringify(parsedQuestions), {
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
          "Keep-Alive": "timeout=60",
        },
      });
    } else {
      // Standalone interview response format
      return NextResponse.json({
        questions: parsedQuestions,
        metadata: {
          jobPosition,
          questionType: "mcq",
          totalQuestions,
          difficulty,
          generatedAt: new Date().toISOString(),
          generationTime: duration,
        },
      });
    }
  } catch (error) {
    monitor.end("mcq-question-generation", {
      success: false,
      error: true,
    });

    logger.error("MCQ question generation failed", error as Error);
    logger.apiResponse("POST", "/api/ai/generate-mcq", 500);

    return NextResponse.json(
      { error: "Failed to generate MCQ questions" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "MCQ Question Generator API (OpenAI)",
    endpoints: {
      POST: "Generate MCQ questions for question bank or standalone interview",
      modes: {
        "question-bank": "Use 'topic' parameter for topic-based generation",
        "standalone-interview": "Use 'jobPosition' and 'jobDescription' for job-based generation"
      },
      requiredParams: {
        "question-bank": ["topic (required)"],
        "standalone-interview": ["jobPosition (required)", "jobDescription (required)"]
      },
      optionalParams: [
        "totalQuestions (default: 3 for question bank, 10 for standalone)",
        "difficulty (default: medium)",
        "yearsOfExperience (standalone only)",
        "resumeText (standalone only)"
      ],
    },
  });
}