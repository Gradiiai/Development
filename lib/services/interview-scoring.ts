/**
 * Comprehensive Interview Scoring and Analysis System
 * 
 * This service handles the detailed scoring, checking, and AI analysis for all interview types:
 * - MCQ: Correct option matching and time-based scoring
 * - Coding: Logic verification, syntax checking, and algorithmic correctness
 * - Behavioral: Keyword matching, structure analysis, and competency assessment
 */

interface MCQQuestion {
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  timeLimit?: number; // seconds
}

interface CodingQuestion {
  question: string;
  description: string;
  examples: { input: string; output: string; explanation: string }[];
  solution: {
    python?: string;
    typescript?: string;
    php?: string;
  };
  testCases: { input: string; expectedOutput: string }[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface BehavioralQuestion {
  question: string;
  keyPoints: string[];
  category: 'Leadership' | 'Teamwork' | 'Problem-solving' | 'Communication' | 'Adaptability';
  expectedKeywords: string[];
  scoringCriteria: {
    structure: string[]; // STAR method indicators
    specificity: string[]; // Specific example indicators  
    impact: string[]; // Results and impact indicators
  };
}

interface AnswerSubmission {
  questionId: string;
  answer: any;
  timeSpent: number; // seconds
  questionType: 'mcq' | 'coding' | 'behavioral';
}

// =================== MCQ SCORING ===================

export function scoreMCQAnswer(
  question: MCQQuestion,
  submittedAnswer: string,
  timeSpent: number
): {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeBonus: number;
  feedback: string;
  analysis: {
    selectedOption: string;
    correctOption: string;
    explanation: string;
  };
} {
  const isCorrect = submittedAnswer === question.correctAnswer;
  const baseScore = isCorrect ? 1 : 0;
  
  // Time bonus: Full points for under 60s, decreasing bonus up to time limit
  let timeBonus = 0;
  const timeLimit = question.timeLimit || 120; // Default 2 minutes
  
  if (isCorrect && timeSpent <= 60) {
    timeBonus = 0.2; // 20% bonus for quick correct answers
  } else if (isCorrect && timeSpent <= timeLimit * 0.75) {
    timeBonus = 0.1; // 10% bonus for reasonably quick answers
  }
  
  const finalScore = baseScore + timeBonus;
  
  const selectedOption = question.options.find(opt => opt.id === submittedAnswer);
  const correctOption = question.options.find(opt => opt.isCorrect);
  
  const feedback = isCorrect 
    ? `Correct! ${question.explanation}${timeBonus > 0 ? ` Great time management (+${Math.round(timeBonus * 100)}% bonus)!` : ''}`
    : `Incorrect. You selected "${selectedOption?.text || 'Unknown'}" but the correct answer is "${correctOption?.text}". ${question.explanation}`;

  return {
    isCorrect,
    score: finalScore,
    maxScore: 1.2, // Base 1 + max 0.2 time bonus
    timeBonus,
    feedback,
    analysis: {
      selectedOption: selectedOption?.text || 'No answer selected',
      correctOption: correctOption?.text || 'Unknown',
      explanation: question.explanation
    }
  };
}

// =================== CODING SCORING ===================

export function scoreCodingAnswer(
  question: CodingQuestion,
  submittedCode: string,
  language: string,
  timeSpent: number
): {
  score: number;
  maxScore: number;
  breakdown: {
    syntax: number;
    logic: number;
    efficiency: number;
    completeness: number;
    timeManagement: number;
  };
  feedback: string;
  analysis: {
    linesOfCode: number;
    hasMainLogic: boolean;
    syntaxErrors: string[];
    algorithmicApproach: string;
    suggestions: string[];
  };
} {
  const maxScore = 10; // Coding questions worth 10 points
  const breakdown = {
    syntax: 0,
    logic: 0, 
    efficiency: 0,
    completeness: 0,
    timeManagement: 0
  };
  
  // 1. SYNTAX CHECKING (2 points)
  const syntaxAnalysis = analyzeSyntax(submittedCode, language);
  breakdown.syntax = syntaxAnalysis.score;
  
  // 2. LOGIC CHECKING (4 points) 
  const logicAnalysis = analyzeLogic(submittedCode, question);
  breakdown.logic = logicAnalysis.score;
  
  // 3. EFFICIENCY ANALYSIS (2 points)
  const efficiencyAnalysis = analyzeEfficiency(submittedCode, question.difficulty);
  breakdown.efficiency = efficiencyAnalysis.score;
  
  // 4. COMPLETENESS CHECK (1.5 points)
  const completenessAnalysis = analyzeCompleteness(submittedCode, question);
  breakdown.completeness = completenessAnalysis.score;
  
  // 5. TIME MANAGEMENT (0.5 points)
  const timeLimit = question.difficulty === 'Easy' ? 900 : question.difficulty === 'Medium' ? 1800 : 2700; // 15, 30, 45 minutes
  breakdown.timeManagement = timeSpent <= timeLimit ? 0.5 : Math.max(0, 0.5 - (timeSpent - timeLimit) / timeLimit * 0.5);
  
  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  const feedback = generateCodingFeedback(breakdown, syntaxAnalysis, logicAnalysis, efficiencyAnalysis, completenessAnalysis);
  
  const analysis = {
    linesOfCode: submittedCode.split('\n').filter(line => line.trim().length > 0).length,
    hasMainLogic: logicAnalysis.hasMainLogic,
    syntaxErrors: syntaxAnalysis.errors,
    algorithmicApproach: logicAnalysis.approach,
    suggestions: [
      ...syntaxAnalysis.suggestions,
      ...logicAnalysis.suggestions,
      ...efficiencyAnalysis.suggestions
    ]
  };
  
  return {
    score: Math.round(totalScore * 100) / 100,
    maxScore,
    breakdown,
    feedback,
    analysis
  };
}

// =================== BEHAVIORAL SCORING ===================

export function scoreBehavioralAnswer(
  question: BehavioralQuestion,
  submittedAnswer: string,
  timeSpent: number
): {
  score: number;
  maxScore: number;
  breakdown: {
    structure: number;
    specificity: number;
    relevance: number;
    impact: number;
    communication: number;
  };
  feedback: string;
  analysis: {
    wordCount: number;
    keywordMatches: string[];
    starMethodScore: number;
    specificityScore: number;
    impactMentioned: boolean;
    suggestions: string[];
  };
} {
  const maxScore = 5; // Behavioral questions worth 5 points
  const breakdown = {
    structure: 0,
    specificity: 0,
    relevance: 0,
    impact: 0,
    communication: 0
  };
  
  const lowerAnswer = submittedAnswer.toLowerCase();
  const wordCount = submittedAnswer.split(/\s+/).filter(word => word.length > 0).length;
  
  // 1. STRUCTURE ANALYSIS (STAR Method - 1 point)
  const starAnalysis = analyzeSTARStructure(submittedAnswer);
  breakdown.structure = starAnalysis.score;
  
  // 2. SPECIFICITY ANALYSIS (1 point)
  const specificityAnalysis = analyzeSpecificity(submittedAnswer, question);
  breakdown.specificity = specificityAnalysis.score;
  
  // 3. RELEVANCE ANALYSIS (1 point)
  const relevanceAnalysis = analyzeRelevance(submittedAnswer, question);
  breakdown.relevance = relevanceAnalysis.score;
  
  // 4. IMPACT ANALYSIS (1 point)
  const impactAnalysis = analyzeImpact(submittedAnswer);
  breakdown.impact = impactAnalysis.score;
  
  // 5. COMMUNICATION QUALITY (1 point)
  const communicationAnalysis = analyzeCommunication(submittedAnswer, wordCount);
  breakdown.communication = communicationAnalysis.score;
  
  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  
  // Keyword matching for category-specific terms
  const keywordMatches = question.expectedKeywords.filter(keyword => 
    lowerAnswer.includes(keyword.toLowerCase())
  );
  
  const feedback = generateBehavioralFeedback(breakdown, starAnalysis, specificityAnalysis, impactAnalysis, question.category);
  
  const analysis = {
    wordCount,
    keywordMatches,
    starMethodScore: starAnalysis.score,
    specificityScore: specificityAnalysis.score,
    impactMentioned: impactAnalysis.hasImpact,
    suggestions: [
      ...starAnalysis.suggestions,
      ...specificityAnalysis.suggestions,
      ...impactAnalysis.suggestions,
      ...communicationAnalysis.suggestions
    ]
  };
  
  return {
    score: Math.round(totalScore * 100) / 100,
    maxScore,
    breakdown,
    feedback,
    analysis
  };
}

// =================== HELPER FUNCTIONS ===================

function analyzeSyntax(code: string, language: string) {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 2; // Full points by default
  
  // Basic syntax checks by language
  if (language === 'python') {
    // Check for basic Python syntax
    if (!code.includes('def ') && !code.includes('lambda ')) {
      errors.push('No function definition found');
      score -= 0.5;
    }
    if (code.includes('\t') && code.includes('    ')) {
      errors.push('Mixed tabs and spaces (use consistent indentation)');
      score -= 0.3;
    }
  } else if (language === 'typescript' || language === 'javascript') {
    // Check for basic JS/TS syntax
    if (!code.includes('function ') && !code.includes('=>') && !code.includes('const ') && !code.includes('let ')) {
      errors.push('No clear function or variable definition found');
      score -= 0.5;
    }
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
      score -= 0.4;
    }
  }
  
  // General checks
  if (code.trim().length < 20) {
    errors.push('Solution appears incomplete or too short');
    score -= 1;
  }
  
  return {
    score: Math.max(0, score),
    errors,
    suggestions: score < 2 ? ['Review syntax basics for ' + language, 'Use consistent formatting'] : []
  };
}

function analyzeLogic(code: string, question: CodingQuestion) {
  let score = 4; // Full logic points
  let hasMainLogic = false;
  let approach = 'Unknown';
  const suggestions: string[] = [];
  
  const lowerCode = code.toLowerCase();
  
  // Check for main algorithmic components
  if (lowerCode.includes('for ') || lowerCode.includes('while ') || lowerCode.includes('foreach')) {
    hasMainLogic = true;
    approach = 'Iterative approach detected';
  }
  
  if (lowerCode.includes('return ') || lowerCode.includes('echo ') || lowerCode.includes('print')) {
    hasMainLogic = true;
  }
  
  // Check against expected solution patterns
  const expectedSolution = question.solution.python || question.solution.typescript || question.solution.php || '';
  const expectedLower = expectedSolution.toLowerCase();
  
  // Look for similar logical structures
  if (expectedLower.includes('sort') && lowerCode.includes('sort')) {
    score += 0.5; // Bonus for using appropriate methods
  }
  
  if (expectedLower.includes('binary') && (lowerCode.includes('binary') || lowerCode.includes('left') && lowerCode.includes('right'))) {
    score += 0.5; // Bonus for correct algorithm choice
  }
  
  if (!hasMainLogic) {
    score -= 2;
    suggestions.push('Include main algorithmic logic');
    suggestions.push('Ensure your solution returns or outputs a result');
  }
  
  if (code.length < 50) {
    score -= 1;
    suggestions.push('Solution may be incomplete - add more implementation details');
  }
  
  return {
    score: Math.max(0, Math.min(4, score)),
    hasMainLogic,
    approach,
    suggestions
  };
}

function analyzeEfficiency(code: string, difficulty: string) {
  let score = 2; // Full efficiency points
  const suggestions: string[] = [];
  const lowerCode = code.toLowerCase();
  
  // Check for nested loops (potential O(n²) complexity)
  const forLoops = (lowerCode.match(/for /g) || []).length;
  const whileLoops = (lowerCode.match(/while /g) || []).length;
  const totalLoops = forLoops + whileLoops;
  
  if (totalLoops > 2 && difficulty === 'Easy') {
    score -= 0.5;
    suggestions.push('Consider a more efficient approach with fewer nested loops');
  }
  
  if (totalLoops > 3) {
    score -= 1;
    suggestions.push('Algorithm may be inefficient - review time complexity');
  }
  
  // Check for efficient methods
  if (lowerCode.includes('sort') || lowerCode.includes('binary')) {
    score += 0.2; // Bonus for using efficient algorithms
  }
  
  return {
    score: Math.max(0, Math.min(2, score)),
    suggestions
  };
}

function analyzeCompleteness(code: string, question: CodingQuestion) {
  let score = 1.5; // Full completeness points
  
  // Check if solution handles the examples
  const hasReturnStatement = /return /i.test(code);
  const hasMainLogic = code.length > 30;
  const hasVariables = /\b(var|let|const|=)\b/i.test(code);
  
  if (!hasReturnStatement && !code.includes('print') && !code.includes('echo')) {
    score -= 0.5;
  }
  
  if (!hasMainLogic) {
    score -= 0.5;
  }
  
  if (!hasVariables) {
    score -= 0.3;
  }
  
  // Check for edge case handling
  if (code.includes('if ') || code.includes('else')) {
    score += 0.2; // Bonus for conditional logic
  }
  
  return {
    score: Math.max(0, Math.min(1.5, score))
  };
}

function analyzeSTARStructure(answer: string) {
  const lowerAnswer = answer.toLowerCase();
  let score = 0;
  const suggestions: string[] = [];
  
  // Situation indicators
  const situationWords = ['situation', 'when', 'time', 'project', 'company', 'team', 'role'];
  const hasSituation = situationWords.some(word => lowerAnswer.includes(word));
  
  // Task indicators  
  const taskWords = ['task', 'responsibility', 'needed', 'required', 'goal', 'objective'];
  const hasTask = taskWords.some(word => lowerAnswer.includes(word));
  
  // Action indicators
  const actionWords = ['did', 'implemented', 'created', 'developed', 'managed', 'led', 'organized'];
  const hasAction = actionWords.some(word => lowerAnswer.includes(word));
  
  // Result indicators
  const resultWords = ['result', 'outcome', 'achieved', 'improved', 'increased', 'decreased', 'successful'];
  const hasResult = resultWords.some(word => lowerAnswer.includes(word));
  
  // Score based on STAR components present
  if (hasSituation) score += 0.25;
  if (hasTask) score += 0.25;
  if (hasAction) score += 0.3;
  if (hasResult) score += 0.2;
  
  // Suggestions based on missing components
  if (!hasSituation) suggestions.push('Include more context about the situation or setting');
  if (!hasTask) suggestions.push('Clearly describe your specific task or challenge');
  if (!hasAction) suggestions.push('Detail the specific actions you took');
  if (!hasResult) suggestions.push('Explain the results or outcomes of your actions');
  
  return { score, suggestions };
}

function analyzeSpecificity(answer: string, question: BehavioralQuestion) {
  const lowerAnswer = answer.toLowerCase();
  let score = 0;
  const suggestions: string[] = [];
  
  // Check for specific examples
  const specificWords = ['example', 'instance', 'specifically', 'particular', 'exactly'];
  const hasSpecifics = specificWords.some(word => lowerAnswer.includes(word));
  
  // Check for quantifiable details
  const hasNumbers = /\d+/.test(answer);
  const hasPercentages = /%|percent/.test(lowerAnswer);
  const hasTimeline = /week|month|day|year|hour/.test(lowerAnswer);
  
  if (hasSpecifics) score += 0.3;
  if (hasNumbers || hasPercentages) score += 0.3;
  if (hasTimeline) score += 0.2;
  
  // Check for category-specific keywords
  const categoryKeywordMatch = question.expectedKeywords.filter(keyword => 
    lowerAnswer.includes(keyword.toLowerCase())
  ).length;
  
  score += Math.min(0.2, categoryKeywordMatch * 0.05);
  
  if (score < 0.5) {
    suggestions.push('Provide more specific examples and details');
    suggestions.push('Include quantifiable results where possible');
  }
  
  return { score: Math.min(1, score), suggestions };
}

function analyzeRelevance(answer: string, question: BehavioralQuestion) {
  const lowerAnswer = answer.toLowerCase();
  const questionLower = question.question.toLowerCase();
  
  // Extract key concepts from the question
  const questionWords = questionLower.split(/\s+/).filter(word => 
    word.length > 3 && !['when', 'time', 'tell', 'about', 'describe', 'what', 'how'].includes(word)
  );
  
  // Check how many question concepts are addressed in the answer
  const relevantWordMatches = questionWords.filter(word => 
    lowerAnswer.includes(word.substring(0, word.length - 1)) // Partial word matching
  ).length;
  
  const relevanceRatio = questionWords.length > 0 ? relevantWordMatches / questionWords.length : 0.5;
  
  return { score: Math.min(1, relevanceRatio + 0.2) }; // Base 0.2 + relevance ratio
}

function analyzeImpact(answer: string) {
  const lowerAnswer = answer.toLowerCase();
  let score = 0;
  const suggestions: string[] = [];
  
  const impactWords = [
    'improved', 'increased', 'decreased', 'reduced', 'saved', 'earned', 'achieved',
    'successful', 'exceeded', 'delivered', 'completed', 'resolved', 'solved'
  ];
  
  const hasImpact = impactWords.some(word => lowerAnswer.includes(word));
  const hasQuantifiableImpact = /\d+%|\$\d+|\d+\s*(hours?|days?|weeks?|months?)/.test(answer);
  
  if (hasImpact) score += 0.5;
  if (hasQuantifiableImpact) score += 0.5;
  
  if (!hasImpact) {
    suggestions.push('Describe the impact or results of your actions');
  }
  
  return { score, hasImpact, suggestions };
}

function analyzeCommunication(answer: string, wordCount: number) {
  let score = 1; // Base communication score
  const suggestions: string[] = [];
  
  // Check answer length appropriateness
  if (wordCount < 50) {
    score -= 0.3;
    suggestions.push('Provide more detailed responses (aim for 100-200 words)');
  } else if (wordCount > 300) {
    score -= 0.2;
    suggestions.push('Try to be more concise while maintaining detail');
  }
  
  // Check for clear structure indicators
  const structureWords = ['first', 'second', 'then', 'finally', 'initially', 'subsequently'];
  const hasStructure = structureWords.some(word => 
    answer.toLowerCase().includes(word)
  );
  
  if (hasStructure) score += 0.1;
  
  // Check for professional language
  const informalWords = ['like', 'um', 'uh', 'kinda', 'sorta', 'yeah'];
  const hasInformalLanguage = informalWords.some(word => 
    answer.toLowerCase().includes(word)
  );
  
  if (hasInformalLanguage) {
    score -= 0.2;
    suggestions.push('Use more professional language');
  }
  
  return { score: Math.max(0, Math.min(1, score)), suggestions };
}

function generateCodingFeedback(breakdown: any, syntaxAnalysis: any, logicAnalysis: any, efficiencyAnalysis: any, completenessAnalysis: any) {
  const totalScore = Object.values(breakdown).reduce((sum: number, score: any) => sum + score, 0);
  const percentage = Math.round((totalScore / 10) * 100);
  
  let feedback = `Code Analysis Result: ${percentage}%\n\n`;
  
  feedback += `Breakdown:\n`;
  feedback += `• Syntax & Structure: ${breakdown.syntax}/2 points\n`;
  feedback += `• Logic & Algorithm: ${breakdown.logic}/4 points\n`;
  feedback += `• Efficiency: ${breakdown.efficiency}/2 points\n`;
  feedback += `• Completeness: ${breakdown.completeness}/1.5 points\n`;
  feedback += `• Time Management: ${breakdown.timeManagement}/0.5 points\n\n`;
  
  if (syntaxAnalysis.errors.length > 0) {
    feedback += `Syntax Issues:\n${syntaxAnalysis.errors.map((e: string) => `• ${e}`).join('\n')}\n\n`;
  }
  
  if (logicAnalysis.suggestions.length > 0) {
    feedback += `Suggestions:\n${logicAnalysis.suggestions.map((s: string) => `• ${s}`).join('\n')}\n\n`;
  }
  
  if (percentage >= 80) {
    feedback += `Excellent work! Your solution demonstrates strong programming skills.`;
  } else if (percentage >= 60) {
    feedback += `Good effort! Review the suggestions to improve your solution.`;
  } else {
    feedback += `Keep practicing! Focus on the areas highlighted for improvement.`;
  }
  
  return feedback;
}

function generateBehavioralFeedback(breakdown: any, starAnalysis: any, specificityAnalysis: any, impactAnalysis: any, category: string) {
  const totalScore = Object.values(breakdown).reduce((sum: number, score: any) => sum + score, 0);
  const percentage = Math.round((totalScore / 5) * 100);
  
  let feedback = `Behavioral Response Analysis: ${percentage}%\n\n`;
  
  feedback += `Assessment Areas:\n`;
  feedback += `• Structure (STAR method): ${breakdown.structure}/1 point\n`;
  feedback += `• Specificity & Examples: ${breakdown.specificity}/1 point\n`;
  feedback += `• Relevance to Question: ${breakdown.relevance}/1 point\n`;
  feedback += `• Impact & Results: ${breakdown.impact}/1 point\n`;
  feedback += `• Communication Quality: ${breakdown.communication}/1 point\n\n`;
  
  const allSuggestions = [
    ...starAnalysis.suggestions,
    ...specificityAnalysis.suggestions,
    ...impactAnalysis.suggestions
  ];
  
  if (allSuggestions.length > 0) {
    feedback += `Improvement Suggestions:\n${allSuggestions.map((s: string) => `• ${s}`).join('\n')}\n\n`;
  }
  
  if (percentage >= 80) {
    feedback += `Outstanding response! You effectively demonstrated ${category.toLowerCase()} competency with specific examples and clear results.`;
  } else if (percentage >= 60) {
    feedback += `Good response showing ${category.toLowerCase()} awareness. Consider adding more specific details and quantifiable outcomes.`;
  } else {
    feedback += `Your response shows potential. Focus on providing specific examples using the STAR method and highlighting measurable results.`;
  }
  
  return feedback;
}