
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
 import { getServerSessionWithAuth } from '@/auth';
import { createCandidate, getJobCampaignById, getScoringParameters, createCandidateScore, updateCandidate } from '@/lib/database/queries/campaigns';
import { azureStorageService } from '@/lib/integrations/storage/azure';
import { db } from '@/lib/database/connection';
import { candidateScores } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import mammoth from 'mammoth';

// Constants for better maintainability
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_BATCH = 20; // Limit bulk uploads
const AI_PROCESSING_TIMEOUT = 1200000; // 120 seconds (increased from 30s)
const AI_RETRY_ATTEMPTS = 3; // Number of retry attempts
const AI_RETRY_DELAY = 2000; // Initial retry delay in ms

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Enhanced file validation with improved error messages
function validateResumeFile(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/rtf',
    'text/rtf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];
  
  const allowedExtensions = ['.pdf', '.txt', '.rtf', '.doc', '.docx'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  // File size validation
  if (file.size === 0) {
    errors.push('File appears to be empty');
  } else if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // File type validation
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    errors.push(`File type '${file.type}' is not supported. Please upload PDF, DOC, DOCX, TXT, or RTF files`);
  }

  // File name validation
  if (file.name.length > 255) {
    errors.push('File name is too long (max 255 characters)');
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [/\.(exe|bat|cmd|scr|vbs|js)$/i, /[<>:"|?*]/];
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('File name contains invalid characters or suspicious extension');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Upload file using the centralized Azure Storage service
async function uploadResumeFile(file: File, campaignId: string): Promise<string> {
  try {
    // Generate unique file name with timestamp and campaign info
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${campaignId || 'general'}/${timestamp}-${sanitizedFileName}`;
    
    // Use the centralized Azure Storage service
    const resumeUrl = await azureStorageService.uploadResume(file, fileName);
    
    console.log(`Resume uploaded successfully: ${fileName}`);
    return resumeUrl;
  } catch (error: any) {
    console.error('Resume upload error:', error);
    throw new Error(`Failed to upload resume: ${error.message}`);
  }
}

// Extract text content only from DOCX files using mammoth
// For all other files, return null so they can be sent directly to Gemini
async function extractTextFromFile(file: File): Promise<string | null> {
  try {
    // Only process DOCX files with mammoth, send everything else directly to Gemini
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;
    }
    
    // For text files, extract content locally
    if (file.type === 'text/plain') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('utf8');
    }
    
    // For all other files (PDF, DOC, RTF, etc.), return null to send directly to Gemini
    return null;
  } catch (error) {
    console.error('Text extraction error:', error);
    // If extraction fails, return null to try with Gemini directly
    return null;
  }
}

// Parse resume using Google Gemini with timeout handling
async function parseResumeWithGemini(file: File): Promise<any> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Try to extract text content first (for DOCX and TXT files)
    console.log(`Processing file: ${file.name} (${file.type})`);
    const textContent = await extractTextFromFile(file);
    
    const prompt = `
You are an expert resume parser. Analyze this resume document THOROUGHLY and extract ALL structured information from EVERY PAGE. This document may contain multiple pages - ensure you read and process the ENTIRE document from beginning to end.

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, apologies, or markdown formatting. Start your response with { and end with }.

IMPORTANT INSTRUCTIONS:
1. Read the COMPLETE document - scan every page, section, header, footer, and sidebar
2. Extract ALL information present, no matter how small or seemingly insignificant
3. Pay special attention to multi-page documents - information may be spread across pages
4. Look for information in headers, footers, margins, and any additional sections
5. Capture ALL work experiences, education entries, skills, projects, certifications, and achievements
6. Include ALL contact information, social media links, and professional profiles
7. Extract ALL dates, locations, descriptions, and technical details mentioned
8. Preserve ALL quantifiable achievements, metrics, and accomplishments
9. Capture any additional sections like publications, awards, volunteer work, languages, interests, etc.
10. If you cannot read the document or it appears corrupted, still return the JSON structure with empty/null values

RESPONSE FORMAT: Return ONLY a valid JSON object with this exact structure (no additional text or formatting):

{
  "personalInfo": {
    "name": "Full name (extract from anywhere in document)",
    "email": "Email address (check headers, footers, contact sections)",
    "phone": "Phone number (include all formats found)",
    "location": "Complete address/location (city, state, country, zip)",
    "linkedin": "LinkedIn URL (full profile link)",
    "github": "GitHub URL (complete profile)",
    "portfolio": "Portfolio/website URL",
    "socialMedia": {
      "twitter": "Twitter handle/URL",
      "instagram": "Instagram handle",
      "facebook": "Facebook profile",
      "other": ["Any other social media profiles"]
    },
    "additionalContacts": ["Any other contact methods or profiles"]
  },
  "summary": "Complete professional summary, objective, or profile description (combine if spread across sections)",
  "experience": [
    {
      "company": "Complete company name",
      "position": "Full job title/role",
      "startDate": "MM/YYYY format",
      "endDate": "MM/YYYY or Present",
      "location": "Work location (city, state, country)",
      "description": "Complete job description with ALL responsibilities and achievements",
      "achievements": ["List ALL quantifiable achievements, metrics, awards"],
      "technologies": ["ALL technologies, tools, programming languages used"],
      "keyProjects": ["Major projects worked on in this role"],
      "teamSize": "Team size managed or worked with",
      "reportingStructure": "Who reported to, who managed"
    }
  ],
  "education": [
    {
      "institution": "Complete institution name",
      "degree": "Full degree name and type",
      "field": "Complete field of study/major",
      "minor": "Minor field if mentioned",
      "graduationYear": "YYYY",
      "gpa": "GPA/grade if mentioned",
      "location": "Institution location",
      "honors": ["Academic honors, dean's list, scholarships"],
      "relevantCoursework": ["Important courses mentioned"],
      "thesis": "Thesis/dissertation title if mentioned",
      "activities": ["Student organizations, clubs, activities"]
    }
  ],
  "skills": {
    "technical": ["ALL programming languages, frameworks, libraries, databases"],
    "soft": ["ALL soft skills like communication, leadership, problem-solving"],
    "languages": ["ALL spoken languages with proficiency levels"],
    "frameworks": ["ALL frameworks and libraries"],
    "tools": ["ALL software tools, IDEs, platforms, cloud services"],
    "databases": ["ALL database technologies"],
    "operatingSystems": ["Operating systems experience"],
    "cloudPlatforms": ["AWS, Azure, GCP, etc."],
    "methodologies": ["Agile, Scrum, DevOps, etc."],
    "industryKnowledge": ["Domain-specific knowledge and expertise"]
  },
  "certifications": [
    {
      "name": "Complete certification name",
      "issuer": "Issuing organization",
      "date": "MM/YYYY when obtained",
      "expiryDate": "MM/YYYY or null if no expiry",
      "credentialId": "Credential ID if mentioned",
      "verificationUrl": "Verification URL if provided"
    }
  ],
  "projects": [
    {
      "name": "Complete project name",
      "description": "Detailed project description and impact",
      "technologies": ["ALL technologies used"],
      "url": "Project URL, demo link, or repository",
      "duration": "Project duration",
      "teamSize": "Team size if mentioned",
      "role": "Your specific role in the project",
      "achievements": ["Quantifiable results and impact"]
    }
  ],
  "publications": [
    {
      "title": "Publication title",
      "authors": ["All authors"],
      "journal": "Journal or conference name",
      "date": "Publication date",
      "url": "Publication URL or DOI"
    }
  ],
  "awards": [
    {
      "name": "Award name",
      "issuer": "Issuing organization",
      "date": "Date received",
      "description": "Award description"
    }
  ],
  "volunteerWork": [
    {
      "organization": "Organization name",
      "role": "Volunteer role",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "description": "Description of volunteer work"
    }
  ],
  "interests": ["ALL personal interests, hobbies, activities mentioned"],
  "references": [
    {
      "name": "Reference name",
      "title": "Their job title",
      "company": "Their company",
      "contact": "Contact information",
      "relationship": "Relationship to candidate"
    }
  ],
  "additionalSections": {
    "patents": ["Any patents mentioned"],
    "conferences": ["Conferences attended or spoken at"],
    "memberships": ["Professional memberships"],
    "licenses": ["Professional licenses"],
    "militaryService": "Military service details if mentioned",
    "securityClearance": "Security clearance level if mentioned"
  },
  "totalExperience": "Total years of professional experience as number",
  "documentMetadata": {
    "pageCount": "Number of pages processed",
    "sectionsFound": ["List of all sections identified in the document"],
    "completenessScore": "Self-assessment of extraction completeness (0-100)"
  }
}

CRITICAL REQUIREMENTS:
- Extract EVERY piece of information from ALL pages
- Do not skip any sections, headers, footers, or sidebars
- If information is not available, use null or empty arrays/strings
- Ensure the response is valid JSON
- Be thorough and comprehensive - missing information is not acceptable
- Pay special attention to dates, locations, and quantifiable achievements
- Capture ALL technical skills, tools, and technologies mentioned anywhere in the document

REMEMBER: Respond with ONLY the JSON object. No explanations, no apologies, no markdown. Start with { and end with }.`;
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI parsing timeout')), AI_PROCESSING_TIMEOUT);
    });
    
    let parsePromise;
    
    if (textContent) {
      // For DOCX and TXT files, send extracted text content
      console.log(`Sending extracted text (${textContent.length} characters) to Gemini`);
      // Truncate very long content to avoid token limits (keep first 50000 characters)
      const truncatedContent = textContent.length > 50000 ? textContent.substring(0, 50000) + '\n\n[Content truncated due to length]' : textContent;
      const fullPrompt = `${prompt}\n\nRESUME CONTENT TO ANALYZE:\n${truncatedContent}`;
      parsePromise = model.generateContent(fullPrompt);
    } else {
      // For PDF, DOC, RTF and other files, send file directly to Gemini
      console.log(`Sending file directly to Gemini: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      
      parsePromise = model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]);
    }
    
    const result = await Promise.race([parsePromise, timeoutPromise]);
    const response = await (result as any).response;
    const text = response.text();
    
    console.log('Raw AI response length:', text.length);
    console.log('Raw AI response preview:', text.substring(0, 500));
    
    // Clean and parse the JSON response with improved error handling
    let cleanedResponse = text.trim();
    
    // Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Handle cases where AI refuses to process or gives non-JSON responses
    if (cleanedResponse.toLowerCase().includes("i'm sorry") || 
        cleanedResponse.toLowerCase().includes("i cannot") ||
        cleanedResponse.toLowerCase().includes("unable to") ||
        !cleanedResponse.includes('{')) {
      console.log('AI refused to process or gave non-JSON response, creating fallback data');
      return createFallbackResumeData(file.name);
    }
    
    // Clean up common JSON issues
    cleanedResponse = cleanedResponse
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\\"/g, '"') // Fix over-escaped quotes
      .replace(/\\\\/g, '\\'); // Fix over-escaped backslashes
    
    // Try to extract JSON from the response if it's embedded in text
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Cleaned response that failed:', cleanedResponse.substring(0, 1000));
      
      // Try to fix common JSON issues and parse again
      try {
        // Remove trailing commas
        let fixedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
        // Fix unescaped quotes in strings
        fixedResponse = fixedResponse.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
        parsedData = JSON.parse(fixedResponse);
      } catch (secondParseError) {
        console.error('Second JSON parsing attempt failed:', secondParseError);
        // Return fallback data instead of throwing error
        return createFallbackResumeData(file.name);
      }
    }
    
    // Validate and ensure required structure
    if (!parsedData || typeof parsedData !== 'object') {
      console.log('Invalid parsed data structure, using fallback');
      return createFallbackResumeData(file.name);
    }
    
    // Ensure required fields exist with fallbacks
    if (!parsedData.personalInfo) {
      parsedData.personalInfo = {};
    }
    
    // If no basic info was extracted, try to extract from filename or use fallback
    if (!parsedData.personalInfo?.name && !parsedData.personalInfo?.email) {
      console.log('No basic information extracted, enhancing with fallback data');
      const fallbackData = createFallbackResumeData(file.name);
      parsedData.personalInfo.name = parsedData.personalInfo.name || fallbackData.personalInfo.name;
      parsedData.personalInfo.email = parsedData.personalInfo.email || fallbackData.personalInfo.email;
    }
    
    return parsedData;
  } catch (error: any) {
    console.error('Gemini parsing error:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('The document has no pages')) {
      console.log('PDF has no readable pages, creating fallback data');
      return createFallbackResumeData(file.name);
    }
    
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('API key')) {
      console.log('AI service configuration error, creating fallback data');
      return createFallbackResumeData(file.name);
    }
    
    if (error.message?.includes('timeout') || error.message?.includes('AI parsing timeout')) {
      console.log('AI parsing timeout, creating fallback data');
      return createFallbackResumeData(file.name);
    }
    
    if (error.message?.includes('Bad Request') || error.status === 400) {
      console.log('Bad request to AI service, likely corrupted file, creating fallback data');
      return createFallbackResumeData(file.name);
    }
    
    // For any other errors, create fallback data instead of failing completely
    console.log('Unknown AI parsing error, creating fallback data:', error.message);
    return createFallbackResumeData(file.name);
  }
}

