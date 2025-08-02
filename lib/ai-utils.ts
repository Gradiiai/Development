import { generateJSONWithOpenAI, generateWithOpenAI } from '@/lib/integrations/ai/openai';

// Types for different question formats
export interface BaseQuestion {
  Question: string;
  Answer: string;
  type: 'mcq' | 'coding' | 'behavioral';
  metadata?: {
    difficultyScore?: number;
    version?: string;
    topic?: string;
    tags?: string[];
  };
}

export interface MCQQuestion extends BaseQuestion {
  type: 'mcq';
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation: string;
}

export interface CodingQuestion extends BaseQuestion {
  type: 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  constraints: string[];
  hints: string[];
  solutions?: {
    language: string;
    code: string;
  }[];
}

export interface BehavioralQuestion extends BaseQuestion {
  type: 'behavioral';
  category?: string;
  followUpQuestions?: string[];
}

export type Question = MCQQuestion | CodingQuestion | BehavioralQuestion;

export interface GenerationRequest {
  type: 'mcq' | 'coding' | 'behavioral' | 'combo';
  count: number;
  jobTitle?: string;
  resumeText?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  category?: string;
  // For combo type
  distribution?: {
    behavioral?: number;
    mcq?: number;
    coding?: number;
  };
}

export interface GenerationResponse {
  questions: Question[];
  metadata: {
    type: string;
    count: number;
    jobTitle?: string;
    difficulty?: string;
    topic?: string;
    generatedAt: string;
    distribution?: {
      behavioral?: number;
      mcq?: number;
      coding?: number;
    };
    error?: string;
  };
}

/**
 * Generate MCQ questions based on job context
 */
export async function generateMCQQuestions(
  count: number,
  jobTitle?: string,
  resumeText?: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  topic?: string
): Promise<MCQQuestion[]> {
  const contextInfo = [];
  if (jobTitle) contextInfo.push(`Job Title: ${jobTitle}`);
  if (topic) contextInfo.push(`Topic: ${topic}`);
  if (resumeText) contextInfo.push(`Resume Context: ${resumeText}`);
  
  const context = contextInfo.length > 0 ? contextInfo.join('\n') : 'General technical questions';

  const prompt = `
Generate ${count} multiple choice questions with the following context:
${context}

Requirements:
1. Difficulty level: ${difficulty}
2. Each question must have exactly 4 options
3. Only one correct answer per question
4. Include detailed explanations
5. Format as JSON array
6. Questions should be technical and relevant to the role

JSON structure:
[
  {
    "Question": "What is the time complexity of binary search?",
    "Answer": "O(log n) - Binary search eliminates half of the search space in each iteration.",
    "type": "mcq",
    "options": [
      {"id": "option1", "text": "O(n)", "isCorrect": false},
      {"id": "option2", "text": "O(log n)", "isCorrect": true},
      {"id": "option3", "text": "O(n²)", "isCorrect": false},
      {"id": "option4", "text": "O(1)", "isCorrect": false}
    ],
    "explanation": "Binary search has O(log n) time complexity because it divides the search space in half with each comparison.",
    "metadata": {
      "difficultyScore": 3,
      "topic": "${topic || 'algorithms'}",
      "version": "1.0"
    }
  }
]

Generate ${count} questions now:`;

  const response = await generateJSONWithOpenAI(prompt);
  return parseAndValidateQuestions(response, 'mcq') as MCQQuestion[];
}

/**
 * Generate coding questions based on job context
 */
