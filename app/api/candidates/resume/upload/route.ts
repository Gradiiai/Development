import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateProfiles, candidateDocuments } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import { azureStorageService } from '@/lib/integrations/storage/azure';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Validate resume file
function validateResumeFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size too large (max 10MB)' };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Please upload PDF, DOC, DOCX, or TXT files.' };
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|vbs|js|jar|com|pif)$/i,
    /[<>:"|?*]/,
    /^\./,
    /\s+$/
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return { isValid: false, error: 'Invalid file name' };
  }

  return { isValid: true };
}

// Upload resume file to Azure Storage
async function uploadResumeFile(file: File, candidateId: string): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResult = await azureStorageService.uploadCandidateDocument(
      candidateId,
      buffer,
      file.name,
      file.type,
      'resume',
      {
        originalFileName: file.name,
        description: 'Resume uploaded via resume parser',
        isPrimary: 'true',
        uploadedAt: new Date().toISOString()
      }
    );
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload resume to Azure storage');
    }
    
    console.log(`Resume uploaded successfully to: ${uploadResult.blobPath}`);
    return uploadResult.url;
  } catch (error) {
    console.error('Resume upload error:', error);
    throw new Error('Failed to upload resume to storage');
  }
}

// Extract text from DOCX and TXT files
async function extractTextFromFile(file: File): Promise<string> {
  try {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (file.type === 'text/plain') {
      return await file.text();
    }
    return '';
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

// Parse resume with Gemini AI
async function parseResumeWithGemini(file: File): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an expert resume parser. Extract ALL information from this resume and return it in the following JSON format. Be thorough and extract every piece of information available:

{
  "personalInfo": {
    "firstName": "string",
    "lastName": "string", 
    "email": "string",
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string"
    },
    "linkedIn": "string",
    "website": "string",
    "github": "string",
    "portfolio": "string"
  },
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "location": "string",
      "description": "string",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "string",
      "location": "string",
      "achievements": ["string"]
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"],
    "languages": ["string"],
    "frameworks": ["string"],
    "tools": ["string"]
  },
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "YYYY-MM-DD",
      "expiryDate": "YYYY-MM-DD or null",
      "credentialId": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "url": "string",
      "github": "string"
    }
  ],
  "awards": [
    {
      "name": "string",
      "issuer": "string",
      "date": "YYYY-MM-DD",
      "description": "string"
    }
  ],
  "volunteerWork": [
    {
      "organization": "string",
      "role": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "description": "string"
    }
  ],
  "interests": ["string"],
  "references": [
    {
      "name": "string",
      "title": "string",
      "company": "string",
      "email": "string",
      "phone": "string"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Extract EVERY piece of information from the resume
2. Do NOT skip any sections or information
3. Use null for unavailable information, empty arrays [] for missing lists
4. Ensure all dates are in YYYY-MM-DD format
5. Return ONLY valid JSON, no markdown or explanations
6. Pay special attention to contact information, work experience, and skills
7. Extract all technical skills, tools, and technologies mentioned
8. Include all achievements and quantifiable results
`;

    let result;
    
    // For DOCX and TXT files, extract text first
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.type === 'text/plain') {
      const extractedText = await extractTextFromFile(file);
      if (extractedText) {
        result = await model.generateContent([prompt, extractedText]);
      } else {
        throw new Error('Failed to extract text from file');
      }
    } else {
      // For PDF and other files, send directly
      const fileData = await file.arrayBuffer();
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: Buffer.from(fileData).toString('base64'),
            mimeType: file.type
          }
        }
      ]);
    }

    const response = await result.response;
    let text = response.text();

    // Clean and parse JSON response
    text = text.replace(/```json\s*|\s*```/g, '');
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    text = text.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Try to fix common JSON issues
      text = text.replace(/,(\s*[}\]])/g, '$1');
      text = text.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
      
      try {
        return JSON.parse(text);
      } catch (secondParseError) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Failed to parse resume data');
      }
    }
  } catch (error) {
    console.error('Error parsing resume with Gemini:', error);
    throw new Error('Failed to parse resume with AI');
  }
}

// Create fallback resume data
function createFallbackResumeData(fileName: string): any {
  const nameMatch = fileName.match(/^(.+?)(?:_resume|_cv|\.|$)/i);
  const extractedName = nameMatch ? nameMatch[1].replace(/[_-]/g, ' ') : '';
  
  return {
    personalInfo: {
      firstName: extractedName.split(' ')[0] || null,
      lastName: extractedName.split(' ').slice(1).join(' ') || null,
      email: null,
      phone: null,
      address: {
        street: null,
        city: null,
        state: null,
        zipCode: null,
        country: null
      },
      linkedIn: null,
      website: null,
      github: null,
      portfolio: null
    },
    summary: null,
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
    awards: [],
    volunteerWork: [],
    interests: [],
    references: []
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No resume file provided. Please select a resume file to upload.' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateResumeFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const candidateId = candidateUser[0].id.toString();

    // Upload file to Azure Storage
    let resumeUrl: string;
    try {
      resumeUrl = await uploadResumeFile(file, candidateId);
    } catch (error) {
      console.error('File upload failed:', error);
      return NextResponse.json(
        { error: 'Failed to upload resume file' },
        { status: 500 }
      );
    }

    // Parse resume with Gemini AI
    let parsedData: any;
    try {
      parsedData = await parseResumeWithGemini(file);
    } catch (error) {
      console.error('Resume parsing failed:', error);
      // Use fallback data if parsing fails
      parsedData = createFallbackResumeData(file.name);
    }

    // Save resume document record
    const [resumeDocument] = await db
      .insert(candidateDocuments)
      .values({
        candidateId: candidateUser[0].id,
        documentType: 'resume',
        documentName: file.name,
        originalFileName: file.name,
        fileUrl: resumeUrl,
        fileSize: file.size,
        fileType: file.type,
        description: 'Resume uploaded by candidate',
        version: 1,
        isDefault: true,
        isPublic: false,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Update candidate profile with parsed data
    try {
      const profileData = {
        firstName: parsedData.personalInfo?.firstName || candidateUser[0].firstName,
        lastName: parsedData.personalInfo?.lastName || candidateUser[0].lastName,
        phone: parsedData.personalInfo?.phone || candidateUser[0].phone,
        address: parsedData.personalInfo?.address?.street || null,
        city: parsedData.personalInfo?.address?.city || null,
        state: parsedData.personalInfo?.address?.state || null,
        zipCode: parsedData.personalInfo?.address?.zipCode || null,
        country: parsedData.personalInfo?.address?.country || null,
        linkedInUrl: parsedData.personalInfo?.linkedIn || null,
        githubUrl: parsedData.personalInfo?.github || null,
        portfolioUrl: parsedData.personalInfo?.portfolio || null,
        websiteUrl: parsedData.personalInfo?.website || null,
        summary: parsedData.summary || null,
        experience: parsedData.experience ? JSON.stringify(parsedData.experience) : null,
        education: parsedData.education ? JSON.stringify(parsedData.education) : null,
        skills: parsedData.skills ? JSON.stringify(parsedData.skills) : null,
        certifications: parsedData.certifications ? JSON.stringify(parsedData.certifications) : null,
        projects: parsedData.projects ? JSON.stringify(parsedData.projects) : null,
        awards: parsedData.awards ? JSON.stringify(parsedData.awards) : null,
        volunteerWork: parsedData.volunteerWork ? JSON.stringify(parsedData.volunteerWork) : null,
        interests: parsedData.interests ? JSON.stringify(parsedData.interests) : null,
        references: parsedData.references ? JSON.stringify(parsedData.references) : null,
        resumeUrl: resumeUrl,
        updatedAt: new Date(),
      };

      // Update candidate user basic info
      await db
        .update(candidateUsers)
        .set({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          updatedAt: new Date(),
        })
        .where(eq(candidateUsers.id, candidateUser[0].id));

      // Check if profile exists
      const existingProfile = await db
        .select()
        .from(candidateProfiles)
        .where(eq(candidateProfiles.candidateId, candidateUser[0].id))
        .limit(1);

      if (existingProfile.length > 0) {
        // Update existing profile
        await db
          .update(candidateProfiles)
          .set(profileData)
          .where(eq(candidateProfiles.candidateId, candidateUser[0].id));
      } else {
        // Create new profile
        await db
          .insert(candidateProfiles)
          .values({
            candidateId: candidateUser[0].id,
            ...profileData,
            createdAt: new Date(),
          });
      }
    } catch (error) {
      console.error('Error updating candidate profile:', error);
      // Continue even if profile update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded and processed successfully',
      data: {
        documentId: resumeDocument.id,
        fileName: file.name,
        fileUrl: resumeUrl,
        parsedData: parsedData,
        uploadedAt: resumeDocument.uploadedAt,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}