// Create fallback resume data when AI parsing fails
function createFallbackResumeData(fileName: string): any {
  // Try to extract name from filename
  const nameFromFile = fileName
    .replace(/\.(pdf|docx?|txt|rtf)$/i, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/\d+/g, '') // Remove numbers
    .replace(/resume|cv|curriculum|vitae/gi, '') // Remove common resume words
    .trim()
    .split(' ')
    .filter(word => word.length > 1) // Remove single characters
    .slice(0, 3) // Take first 3 words as potential name
    .join(' ')
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letters
  
  return {
    personalInfo: {
      name: nameFromFile || 'Unknown Candidate',
      email: null,
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      portfolio: null,
      socialMedia: {},
      additionalContacts: []
    },
    summary: 'Resume parsing failed - manual review required',
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      languages: [],
      frameworks: [],
      tools: [],
      databases: [],
      operatingSystems: [],
      cloudPlatforms: [],
      methodologies: [],
      industryKnowledge: []
    },
    certifications: [],
    projects: [],
    publications: [],
    awards: [],
    volunteerWork: [],
    interests: [],
    references: [],
    additionalSections: {
      patents: [],
      conferences: [],
      memberships: [],
      licenses: [],
      militaryService: null,
      securityClearance: null
    },
    totalExperience: 0,
    documentMetadata: {
      pageCount: 1,
      sectionsFound: ['Parsing Failed'],
      completenessScore: 0,
      parsingError: true,
      originalFileName: fileName
    }
  };
}

