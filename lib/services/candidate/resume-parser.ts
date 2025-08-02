export interface ParsedResume {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  totalExperience: number; // in years
}

export interface CVScore {
  overallScore: number;
  breakdown: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    culturalFit: number;
  };
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  reasoning?: string;
}

interface JobRequirements {
  skills: Array<{
    name: string;
    proficiencyLevel: string;
    weight: number;
    isRequired: boolean;
  }>;
  competencies: Array<{
    name: string;
    weight: number;
  }>;
  experienceLevel: string;
  department: string;
}

// Enhanced text extraction patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
const LINKEDIN_REGEX = /(?:linkedin\.com\/in\/|linkedin\.com\/profile\/view\?id=)([a-zA-Z0-9-]+)/gi;
const GITHUB_REGEX = /(?:github\.com\/)([a-zA-Z0-9-]+)/gi;
const URL_REGEX = /https?:\/\/[^\s]+/g;

// Common skill categories
const TECHNICAL_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
  'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
  'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD',
  'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
];

const SOFT_SKILLS = [
  'Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Critical Thinking',
  'Project Management', 'Time Management', 'Adaptability', 'Creativity', 'Analytical'
];

// Resume parsing using traditional regex-based approach only
// Note: This function is kept for compatibility but now only uses traditional parsing
export async function parseResumeWithAI(text: string): Promise<ParsedResume> {
  console.log('Using traditional regex-based parsing (OpenAI removed)');
  return parseResumeText(text);
}

export function parseResumeText(text: string): ParsedResume {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsed: ParsedResume = {
    personalInfo: {
      name: '',
      email: '',
    },
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      languages: [],
      frameworks: [],
      tools: []
    },
    certifications: [],
    projects: [],
    totalExperience: 0
  };

  // Extract personal information
  parsed.personalInfo = extractPersonalInfo(text);
  
  // Extract sections
  const sections = identifySections(lines);
  
  // Parse experience
  if (sections.experience.length > 0) {
    parsed.experience = parseExperience(sections.experience);
    parsed.totalExperience = calculateTotalExperience(parsed.experience);
  }
  
  // Parse education
  if (sections.education.length > 0) {
    parsed.education = parseEducation(sections.education);
  }
  
  // Parse skills
  if (sections.skills.length > 0) {
    parsed.skills = parseSkills(sections.skills.join(' '));
  }
  
  // Parse projects
  if (sections.projects.length > 0) {
    parsed.projects = parseProjects(sections.projects);
  }
  
  // Parse certifications
  if (sections.certifications.length > 0) {
    parsed.certifications = parseCertifications(sections.certifications);
  }
  
  // Extract summary
  if (sections.summary.length > 0) {
    parsed.summary = sections.summary.join(' ').substring(0, 500);
  }

  return parsed;
}

function extractPersonalInfo(text: string) {
  const personalInfo: ParsedResume['personalInfo'] = {
    name: '',
    email: ''
  };
  
  // Extract email
  const emailMatch = text.match(EMAIL_REGEX);
  if (emailMatch) {
    personalInfo.email = emailMatch[0];
  }
  
  // Extract phone
  const phoneMatch = text.match(PHONE_REGEX);
  if (phoneMatch) {
    personalInfo.phone = phoneMatch[0];
  }
  
  // Extract LinkedIn
  const linkedinMatch = text.match(LINKEDIN_REGEX);
  if (linkedinMatch) {
    personalInfo.linkedin = linkedinMatch[0];
  }
  
  // Extract GitHub
  const githubMatch = text.match(GITHUB_REGEX);
  if (githubMatch) {
    personalInfo.github = githubMatch[0];
  }
  
  // Extract name (usually first line or before email)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  for (const line of lines.slice(0, 5)) {
    if (!line.includes('@') && !line.match(PHONE_REGEX) && line.length > 5 && line.length < 50) {
      if (line.split(' ').length >= 2 && line.split(' ').length <= 4) {
        personalInfo.name = line;
        break;
      }
    }
  }
  
  return personalInfo;
}

