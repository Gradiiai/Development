import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { createCandidate } from '@/lib/database/queries/campaigns';

interface CandidateData {
  name: string;
  email: string;
  phone?: string;
  skills?: string;
  experience?: string;
  resume_url?: string;
}

function parseCSV(text: string): CandidateData[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const candidates: CandidateData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const candidate: any = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        candidate[header] = values[index];
      }
    });
    
    if (candidate.name && candidate.email) {
      candidates.push(candidate as CandidateData);
    }
  }
  
  return candidates;
}

function parseExcel(buffer: ArrayBuffer): CandidateData[] {
  // For now, return empty array as XLSX is not available
  // This can be implemented when XLSX package is added
  console.warn('Excel parsing not available - XLSX package not installed');
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('candidates') as File;
    const campaignId = formData.get('campaignId') as string;
    const source = formData.get('source') as string || 'job_portal_import';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload CSV, Excel, or JSON files only.' 
      }, { status: 400 });
    }

    let candidates: CandidateData[] = [];

    try {
      if (fileExtension === '.csv') {
        const text = await file.text();
        candidates = parseCSV(text);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        return NextResponse.json({ 
          error: 'Excel file support is not available yet. Please use CSV or JSON format.' 
        }, { status: 400 });
      } else if (fileExtension === '.json') {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        candidates = Array.isArray(jsonData) ? jsonData : [jsonData];
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse file. Please check the file format and try again.' 
      }, { status: 400 });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ 
        error: 'No valid candidates found in the file. Please check the format and required fields (name, email).' 
      }, { status: 400 });
    }

    // Process candidates and create records
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const candidateData of candidates) {
      try {
        // Validate required fields
        if (!candidateData.name || !candidateData.email) {
          results.failed++;
          results.errors.push(`Missing required fields for candidate: ${candidateData.name || candidateData.email || 'Unknown'}`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(candidateData.email)) {
          results.failed++;
          results.errors.push(`Invalid email format: ${candidateData.email}`);
          continue;
        }

        // Create candidate record
        const candidateRecord = {
          name: candidateData.name,
          email: candidateData.email,
          phone: candidateData.phone || '',
          campaignId,
          source,
          experience: candidateData.experience || '',
          resumeUrl: candidateData.resume_url || '',
          skills: candidateData.skills || ''
        };

        const result = await createCandidate(candidateRecord);
        
        if (result.success) {
          results.imported++;
        } else {
          results.failed++;
          results.errors.push(`Failed to create candidate ${candidateData.name}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing candidate ${candidateData.name}: ${error}`);
        console.error('Error creating candidate:', error);
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      failed: results.failed,
      total: candidates.length,
      errors: results.errors.slice(0, 10), // Limit errors to first 10
      message: `Successfully imported ${results.imported} out of ${candidates.length} candidates`
    });

  } catch (error) {
    console.error('Error in candidate import:', error);
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}