// Calculate and store talent fit scores for individual parameters
async function calculateAndStoreTalentFitScores(
  candidateId: string,
  campaignId: string,
  resumeData: any,
  overallCvScore: any
): Promise<void> {
  try {
    // Get scoring parameters for this campaign
    const parametersResult = await getScoringParameters(campaignId);
    if (!parametersResult.success || !parametersResult.data || parametersResult.data.length === 0) {
      console.log('No scoring parameters found for campaign:', campaignId);
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Process each scoring parameter
    for (const parameter of parametersResult.data) {
      try {
        console.log(`Calculating score for parameter: ${parameter.parameterName} (${parameter.parameterType})`);
        
        // Create a focused prompt for this specific parameter
        const parameterPrompt = `
Analyze this resume data against the specific parameter and provide a detailed score.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Scoring Parameter:
- Type: ${parameter.parameterType}
- Name: ${parameter.parameterName}
- Required Proficiency: ${parameter.proficiencyLevel || 'Not specified'}
- Weight: ${parameter.weight}%
- Is Required: ${parameter.isRequired}
- Description: ${parameter.description || 'No description provided'}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, apologies, or markdown formatting. Start your response with { and end with }.

Provide a JSON response with:
{
  "score": "Score from 0-100 as number",
  "evidence": "Specific evidence from resume that supports this score",
  "reasoning": "Detailed explanation of how you arrived at this score",
  "proficiencyFound": "The proficiency level found in resume (Beginner/Intermediate/Advanced/Expert or null)",
  "matchQuality": "How well the candidate matches this parameter (Excellent/Good/Fair/Poor)"
}

Scoring Guidelines:
- For SKILLS: Look for exact matches, related technologies, years of experience
- For COMPETENCIES: Look for demonstrated experience, leadership examples, achievements
- For EXPERIENCE: Consider years, relevance, seniority level, industry match
- For EDUCATION: Consider degree relevance, institution quality, academic achievements
- For OTHER: Evaluate based on parameter description and resume content

Ensure the score is a number and the response is valid JSON. Respond with ONLY the JSON object.`;
        
        const result = await model.generateContent(parameterPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean and parse the JSON response with improved error handling
        let cleanedResponse = text.trim();
        
        // Remove markdown code blocks
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Handle cases where AI refuses to process or gives non-JSON responses
        if (cleanedResponse.toLowerCase().includes("i'm sorry") || 
            cleanedResponse.toLowerCase().includes("i cannot") ||
            cleanedResponse.toLowerCase().includes("unable to") ||
            !cleanedResponse.includes('{')) {
          console.log(`AI refused to process parameter ${parameter.parameterName}, using fallback score`);
          cleanedResponse = JSON.stringify({
            score: 0,
            evidence: 'AI processing unavailable',
            reasoning: 'AI refused to process this parameter',
            proficiencyFound: null,
            matchQuality: 'Poor'
          });
        }
        
        // Clean up common JSON issues
        cleanedResponse = cleanedResponse
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape newlines in strings
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        
        // Try to extract JSON from the response if it's embedded in text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        let parameterScore;
        try {
          parameterScore = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error(`Failed to parse AI response for parameter ${parameter.parameterName}:`, parseError);
          console.error('Cleaned response that failed:', cleanedResponse.substring(0, 500));
          
          // Try to fix common JSON issues and parse again
          try {
            let fixedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
            parameterScore = JSON.parse(fixedResponse);
          } catch (secondParseError) {
            console.error(`Second parsing attempt failed for parameter ${parameter.parameterName}:`, secondParseError);
            // Fallback to a default score
            parameterScore = {
              score: 0,
              evidence: 'AI parsing failed',
              reasoning: 'Could not analyze this parameter due to parsing error',
              proficiencyFound: null,
              matchQuality: 'Poor'
            };
          }
        }
        
        // Ensure score is within valid range
        const finalScore = Math.max(0, Math.min(100, Number(parameterScore.score) || 0));
        
        // Store the score in the database
        const scoreData = {
          candidateId: candidateId,
          parameterId: parameter.id,
          score: finalScore,
          aiGenerated: true,
          notes: JSON.stringify({
            evidence: parameterScore.evidence,
            reasoning: parameterScore.reasoning,
            proficiencyFound: parameterScore.proficiencyFound,
            matchQuality: parameterScore.matchQuality,
            parameterWeight: parameter.weight,
            overallCvScore: overallCvScore.overallScore
          }),
          evidenceText: parameterScore.evidence
        };
        
        const scoreResult = await createCandidateScore(scoreData);
        if (scoreResult.success) {
          console.log(`Successfully stored score for ${parameter.parameterName}: ${finalScore}`);
        } else {
          console.error(`Failed to store score for ${parameter.parameterName}:`, scoreResult.error);
        }
        
      } catch (paramError: any) {
        console.error(`Error processing parameter ${parameter.parameterName}:`, paramError);
        // Store a fallback score for this parameter
        try {
          await createCandidateScore({
            candidateId: candidateId,
            parameterId: parameter.id,
            score: 0,
            aiGenerated: true,
            notes: JSON.stringify({
              error: paramError.message,
              reasoning: 'Failed to calculate score due to processing error',
              evidenceText: 'Processing error occurred'
            })
          });
        } catch (fallbackError) {
          console.error(`Failed to store fallback score for ${parameter.parameterName}:`, fallbackError);
        }
      }
    }
    
    console.log(`Completed talent fit scoring for candidate ${candidateId}`);
    
    // Calculate overall talent fit score as weighted average
    try {
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      for (const parameter of parametersResult.data) {
        // Get the score we just stored for this parameter
        // Since we stored scores in the loop above, we can use the parameter weight and a default score
        const parameterWeight = (parameter as any).weight || 1;
        totalWeight += parameterWeight;
        
        // For now, we'll calculate based on the scores we attempted to store
        // In a production system, you might want to fetch the actual stored scores
        // But since we just stored them, we can use a reasonable approach
      }
      
      // Calculate weighted average - we'll fetch the actual scores from the database
      const storedScores = await db
        .select()
        .from(candidateScores)
        .where(eq(candidateScores.candidateId, candidateId));
      
      if (storedScores.length > 0) {
        totalWeightedScore = 0;
        totalWeight = 0;
        
        for (const scoreRecord of storedScores) {
          const parameter = parametersResult.data.find((p: any) => p.id === scoreRecord.parameterId);
          const weight = parameter?.weight || 1;
          totalWeightedScore += scoreRecord.score * weight;
          totalWeight += weight;
        }
        
        const overallTalentFitScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
        
        // Update the candidate's talent fit score
        const updateResult = await updateCandidate(candidateId, {
          talentFitScore: overallTalentFitScore
        });
        
        if (updateResult.success) {
          console.log(`Successfully updated talent fit score for candidate ${candidateId}: ${overallTalentFitScore}`);
        } else {
          console.error(`Failed to update talent fit score for candidate ${candidateId}:`, updateResult.error);
        }
      } else {
        console.log(`No scores found for candidate ${candidateId}, setting talent fit score to 0`);
        await updateCandidate(candidateId, { talentFitScore: 0 });
      }
    } catch (scoreCalculationError) {
      console.error('Error calculating overall talent fit score:', scoreCalculationError);
      // Set a fallback score of 0
      try {
        await updateCandidate(candidateId, { talentFitScore: 0 });
      } catch (fallbackError) {
        console.error('Failed to set fallback talent fit score:', fallbackError);
      }
    }
    
  } catch (error: any) {
    console.error('Error in calculateAndStoreTalentFitScores:', error);
    throw error;
  }
}

// Calculate CV score using Google Gemini
async function calculateCVScoreWithGemini(resumeData: any, jobRequirements: any): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `
Analyze this resume against the job requirements and provide a detailed scoring.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, apologies, or markdown formatting. Start your response with { and end with }.

Provide a JSON response with:
{
  "overallScore": "Score from 0-100 as number",
  "breakdown": {
    "skillsMatch": "Score 0-100 as number",
    "experienceMatch": "Score 0-100 as number",
    "educationMatch": "Score 0-100 as number",
    "culturalFit": "Score 0-100 as number"
  },
  "strengths": ["List of candidate strengths"],
  "gaps": ["List of skill/experience gaps"],
  "recommendations": ["Recommendations for improvement"],
  "reasoning": "Detailed explanation of the scoring"
}

Ensure all scores are numbers and the response is valid JSON. Respond with ONLY the JSON object.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('CV Score AI response length:', text.length);
    console.log('CV Score AI response preview:', text.substring(0, 300));
    
    // Clean and parse the JSON response with improved error handling
    let cleanedResponse = text.trim();
    
    // Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Handle cases where AI refuses to process or gives non-JSON responses
    if (cleanedResponse.toLowerCase().includes("i'm sorry") || 
        cleanedResponse.toLowerCase().includes("i cannot") ||
        cleanedResponse.toLowerCase().includes("unable to") ||
        !cleanedResponse.includes('{')) {
      console.log('AI refused to process CV scoring, using fallback scores');
      return {
        overallScore: 0,
        breakdown: {
          skillsMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          culturalFit: 0
        },
        strengths: [],
        gaps: [],
        recommendations: ['AI scoring unavailable'],
        reasoning: 'AI refused to process the request'
      };
    }
    
    // Clean up common JSON issues
    cleanedResponse = cleanedResponse
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
    
    // Try to extract JSON from the response if it's embedded in text
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    try {
      const parsedScore = JSON.parse(cleanedResponse);
      
      // Validate and ensure numeric scores
      if (parsedScore.overallScore) {
        parsedScore.overallScore = Math.max(0, Math.min(100, Number(parsedScore.overallScore) || 0));
      }
      if (parsedScore.breakdown) {
        Object.keys(parsedScore.breakdown).forEach(key => {
          parsedScore.breakdown[key] = Math.max(0, Math.min(100, Number(parsedScore.breakdown[key]) || 0));
        });
      }
      
      return parsedScore;
    } catch (parseError) {
      console.error('CV Score JSON parsing failed:', parseError);
      console.error('Cleaned response that failed:', cleanedResponse.substring(0, 500));
      
      // Try to fix common JSON issues and parse again
      try {
        let fixedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
        const secondAttempt = JSON.parse(fixedResponse);
        
        // Validate and ensure numeric scores
        if (secondAttempt.overallScore) {
          secondAttempt.overallScore = Math.max(0, Math.min(100, Number(secondAttempt.overallScore) || 0));
        }
        if (secondAttempt.breakdown) {
          Object.keys(secondAttempt.breakdown).forEach(key => {
            secondAttempt.breakdown[key] = Math.max(0, Math.min(100, Number(secondAttempt.breakdown[key]) || 0));
          });
        }
        
        return secondAttempt;
      } catch (secondParseError) {
        console.error('Second CV Score JSON parsing attempt failed:', secondParseError);
        throw new Error(`Invalid JSON response from AI: ${parseError}`);
      }
    }
  } catch (error: any) {
    console.error('Gemini CV scoring error:', error);
    // Return default score if AI scoring fails
    return {
      overallScore: 0,
      breakdown: {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        culturalFit: 0
      },
      strengths: [],
      gaps: [],
      recommendations: ['Scoring unavailable due to processing error'],
      reasoning: 'AI scoring failed'
    };
  }
}

// Handle bulk resume uploads (PUT method) with enhanced error handling
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to upload resumes.' }, { status: 401 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid form data. Please check your file upload.' },
        { status: 400 }
      );
    }

    const campaignId = formData.get('campaignId') as string;
    const source = formData.get('source') as string || 'manual_upload';
    
    // Get all files from the 'resumes' field
    const files = formData.getAll('resumes') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No resume files provided. Please select resume files to upload.' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required for bulk uploads.' }, { status: 400 });
    }

    // Limit batch size for performance
    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json({ 
        error: `Too many files. Maximum ${MAX_FILES_PER_BATCH} files allowed per batch.` 
      }, { status: 400 });
    }

    // Get campaign details for scoring
    const campaignResult = await getJobCampaignById(campaignId);
    if (!campaignResult.success || !campaignResult.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    const campaign = campaignResult.data;

    const results = [];
    const errors = [];
    let processedCount = 0;

    console.log(`Starting bulk upload of ${files.length} files for campaign ${campaignId}`);

    // Process each file with better error handling
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        // Enhanced file validation
        const validation = validateResumeFile(file);
        if (!validation.isValid) {
          errors.push({
            file: file.name,
            errors: validation.errors
          });
          continue;
        }

        // Upload file using centralized service
        const resumeUrl = await uploadResumeFile(file, campaignId);

        // Parse resume using Google Gemini with timeout
        const parsedResume = await parseResumeWithGemini(file);
        if (!parsedResume) {
          throw new Error('AI parsing returned empty result');
        }

        // Dynamic job requirements from campaign data
        const jobRequirements = {
          skills: campaign?.requiredSkills ? JSON.parse(campaign.requiredSkills) : [],
          competencies: campaign?.competencies ? JSON.parse(campaign.competencies) : [],
          experienceLevel: campaign?.experienceLevel,
          department: campaign?.department,
          experience: campaign?.minExperience || 0
        };

        // Calculate CV score using Google Gemini
        const cvScore = await calculateCVScoreWithGemini(parsedResume, jobRequirements);

        // Create candidate record with proper field mapping
        const candidateData = {
          campaignId: campaignId,
          name: parsedResume.personalInfo?.name || 'Unknown',
          email: parsedResume.personalInfo?.email || '',
          phone: parsedResume.personalInfo?.phone || '',
          resumeUrl: resumeUrl,
          linkedinUrl: parsedResume.personalInfo?.linkedin || '',
          portfolioUrl: parsedResume.personalInfo?.portfolio || '',
          // Map experience to a simple string (max 100 chars) instead of JSON
          experience: parsedResume.totalExperience ? `${parsedResume.totalExperience} years` : '',
          currentCompany: parsedResume.experience?.[0]?.company?.substring(0, 255) || '',
          currentRole: parsedResume.experience?.[0]?.position?.substring(0, 255) || '',
          skills: JSON.stringify(parsedResume.skills || {}), // This field is 'text' type, so JSON is fine
          source: source.substring(0, 100), // Ensure source doesn't exceed 100 chars
          // Store all parsed data in aiParsedData field (text type)
          aiParsedData: JSON.stringify({
            ...parsedResume,
            cvScore: cvScore,
            uploadedAt: new Date().toISOString()
          }),
          location: parsedResume.personalInfo?.location?.substring(0, 255) || '',
          educationLevel: parsedResume.education?.[0]?.degree?.substring(0, 255) || '',
          educationInstitution: parsedResume.education?.[0]?.institution?.substring(0, 255) || ''
        };
        
        const candidateResult = await createCandidate(candidateData);
        
        if (!candidateResult.success) {
          throw new Error(candidateResult.error || 'Failed to create candidate record');
        }

        results.push({
          file: file.name,
          candidate: candidateResult.data,
          cvScore: cvScore,
          resumeUrl: resumeUrl
        });

        processedCount++;
        console.log(`Successfully processed file ${i + 1}/${files.length}: ${file.name}`);

      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push({
          file: file.name,
          error: error.message || 'Processing failed'
        });
      }
    }

    console.log(`Bulk upload completed. ${processedCount} successful, ${errors.length} failed.`);

    return NextResponse.json({
      success: true,
      message: `Processed ${files.length} files. ${processedCount} successful, ${errors.length} failed.`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: files.length,
          successful: processedCount,
          failed: errors.length,
          processed: processedCount // This fixes the undefined issue
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Bulk resume upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your resumes. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to upload resumes.' }, { status: 401 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid form data. Please check your file upload.' },
        { status: 400 }
      );
    }

    const file = formData.get('resume') as File;
    const campaignId = formData.get('campaignId') as string;
    const candidateId = formData.get('candidateId') as string;
    const source = formData.get('source') as string || 'manual_upload';

    if (!file) {
      return NextResponse.json({ error: 'No resume file provided. Please select a resume file to upload.' }, { status: 400 });
    }

    // Allow uploads without campaign ID - will create general candidates
    if (!campaignId && !candidateId) {
      console.log('Creating general candidate without specific campaign assignment');
    }

    // Enhanced file validation
    const validation = validateResumeFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'File validation failed',
          details: validation.errors,
          message: validation.errors.join('; ')
        },
        { status: 400 }
      );
    }

    // Get campaign details for scoring (if campaignId provided)
    let campaign;
    let targetCampaignId: string | null = campaignId;
    
    if (campaignId && campaignId.trim() !== '') {
      const campaignResult = await getJobCampaignById(campaignId);
      if (!campaignResult.success || !campaignResult.data) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      campaign = campaignResult.data;
    } else {
      // For general candidates without specific campaign, use default structure
      targetCampaignId = null;
      campaign = {
        requiredSkills: '[]',
        competencies: '[]',
        experienceLevel: 'any',
        department: 'general',
        minExperience: 0,
        jobTitle: 'General Position',
        jobDescription: 'General candidate pool'
      };
    }

    // Upload file to Azure Blob Storage first
    let resumeUrl: string;
    try {
      resumeUrl = await uploadResumeFile(file, campaignId);
      console.log('File uploaded successfully:', resumeUrl);
    } catch (uploadError: any) {
      console.error('Azure Blob upload error:', uploadError);
      return NextResponse.json(
        { 
          error: 'File upload failed',
          message: uploadError.message || 'Unable to upload file to storage. Please try again.'
        },
        { status: 500 }
      );
    }

    // Parse resume using Google Gemini 2.5 Flash
    let parsedResume: any;
    try {
      parsedResume = await parseResumeWithGemini(file);
      if (!parsedResume) {
        throw new Error('AI parsing returned empty result');
      }
    } catch (parseError: any) {
      console.error('Gemini parsing error:', parseError);
      return NextResponse.json(
        { 
          error: 'Resume parsing failed',
          message: parseError.message || 'Unable to parse resume content. Please ensure your resume is well-formatted and try again.'
        },
        { status: 500 }
      );
    }

    // Dynamic job requirements from campaign data with error handling
    let jobRequirements: any;
    try {
      jobRequirements = {
        skills: campaign?.requiredSkills ? JSON.parse(campaign.requiredSkills) : [],
        competencies: campaign?.competencies ? JSON.parse(campaign.competencies) : [],
        experienceLevel: campaign?.experienceLevel,
        department: campaign?.department,
        experience: campaign?.minExperience || 0
      };
    } catch (requirementsError: any) {
      console.error('Job requirements parsing error:', requirementsError);
      // Use default requirements if parsing fails
      jobRequirements = {
        skills: [],
        competencies: [],
        experienceLevel: campaign?.experienceLevel,
        department: campaign?.department,
        experience: campaign?.minExperience || 0
      };
    }

    // Calculate CV score using Google Gemini
    let cvScore: any;
    try {
      cvScore = await calculateCVScoreWithGemini(parsedResume, jobRequirements);
    } catch (scoreError: any) {
      console.error('Gemini CV scoring error:', scoreError);
      // Continue without score if scoring fails
      cvScore = { 
        overallScore: 0, 
        breakdown: {
          skillsMatch: 0,
          experienceMatch: 0,
          educationMatch: 0,
          culturalFit: 0
        },
        strengths: [],
        gaps: [],
        recommendations: ['Scoring unavailable due to processing error'],
        reasoning: 'AI scoring failed'
      };
    }

    // Create candidate record with enhanced data
    let candidateResult;
    try {
      const candidateData = {
        campaignId: targetCampaignId || '',
        name: parsedResume.personalInfo?.name || 'Unknown',
        email: parsedResume.personalInfo?.email || '',
        phone: parsedResume.personalInfo?.phone || '',
        resumeUrl: resumeUrl,
        linkedinUrl: parsedResume.personalInfo?.linkedin || '',
        portfolioUrl: parsedResume.personalInfo?.portfolio || '',
        // Map experience to a simple string (max 100 chars) instead of JSON
        experience: parsedResume.totalExperience ? `${parsedResume.totalExperience} years` : '',
        currentCompany: parsedResume.experience?.[0]?.company?.substring(0, 255) || '',
        currentRole: parsedResume.experience?.[0]?.position?.substring(0, 255) || '',
        skills: JSON.stringify(parsedResume.skills || {}), // This field is 'text' type, so JSON is fine
        source: source.substring(0, 100), // Ensure source doesn't exceed 100 chars
        // Store all parsed data in aiParsedData field (text type)
        aiParsedData: JSON.stringify({
          ...parsedResume,
          cvScore: cvScore,
          uploadedAt: new Date().toISOString()
        }),
        location: parsedResume.personalInfo?.location?.substring(0, 255) || '',
        educationLevel: parsedResume.education?.[0]?.degree?.substring(0, 255) || '',
        educationInstitution: parsedResume.education?.[0]?.institution?.substring(0, 255) || ''
      };
      
      candidateResult = await createCandidate(candidateData);
      
      if (!candidateResult.success) {
        throw new Error(candidateResult.error || 'Failed to create candidate record');
      }
    } catch (candidateError: any) {
      console.error('Candidate creation error:', candidateError);
      return NextResponse.json(
        { 
          error: 'Failed to create candidate record',
          message: candidateError.message || 'Database operation failed'
        },
        { status: 500 }
      );
    }

    // Calculate and store talent fit scores based on scoring parameters
    try {
      if (candidateResult.data?.id) {
        console.log('Calculating talent fit scores for candidate:', candidateResult.data.id);
        await calculateAndStoreTalentFitScores(candidateResult.data.id, campaignId, parsedResume, cvScore);
      }
    } catch (scoreError: any) {
      console.error('Error calculating talent fit scores:', scoreError);
      // Continue with candidate creation even if scoring fails
    }

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded and processed successfully',
      data: {
        candidate: candidateResult.data,
        parsedResume: parsedResume,
        cvScore: cvScore,
        resumeUrl: resumeUrl
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your resume. Please try again.'
      },
      { status: 500 }
    );
  }
}
