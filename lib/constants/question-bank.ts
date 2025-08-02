// Question Bank Constants and Categories

export const QUESTION_TYPES = {
  BEHAVIORAL: 'behavioral',
  CODING: 'coding',
  MCQ: 'mcq',
  COMBO: 'combo',
  APTITUDE: 'aptitude',
  SCREENING: 'screening'
} as const;

export const QUESTION_CATEGORIES = {
  TECHNICAL: 'technical',
  BEHAVIORAL: 'behavioral',
  APTITUDE: 'aptitude',
  GENERAL_SCREENING: 'general-screening',
  SOFT_SKILLS: 'soft-skills',
  DOMAIN_SPECIFIC: 'domain-specific',
  COGNITIVE: 'cognitive',
  PERSONALITY: 'personality'
} as const;

export const APTITUDE_SUBCATEGORIES = {
  LOGICAL_REASONING: 'logical-reasoning',
  QUANTITATIVE_APTITUDE: 'quantitative-aptitude',
  VERBAL_REASONING: 'verbal-reasoning',
  ANALYTICAL_REASONING: 'analytical-reasoning',
  SPATIAL_REASONING: 'spatial-reasoning',
  CRITICAL_THINKING: 'critical-thinking',
  NUMERICAL_ABILITY: 'numerical-ability',
  DATA_INTERPRETATION: 'data-interpretation'
} as const;

export const TECHNICAL_SUBCATEGORIES = {
  ALGORITHMS: 'algorithms',
  DATA_STRUCTURES: 'data-structures',
  SYSTEM_DESIGN: 'system-design',
  DATABASE_DESIGN: 'database-design',
  WEB_DEVELOPMENT: 'web-development',
  MOBILE_DEVELOPMENT: 'mobile-development',
  DEVOPS: 'devops',
  SECURITY: 'security',
  TESTING: 'testing',
  ARCHITECTURE: 'architecture'
} as const;

export const BEHAVIORAL_SUBCATEGORIES = {
  LEADERSHIP: 'leadership',
  TEAMWORK: 'teamwork',
  COMMUNICATION: 'communication',
  PROBLEM_SOLVING: 'problem-solving',
  ADAPTABILITY: 'adaptability',
  CONFLICT_RESOLUTION: 'conflict-resolution',
  TIME_MANAGEMENT: 'time-management',
  DECISION_MAKING: 'decision-making',
  STRESS_MANAGEMENT: 'stress-management',
  CULTURAL_FIT: 'cultural-fit'
} as const;

export const SCREENING_SUBCATEGORIES = {
  BASIC_QUALIFICATIONS: 'basic-qualifications',
  EXPERIENCE_VERIFICATION: 'experience-verification',
  AVAILABILITY: 'availability',
  SALARY_EXPECTATIONS: 'salary-expectations',
  LOCATION_PREFERENCES: 'location-preferences',
  WORK_AUTHORIZATION: 'work-authorization',
  NOTICE_PERIOD: 'notice-period',
  MOTIVATION: 'motivation'
} as const;

export const SOFT_SKILLS_SUBCATEGORIES = {
  EMOTIONAL_INTELLIGENCE: 'emotional-intelligence',
  INTERPERSONAL_SKILLS: 'interpersonal-skills',
  PRESENTATION_SKILLS: 'presentation-skills',
  NEGOTIATION: 'negotiation',
  CUSTOMER_SERVICE: 'customer-service',
  SALES_SKILLS: 'sales-skills',
  CREATIVITY: 'creativity',
  INNOVATION: 'innovation',
  COMMUNICATION: 'communication'
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export const USAGE_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  MIXED: 'mixed'
} as const;