export async function generateCodingQuestions(
  count: number,
  jobTitle?: string,
  resumeText?: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  topic?: string
): Promise<CodingQuestion[]> {
  const contextInfo = [];
  if (jobTitle) contextInfo.push(`Job Title: ${jobTitle}`);
  if (topic) contextInfo.push(`Topic: ${topic}`);
  if (resumeText) contextInfo.push(`Resume Context: ${resumeText}`);
  
  const context = contextInfo.length > 0 ? contextInfo.join('\n') : 'General programming questions';

  const prompt = `
Generate ${count} coding questions with the following context:
${context}

Requirements:
1. Difficulty level: ${difficulty}
2. Include realistic examples with input/output
3. Provide constraints and hints
4. Include solutions in multiple languages
5. Format as JSON array

JSON structure:
[
  {
    "Question": "Write a function to reverse a string.",
    "Answer": "A simple approach is to iterate from both ends and swap characters, or use built-in reverse methods.",
    "type": "coding",
    "difficulty": "${difficulty}",
    "examples": [
      {
        "input": "hello",
        "output": "olleh",
        "explanation": "Reverse the order of characters in the string."
      }
    ],
    "constraints": [
      "1 <= string.length <= 1000",
      "String contains only ASCII characters"
    ],
    "hints": [
      "You can use two pointers approach",
      "Consider using built-in string methods"
    ],
    "solutions": [
      {
        "language": "javascript",
        "code": "function reverseString(s) { return s.split('').reverse().join(''); }"
      },
      {
        "language": "python",
        "code": "def reverse_string(s): return s[::-1]"
      }
    ],
    "metadata": {
      "difficultyScore": 2,
      "topic": "${topic || 'strings'}",
      "version": "1.0"
    }
  }
]

Generate ${count} questions now:`;

  const response = await generateJSONWithOpenAI(prompt);
  return parseAndValidateQuestions(response, 'coding') as CodingQuestion[];
}

/**
 * Generate behavioral questions based on job context
 */
export async function generateBehavioralQuestions(
  count: number,
  jobTitle?: string,
  resumeText?: string,
  category?: string
): Promise<BehavioralQuestion[]> {
  const contextInfo = [];
  if (jobTitle) contextInfo.push(`Job Title: ${jobTitle}`);
  if (category) contextInfo.push(`Category: ${category}`);
  if (resumeText) contextInfo.push(`Resume Context: ${resumeText}`);
  
  const context = contextInfo.length > 0 ? contextInfo.join('\n') : 'General behavioral questions';

  const prompt = `
Generate ${count} behavioral interview questions with the following context:
${context}

Requirements:
1. Focus on STAR method (Situation, Task, Action, Result)
2. Include follow-up questions
3. Relevant to the job role and experience
4. Format as JSON array

JSON structure:
[
  {
    "Question": "Tell me about a time when you had to work with a difficult team member.",
    "Answer": "Look for specific examples using STAR method, conflict resolution skills, and professional growth.",
    "type": "behavioral",
    "category": "${category || 'teamwork'}",
    "followUpQuestions": [
      "What would you do differently next time?",
      "How did this experience change your approach to teamwork?"
    ],
    "metadata": {
      "difficultyScore": 3,
      "topic": "${category || 'interpersonal-skills'}",
      "version": "1.0"
    }
  }
]

Generate ${count} questions now:`;

  const response = await generateJSONWithOpenAI(prompt);
  return parseAndValidateQuestions(response, 'behavioral') as BehavioralQuestion[];
}

/**
 * Generate combo questions (mix of behavioral, MCQ, and coding)
 */