function identifySections(lines: string[]) {
  const sections = {
    experience: [] as string[],
    education: [] as string[],
    skills: [] as string[],
    projects: [] as string[],
    certifications: [] as string[],
    summary: [] as string[]
  };
  
  let currentSection = '';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Identify section headers
    if (lowerLine.includes('experience') || lowerLine.includes('work history') || lowerLine.includes('employment')) {
      currentSection = 'experience';
      continue;
    } else if (lowerLine.includes('education') || lowerLine.includes('academic')) {
      currentSection = 'education';
      continue;
    } else if (lowerLine.includes('skill') || lowerLine.includes('technical') || lowerLine.includes('competenc')) {
      currentSection = 'skills';
      continue;
    } else if (lowerLine.includes('project') || lowerLine.includes('portfolio')) {
      currentSection = 'projects';
      continue;
    } else if (lowerLine.includes('certification') || lowerLine.includes('license')) {
      currentSection = 'certifications';
      continue;
    } else if (lowerLine.includes('summary') || lowerLine.includes('objective') || lowerLine.includes('profile')) {
      currentSection = 'summary';
      continue;
    }
    
    // Add content to current section
    if (currentSection && line.length > 0) {
      (sections as any)[currentSection].push(line);
    }
  }
  
  return sections;
}

function parseExperience(experienceLines: string[]) {
  const experiences: ParsedResume['experience'] = [];
  let currentExp: any = null;
  
  for (const line of experienceLines) {
    // Check if line contains company/position pattern
    if (line.includes('|') || line.includes('-') || line.includes('at ')) {
      if (currentExp) {
        experiences.push(currentExp);
      }
      
      const parts = line.split(/[|\-]|\sat\s/).map(p => p.trim());
      currentExp = {
        position: parts[0] || '',
        company: parts[1] || '',
        startDate: '',
        endDate: '',
        description: '',
        technologies: []
      };
      
      // Extract dates
      const dateMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
      if (dateMatch) {
        currentExp.startDate = dateMatch[1];
        currentExp.endDate = dateMatch[2];
      }
    } else if (currentExp) {
      // Add to description
      currentExp.description += (currentExp.description ? ' ' : '') + line;
      
      // Extract technologies
      const techMatches = TECHNICAL_SKILLS.filter(skill => 
        line.toLowerCase().includes(skill.toLowerCase())
      );
      currentExp.technologies = [...new Set([...currentExp.technologies, ...techMatches])];
    }
  }
  
  if (currentExp) {
    experiences.push(currentExp);
  }
  
  return experiences;
}

function parseEducation(educationLines: string[]) {
  const education: ParsedResume['education'] = [];
  
  for (const line of educationLines) {
    const yearMatch = line.match(/(\d{4})/g);
    if (yearMatch) {
      education.push({
        institution: line.split(/\d{4}/)[0].trim(),
        degree: '',
        field: '',
        graduationYear: yearMatch[yearMatch.length - 1]
      });
    }
  }
  
  return education;
}

