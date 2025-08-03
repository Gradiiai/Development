import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced language support with modern programming languages
const SUPPORTED_LANGUAGES = {
  'python': { name: 'Python', extension: 'py', comment: '#' },
  'javascript': { name: 'JavaScript', extension: 'js', comment: '//' },
  'typescript': { name: 'TypeScript', extension: 'ts', comment: '//' },
  'java': { name: 'Java', extension: 'java', comment: '//' },
  'cpp': { name: 'C++', extension: 'cpp', comment: '//' },
  'php': { name: 'PHP', extension: 'php', comment: '//' },
  'html': { name: 'HTML', extension: 'html', comment: '<!--' },
  'css': { name: 'CSS', extension: 'css', comment: '/*' },
  'sql': { name: 'SQL', extension: 'sql', comment: '--' },
  'rust': { name: 'Rust', extension: 'rs', comment: '//' },
};

// Smart language detection from job descriptions and titles
const detectLanguagesFromJob = (jobPosition: string, jobDescription: string): string[] => {
  const text = `${jobPosition} ${jobDescription}`.toLowerCase();
  const detectedLanguages: string[] = [];
  
  // Language keyword mapping (only supported languages)
  const languageKeywords = {
    'python': ['python', 'django', 'flask', 'pandas', 'numpy', 'fastapi', 'py'],
    'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'express', 'next'],
    'typescript': ['typescript', 'ts', 'angular', 'next.js', 'nest'],
    'java': ['java', 'spring', 'hibernate', 'maven', 'gradle', 'jvm'],
    'cpp': ['c++', 'cpp', 'c plus', 'unreal', 'qt'],
    'php': ['php', 'laravel', 'symfony', 'wordpress', 'drupal'],
    'rust': ['rust', 'cargo', 'rustc'],
    'sql': ['sql', 'mysql', 'postgresql', 'oracle', 'database', 'mongodb', 'nosql'],
    'html': ['html', 'html5', 'web development', 'frontend', 'markup'],
    'css': ['css', 'css3', 'sass', 'scss', 'less', 'styling', 'bootstrap'],
  };
  
  // Check for language keywords
  Object.entries(languageKeywords).forEach(([lang, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      detectedLanguages.push(lang);
    }
  });
  
  // Default fallback based on common job roles
  if (detectedLanguages.length === 0) {
    if (text.includes('frontend') || text.includes('front-end')) {
      detectedLanguages.push('javascript', 'typescript', 'html', 'css');
    } else if (text.includes('backend') || text.includes('back-end')) {
      detectedLanguages.push('python', 'javascript', 'java');
    } else if (text.includes('fullstack') || text.includes('full-stack')) {
      detectedLanguages.push('javascript', 'typescript', 'python');
    } else if (text.includes('data')) {
      detectedLanguages.push('python', 'sql');
    } else if (text.includes('database')) {
      detectedLanguages.push('sql', 'python');
    } else {
      // Ultimate fallback
      detectedLanguages.push('python', 'javascript');
    }
  }
  
  return [...new Set(detectedLanguages)]; // Remove duplicates
};

const generatePrompt = (topic: string, totalQuestions: number, languages: string[] = ['python', 'javascript']): string => {
  const languageList = languages.map(lang => SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]?.name || lang).join(', ');
  const solutionFields = languages.reduce((acc, lang) => {
    acc[lang] = `${SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]?.name || lang} code`;
    return acc;
  }, {} as Record<string, string>);

  return `
Generate "${totalQuestions}" coding questions related to the topic: "${topic}".

For each question, provide the following:
1. Title
2. Description
3. Examples (input, output, explanation)
4. Difficulty level
5. Constraints
6. Hints
7. Solution in: ${languageList}
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
    "solution": ${JSON.stringify(solutionFields, null, 6)},
    "explanation": "Explanation of how the solution works",
    "primaryLanguage": "${languages[0]}",
    "supportedLanguages": ${JSON.stringify(languages)}
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
    
    // Get preferred languages (can be passed explicitly or auto-detected)
    const preferredLanguagesParam = formData.get("languages") as string;
    let preferredLanguages: string[] = [];
    
    if (preferredLanguagesParam) {
      // Parse explicitly provided languages
      preferredLanguages = preferredLanguagesParam.split(',').map(lang => lang.trim().toLowerCase());
    } else if (jobPosition && jobDescription) {
      // Auto-detect languages from job description
      preferredLanguages = detectLanguagesFromJob(jobPosition, jobDescription);
      console.log(`🤖 Auto-detected languages for "${jobPosition}":`, preferredLanguages);
    } else {
      // Default fallback
      preferredLanguages = ['python', 'javascript'];
    }
    
    // Limit to maximum 3 languages for practical question generation
    preferredLanguages = preferredLanguages.slice(0, 3);

    let prompt: string;
    
    if (topic) {
      // Question bank mode - topic-based generation
      prompt = generatePrompt(topic, totalQuestions, preferredLanguages);
    } else if (jobPosition && jobDescription) {
      // Standalone interview mode - job-based generation with smart language detection
      const languageList = preferredLanguages.map(lang => SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]?.name || lang).join(', ');
      const solutionFields = preferredLanguages.reduce((acc, lang) => {
        acc[lang] = `${SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]?.name || lang} code`;
        return acc;
      }, {} as Record<string, string>);
      
      prompt = `Generate exactly ${totalQuestions} coding questions for a ${jobPosition} role.

Job Details:
- Position: ${jobPosition}
- Description: ${jobDescription}
- Experience Level: ${yearsOfExperience || "Not specified"}
- Resume Context: ${resumeText || "No additional context"}
- Difficulty: ${difficulty}
- Primary Programming Languages: ${languageList}

For each question, provide the following:
1. Title
2. Description
3. Examples (input, output, explanation)
4. Difficulty level
5. Constraints
6. Hints
7. Solution in: ${languageList}
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
    "solution": ${JSON.stringify(solutionFields, null, 6)},
    "explanation": "Explanation of how the solution works",
    "primaryLanguage": "${preferredLanguages[0]}",
    "supportedLanguages": ${JSON.stringify(preferredLanguages)}
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
            source: topic ? "question-bank" : "standalone-interview",
            questionType: "coding",
            topic,
            jobPosition,
            totalQuestions,
            difficulty,
            detectedLanguages: preferredLanguages,
            primaryLanguage: preferredLanguages[0],
            supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
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