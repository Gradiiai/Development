import { NextRequest, NextResponse } from 'next/server';

interface ExecuteRequest {
  language: string;
  code: string;
  input?: string;
}

interface PistonResponse {
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
  };
}

const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

// Language mapping for Piston API
const languageMap: Record<string, { language: string; version: string }> = {
  java: { language: 'java', version: '15.0.2' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  php: { language: 'php', version: '8.2.3' }
};

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json();
    const { language, code, input = '' } = body;

    if (!code || !language) {
      return NextResponse.json(
        { success: false, error: 'Code and language are required' },
        { status: 400 }
      );
    }

    const langConfig = languageMap[language.toLowerCase()];
    if (!langConfig) {
      return NextResponse.json(
        { success: false, error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // Prepare the request for Piston API
    const pistonRequest = {
      language: langConfig.language,
      version: langConfig.version,
      files: [
        {
          name: getFileName(language),
          content: code
        }
      ],
      stdin: input,
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000,
      compile_memory_limit: -1,
      run_memory_limit: -1
    };

    // Execute code using Piston API
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pistonRequest),
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.status}`);
    }

    const result: PistonResponse = await response.json();
    
    // Process the result
    const { stdout, stderr, code: exitCode } = result.run;
    
    if (exitCode !== 0 || stderr) {
      return NextResponse.json({
        success: false,
        error: stderr || 'Code execution failed',
        output: stdout,
        exitCode
      });
    }

    return NextResponse.json({
      success: true,
      output: stdout || 'Code executed successfully (no output)',
      exitCode
    });

  } catch (error) {
    console.error('Code execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

function getFileName(language: string): string {
  const fileNames: Record<string, string> = {
    java: 'Solution.java',
    python: 'solution.py',
    cpp: 'solution.cpp',
    php: 'solution.php'
  };
  return fileNames[language.toLowerCase()] || 'solution.txt';
}

// GET method to check API status
export async function GET() {
  try {
    const response = await fetch(`${PISTON_API_URL}/runtimes`);
    const runtimes = await response.json();
    
    return NextResponse.json({
      status: 'ok',
      supportedLanguages: Object.keys(languageMap),
      availableRuntimes: runtimes.length
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to connect to Piston API' },
      { status: 500 }
    );
  }
}