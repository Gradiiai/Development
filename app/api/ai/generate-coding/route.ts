import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generatePrompt = (topic: string,totalQuestions:number): string => {

  return `
Generate "${totalQuestions}" coding questions related to the topic: "${topic}".

For each question, provide the following:
1. Title
2. Description
3. Examples (input, output, explanation)
4. Difficulty level
5. Constraints
6. Hints
7. Solution in Python, PHP, and TypeScript
8. Explanation of the solution

Format the response as a JSON array:
[
  {
    "title": "Question Title",
    "description": "Description of the problem",
    "examples": [
      {
        "input": "Example input",
        "output": "Expected output",
        "explanation": "Explanation of this example"
      }
    ],
    "difficulty": "Easy | Medium | Hard",
    "constraints": ["Constraint 1", "Constraint 2"],
    "hints": ["Hint 1", "Hint 2"],
    "solution": {
      "python": "Python code",
      "php": "PHP code",
      "typescript": "TypeScript code"
    },
    "explanation": "Explanation of how the solution works"
  }
]
`.trim();
};

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
    const difficulty = (formData.get("difficulty") as string) || "medium";

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = generatePrompt(topic,totalQuestions);
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation
      prompt = `Generate exactly ${totalQuestions} coding questions for a ${jobPosition} role.

Job Details:
- Position: ${jobPosition}
- Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}
- Difficulty: ${difficulty}

For each question, provide the following:
1. Title
2. Description
3. Examples (input, output, explanation)
4. Difficulty level
5. Constraints
6. Hints
7. Solution in Python, PHP, and TypeScript
8. Explanation of the solution
9. Question type: "coding"
10. Answer field with brief solution description

Format the response as a JSON array:
[
  {
    "Question": "Question Title",
    "Answer": "Brief solution description",
    "type": "coding",
    "title": "Question Title",
    "description": "Description of the problem",
    "examples": [
      {
        "input": "Example input",
        "output": "Expected output",
        "explanation": "Explanation of this example"
      }
    ],
    "difficulty": "Easy | Medium | Hard",
    "constraints": ["Constraint 1", "Constraint 2"],
    "hints": ["Hint 1", "Hint 2"],
    "solution": {
      "python": "Python code",
      "php": "PHP code",
      "typescript": "TypeScript code"
    },
    "explanation": "Explanation of how the solution works"
  }
]`;
    } else {
      return NextResponse.json(
        { error: "Either 'topic' (for question bank) or 'jobPosition' and 'jobDescription' (for standalone interview) are required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are a coding question generator bot that produces high-quality JSON-formatted technical questions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let responseText = completion.choices[0].message?.content || "";

    // Clean up response for standalone interview mode
    if (!topic && (jobPosition && jobDescription)) {
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

      try {
        const parsedQuestions = JSON.parse(responseText);
        if (!Array.isArray(parsedQuestions)) throw new Error("Response is not a JSON array");

  return NextResponse.json({
    questions: parsedQuestions,
    metadata: {
      source: "question-bank",
      questionType: "coding",
      topic,
      totalQuestions,
      difficulty,
      generatedAt: new Date().toISOString(),
    },
  });
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError);
        return NextResponse.json(
          { error: "Failed to generate valid coding questions. The AI response was malformed." },
          { status: 500 }
        );
      }
    }

    // Question bank mode - return raw response
    return new NextResponse(responseText, {
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
        "Keep-Alive": "timeout=60",
      },
    });
  } catch (error) {
    console.error("Error generating coding questions:", error);
    return NextResponse.json(
      {
        error: "Failed to generate coding questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}