export async function generateComboQuestions(
  totalCount: number,
  distribution: { behavioral?: number; mcq?: number; coding?: number },
  jobTitle?: string,
  resumeText?: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> {
  const questions: Question[] = [];

  // Generate each type of question
  if (distribution.behavioral && distribution.behavioral > 0) {
    const behavioralQuestions = await generateBehavioralQuestions(
      distribution.behavioral,
      jobTitle,
      resumeText
    );
    questions.push(...behavioralQuestions);
  }

  if (distribution.mcq && distribution.mcq > 0) {
    const mcqQuestions = await generateMCQQuestions(
      distribution.mcq,
      jobTitle,
      resumeText,
      difficulty
    );
    questions.push(...mcqQuestions);
  }

  if (distribution.coding && distribution.coding > 0) {
    const codingQuestions = await generateCodingQuestions(
      distribution.coding,
      jobTitle,
      resumeText,
      difficulty
    );
    questions.push(...codingQuestions);
  }

  // Shuffle the questions to mix types
  return shuffleArray(questions);
}

/**
 * Parse and validate AI-generated questions
 */
export function parseAndValidateQuestions(response: string, expectedType?: string): Question[] {
  let cleanedResponse = response.trim();
  
  // Remove markdown code blocks if present
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Extract JSON from the response
  const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    cleanedResponse = jsonMatch[0];
  }

  try {
    const parsedQuestions = JSON.parse(cleanedResponse);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error('Response is not an array');
    }
    
    // Validate question structure
    for (const question of parsedQuestions) {
      // Check for different question formats based on type
      if (question.type === 'behavioral') {
        if (!question.question || !question.purpose || !question.type) {
          throw new Error('Invalid behavioral question structure - missing required fields');
        }
      } else if (question.type === 'mcq') {
        if (!question.question || !question.options || !Array.isArray(question.options)) {
          throw new Error('MCQ question missing required fields or options');
        }
      } else if (question.type === 'coding') {
        if (!question.title || !question.description) {
          throw new Error('Coding question missing title or description');
        }
      } else {
        // Legacy format support for backward compatibility
        if (!question.Question || !question.Answer || !question.type) {
          throw new Error('Invalid question structure');
        }
      }
      
      if (expectedType && question.type !== expectedType) {
        question.type = expectedType; // Fix type if needed
      }
      
      // Add default values for behavioral questions
      if (question.type === 'behavioral') {
        if (!question.difficulty) question.difficulty = 'medium';
        if (!question.category) question.category = 'general';
        if (!question.keyPoints) question.keyPoints = [];
        if (!question.followUpQuestions) question.followUpQuestions = [];
        if (!question.tips) question.tips = [];
      }
      
      // Add default difficulty for coding questions
      if (question.type === 'coding' && !question.difficulty) {
        question.difficulty = 'medium';
      }
      
      // Add metadata if missing
      if (!question.metadata) {
        question.metadata = {
          difficultyScore: getDifficultyScore(question.difficulty || 'medium'),
          version: '1.0',
          topic: 'general'
        };
      }
    }
    
    return parsedQuestions;
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    throw new Error('Failed to parse AI response into valid questions');
  }
}

// Fallback questions function removed - system now requires proper question generation
// If AI generation fails, the system will return an error instead of mock data

/**
 * Utility function to shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get difficulty score based on difficulty level
 */
function getDifficultyScore(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 1;
    case 'medium': return 3;
    case 'hard': return 5;
    default: return 3;
  }
}

/**
 * Batch generation support for multiple requests
 */
export async function generateQuestionsBatch(
  requests: GenerationRequest[]
): Promise<GenerationResponse[]> {
  const responses: GenerationResponse[] = [];
  
  for (const request of requests) {
    try {
      let questions: Question[] = [];
      
      switch (request.type) {
        case 'mcq':
          questions = await generateMCQQuestions(
            request.count,
            request.jobTitle,
            request.resumeText,
            request.difficulty,
            request.topic
          );
          break;
          
        case 'coding':
          questions = await generateCodingQuestions(
            request.count,
            request.jobTitle,
            request.resumeText,
            request.difficulty,
            request.topic
          );
          break;
          
        case 'behavioral':
          questions = await generateBehavioralQuestions(
            request.count,
            request.jobTitle,
            request.resumeText,
            request.category
          );
          break;
          
        case 'combo':
          if (!request.distribution) {
            throw new Error('Distribution required for combo type');
          }
          questions = await generateComboQuestions(
            request.count,
            request.distribution,
            request.jobTitle,
            request.resumeText,
            request.difficulty
          );
          break;
      }
      
      responses.push({
        questions,
        metadata: {
          type: request.type,
          count: questions.length,
          jobTitle: request.jobTitle,
          difficulty: request.difficulty,
          topic: request.topic,
          generatedAt: new Date().toISOString(),
          distribution: request.distribution
        }
      });
    } catch (error) {
      console.error(`Error generating questions for request:`, error);
      // Return error response instead of fallback questions
      responses.push({
        questions: [],
        metadata: {
          type: request.type,
          count: 0,
          jobTitle: request.jobTitle,
          difficulty: request.difficulty,
          topic: request.topic,
          generatedAt: new Date().toISOString(),
          distribution: request.distribution,
          error: error instanceof Error ? error.message : 'Failed to generate questions'
        }
      });
    }
  }
  
  return responses;
}