// Pre-defined question bank templates
export const PREDEFINED_TEMPLATES = [
  {
    name: 'Software Engineer - Full Stack',
    description: 'Comprehensive question bank for full-stack software engineer positions',
    category: QUESTION_CATEGORIES.TECHNICAL,
    subCategory: TECHNICAL_SUBCATEGORIES.WEB_DEVELOPMENT,
    questionTypes: [QUESTION_TYPES.CODING, QUESTION_TYPES.MCQ, QUESTION_TYPES.BEHAVIORAL],
    targetRoles: ['Software Engineer', 'Full Stack Developer', 'Web Developer'],
    difficultyLevels: [DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD],
    estimatedQuestions: 50
  },
  {
    name: 'Aptitude Assessment - General',
    description: 'General aptitude questions for analytical and logical reasoning',
    category: QUESTION_CATEGORIES.APTITUDE,
    subCategory: APTITUDE_SUBCATEGORIES.LOGICAL_REASONING,
    questionTypes: [QUESTION_TYPES.APTITUDE, QUESTION_TYPES.MCQ],
    targetRoles: ['General', 'Entry Level', 'Graduate'],
    difficultyLevels: [DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM],
    estimatedQuestions: 30
  },
  {
    name: 'Leadership & Management',
    description: 'Behavioral questions focused on leadership and management skills',
    category: QUESTION_CATEGORIES.BEHAVIORAL,
    subCategory: BEHAVIORAL_SUBCATEGORIES.LEADERSHIP,
    questionTypes: [QUESTION_TYPES.BEHAVIORAL],
    targetRoles: ['Manager', 'Team Lead', 'Senior', 'Director'],
    difficultyLevels: [DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD],
    estimatedQuestions: 25
  },
  {
    name: 'Initial Screening - General',
    description: 'Basic screening questions for initial candidate evaluation',
    category: QUESTION_CATEGORIES.GENERAL_SCREENING,
    subCategory: SCREENING_SUBCATEGORIES.BASIC_QUALIFICATIONS,
    questionTypes: [QUESTION_TYPES.SCREENING, QUESTION_TYPES.MCQ],
    targetRoles: ['All Roles'],
    difficultyLevels: [DIFFICULTY_LEVELS.EASY],
    estimatedQuestions: 15
  },
  {
    name: 'Data Structures & Algorithms',
    description: 'Comprehensive coding questions on DSA topics',
    category: QUESTION_CATEGORIES.TECHNICAL,
    subCategory: TECHNICAL_SUBCATEGORIES.ALGORITHMS,
    questionTypes: [QUESTION_TYPES.CODING, QUESTION_TYPES.MCQ],
    targetRoles: ['Software Engineer', 'Backend Developer', 'Algorithm Engineer'],
    difficultyLevels: [DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD],
    estimatedQuestions: 40
  },
  {
    name: 'Soft Skills Assessment',
    description: 'Questions to evaluate communication, teamwork, and interpersonal skills',
    category: QUESTION_CATEGORIES.SOFT_SKILLS,
    subCategory: SOFT_SKILLS_SUBCATEGORIES.COMMUNICATION,
    questionTypes: [QUESTION_TYPES.BEHAVIORAL, QUESTION_TYPES.SCREENING],
    targetRoles: ['All Roles'],
    difficultyLevels: [DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM],
    estimatedQuestions: 20
  }
];

// Category descriptions and icons
export const CATEGORY_INFO = {
  [QUESTION_CATEGORIES.TECHNICAL]: {
    name: 'Technical',
    description: 'Programming, system design, and technical knowledge questions',
    icon: 'Code',
    color: 'blue'
  },
  [QUESTION_CATEGORIES.BEHAVIORAL]: {
    name: 'Behavioral',
    description: 'Questions about past experiences, leadership, and soft skills',
    icon: 'Users',
    color: 'green'
  },
  [QUESTION_CATEGORIES.APTITUDE]: {
    name: 'Aptitude',
    description: 'Logical reasoning, quantitative, and analytical thinking questions',
    icon: 'Brain',
    color: 'purple'
  },
  [QUESTION_CATEGORIES.GENERAL_SCREENING]: {
    name: 'General Screening',
    description: 'Basic qualification and fit assessment questions',
    icon: 'Filter',
    color: 'orange'
  },
  [QUESTION_CATEGORIES.SOFT_SKILLS]: {
    name: 'Soft Skills',
    description: 'Communication, teamwork, and interpersonal skills assessment',
    icon: 'Heart',
    color: 'pink'
  },
  [QUESTION_CATEGORIES.DOMAIN_SPECIFIC]: {
    name: 'Domain Specific',
    description: 'Industry or role-specific knowledge questions',
    icon: 'Target',
    color: 'indigo'
  },
  [QUESTION_CATEGORIES.COGNITIVE]: {
    name: 'Cognitive',
    description: 'Memory, attention, and cognitive ability assessment',
    icon: 'Zap',
    color: 'yellow'
  },
  [QUESTION_CATEGORIES.PERSONALITY]: {
    name: 'Personality',
    description: 'Personality traits and cultural fit assessment',
    icon: 'Smile',
    color: 'teal'
  }
};

export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];
export type QuestionCategory = typeof QUESTION_CATEGORIES[keyof typeof QUESTION_CATEGORIES];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];
export type UsageType = typeof USAGE_TYPES[keyof typeof USAGE_TYPES];