function parseSkills(skillsText: string) {
  const skills = {
    technical: [] as string[],
    soft: [] as string[],
    languages: [] as string[],
    frameworks: [] as string[],
    tools: [] as string[]
  };
  
  // Extract technical skills
  skills.technical = TECHNICAL_SKILLS.filter(skill => 
    skillsText.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract soft skills
  skills.soft = SOFT_SKILLS.filter(skill => 
    skillsText.toLowerCase().includes(skill.toLowerCase())
  );
  
  return skills;
}

function parseProjects(projectLines: string[]) {
  const projects: ParsedResume['projects'] = [];
  
  let currentProject: any = null;
  
  for (const line of projectLines) {
    if (line.includes(':') || line.includes('-')) {
      if (currentProject) {
        projects.push(currentProject);
      }
      
      const parts = line.split(/[:|-]/).map(p => p.trim());
      currentProject = {
        name: parts[0],
        description: parts[1] || '',
        technologies: [],
        url: ''
      };
      
      // Extract URL
      const urlMatch = line.match(URL_REGEX);
      if (urlMatch) {
        currentProject.url = urlMatch[0];
      }
    } else if (currentProject) {
      currentProject.description += ' ' + line;
    }
    
    // Extract technologies
    if (currentProject) {
      const techMatches = TECHNICAL_SKILLS.filter(skill => 
        line.toLowerCase().includes(skill.toLowerCase())
      );
      currentProject.technologies = [...new Set([...currentProject.technologies, ...techMatches])];
    }
  }
  
  if (currentProject) {
    projects.push(currentProject);
  }
  
  return projects;
}

function parseCertifications(certificationLines: string[]) {
  const certifications: ParsedResume['certifications'] = [];
  
  for (const line of certificationLines) {
    const yearMatch = line.match(/(\d{4})/g);
    if (yearMatch) {
      certifications.push({
        name: line.split(/\d{4}/)[0].trim(),
        issuer: '',
        date: yearMatch[0]
      });
    }
  }
  
  return certifications;
}

function calculateTotalExperience(experiences: ParsedResume['experience']) {
  let totalYears = 0;
  
  for (const exp of experiences) {
    if (exp.startDate && exp.endDate) {
      const startYear = parseInt(exp.startDate);
      const endYear = exp.endDate.toLowerCase().includes('present') || exp.endDate.toLowerCase().includes('current') 
        ? new Date().getFullYear() 
        : parseInt(exp.endDate);
      
      if (!isNaN(startYear) && !isNaN(endYear)) {
        totalYears += endYear - startYear;
      }
    }
  }
  
  return totalYears;
}

// CV score calculation using traditional regex-based approach only
// Note: OpenAI dependency removed, now uses only traditional scoring
export async function calculateCVScore(resume: ParsedResume, jobRequirements: any): Promise<CVScore> {
  console.log('Using traditional CV scoring (OpenAI removed)');
  return calculateCVScoreTraditional(resume, jobRequirements);
}

// Traditional CV score calculation as fallback
export function calculateCVScoreTraditional(resume: ParsedResume, jobRequirements: any): CVScore {
  let skillsScore = 0;
  let experienceScore = 0;
  let educationScore = 0;
  let competencyScore = 0;
  
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const recommendations: string[] = [];
  
  // Calculate skills match
  const allResumeSkills = [
    ...resume.skills.technical,
    ...resume.skills.frameworks,
    ...resume.skills.tools
  ].map(skill => skill.toLowerCase());
  
  const requiredSkills = jobRequirements.skills || [];
  
  for (const requiredSkill of requiredSkills) {
    const skillName = typeof requiredSkill === 'string' ? requiredSkill : requiredSkill.name;
    
    const isMatched = allResumeSkills.some(resumeSkill => 
      resumeSkill.includes(skillName.toLowerCase()) ||
      skillName.toLowerCase().includes(resumeSkill)
    );
    
    if (isMatched) {
      matchedSkills.push(skillName);
    } else {
      missingSkills.push(skillName);
    }
  }
  
  skillsScore = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 0;
  
  // Calculate experience match
  const requiredYears = jobRequirements.experienceYears || 0;
  const candidateYears = resume.totalExperience;
  
  if (requiredYears === 0) {
    experienceScore = 50;
  } else if (candidateYears >= requiredYears) {
    experienceScore = 100;
  } else {
    experienceScore = (candidateYears / requiredYears) * 100;
    recommendations.push(`Experience gap: ${requiredYears - candidateYears} years below requirement`);
  }
  
  // Calculate education match (basic)
  educationScore = resume.education.length > 0 ? 80 : 40;
  
  // Calculate competency match (based on soft skills)
  const resumeSoftSkills = resume.skills.soft.map(skill => skill.toLowerCase());
  competencyScore = resumeSoftSkills.length > 0 ? 70 : 50;
  
  // Calculate overall score (weighted average)
  const overallScore = (
    skillsScore * 0.4 +
    experienceScore * 0.3 +
    educationScore * 0.2 +
    competencyScore * 0.1
  );
  
  // Add general recommendations
  if (overallScore < 60) {
    recommendations.push('Consider additional training or certifications to improve match');
  }
  
  if (missingSkills.length > 0) {
    recommendations.push(`Focus on developing: ${missingSkills.slice(0, 3).join(', ')}`);
  }
  
  return {
    overallScore: Math.round(overallScore),
    breakdown: {
      skillsMatch: Math.round(skillsScore),
      experienceMatch: Math.round(experienceScore),
      educationMatch: Math.round(educationScore),
      culturalFit: Math.round(competencyScore)
    },
    strengths: matchedSkills.map(skill => `Strong in ${skill}`),
    gaps: missingSkills.map(skill => `Missing ${skill}`),
    recommendations
  };
}