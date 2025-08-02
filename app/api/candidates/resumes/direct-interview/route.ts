import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const AI_PROCESSING_TIMEOUT = 15000; // 15 seconds (shorter for basic parsing)

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Validate file for basic parsing
function validateFile(file: File): { isValid: boolean; errors: string[] } {
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

  if (file.size === 0) {
    errors.push('File appears to be empty');
  } else if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    errors.push('File type not supported. Please upload PDF, DOC, DOCX, TXT, or RTF files');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Extract text from DOCX and TXT files
async function extractTextFromFile(file: File): Promise<string | null> {
  try {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;
    }
    
    if (file.type === 'text/plain') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('utf8');
    }
    
    return null;
  } catch (error) {
    console.error('Text extraction error:', error);
    return null;
  }
}

// Parse resume for basic info only using Gemini
async function parseBasicInfoWithGemini(file: File): Promise<any> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log(`Processing file for basic info: ${file.name} (${file.type})`);
    const textContent = await extractTextFromFile(file);
    
    const prompt = `
You are a resume parser focused on extracting ONLY basic contact information for interview scheduling.

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text, apologies, or markdown formatting. Start your response with { and end with }.

INSTRUCTIONS:
1. Extract ONLY the candidate's name, email address, and phone number
2. Look for this information anywhere in the document (headers, footers, contact sections)
3. If any information is not found, use null for that field
4. Ensure the response is valid JSON

RESPONSE FORMAT: Return ONLY a valid JSON object with this exact structure:

{
  "name": "Full candidate name (first and last name)",
  "email": "Email address",
  "phone": "Phone number (any format)"
}

REMEMBER: Respond with ONLY the JSON object. No explanations, no apologies, no markdown. Start with { and end with }.`;
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI parsing timeout')), AI_PROCESSING_TIMEOUT);
    });
    
    let parsePromise;
    
    if (textContent) {
      console.log(`Sending extracted text (${textContent.length} characters) to Gemini`);
      const truncatedContent = textContent.length > 10000 ? textContent.substring(0, 10000) : textContent;
      const fullPrompt = `${prompt}\n\nRESUME CONTENT TO ANALYZE:\n${truncatedContent}`;
      parsePromise = model.generateContent(fullPrompt);
    } else {
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
    
    console.log('Basic parsing AI response length:', text.length);
    
    let cleanedResponse = text.trim();
    
    // Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Handle non-JSON responses
    if (!cleanedResponse.includes('{')) {
      console.log('AI gave non-JSON response, creating fallback');
      return createFallbackBasicData(file.name);
    }
    
    // Extract JSON from response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      return createFallbackBasicData(file.name);
    }
    
    // Validate structure
    if (!parsedData || typeof parsedData !== 'object') {
      return createFallbackBasicData(file.name);
    }
    
    // Ensure all fields exist
    return {
      name: parsedData.name || null,
      email: parsedData.email || null,
      phone: parsedData.phone || null
    };
    
  } catch (error: any) {
    console.error('Basic info parsing error:', error);
    return createFallbackBasicData(file.name);
  }
}

// Create fallback data when parsing fails
function createFallbackBasicData(fileName: string): any {
  // Try to extract name from filename
  const nameFromFile = fileName
    .replace(/\.(pdf|docx?|txt|rtf)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\d+/g, '')
    .replace(/resume|cv|curriculum|vitae/gi, '')
    .trim()
    .split(' ')
    .filter(word => word.length > 1)
    .slice(0, 3)
    .join(' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    name: nameFromFile || null,
    email: null,
    phone: null
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'File validation failed', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Parse basic info
    const basicInfo = await parseBasicInfoWithGemini(file);
    
    return NextResponse.json({
      success: true,
      data: basicInfo
    });
    
  } catch (error: any) {
    console.error('Basic resume parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse resume', details: error.message },
      { status: 500 }
    );
  }
}