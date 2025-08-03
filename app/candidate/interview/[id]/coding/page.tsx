'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  FileCode, 
  Settings2, 
  Undo2, 
  Redo2, 
  Camera, 
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Code2,
  Terminal
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';

interface CodingInterviewProps {
  params: Promise<{ id: string }>;
}

interface CodingQuestion {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: Array<{
    input: string[];
    output: number;
    explanation: string;
  }>;
  constraints: string[];
  hints?: string[];
  starterCode?: string;
  solution?: Record<string, string>;
  primaryLanguage?: string;
  supportedLanguages?: string[];
}

export default function CodingInterviewPage({ params }: CodingInterviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('python'); // Default to Python
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['python', 'javascript', 'java', 'cpp']);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const email = searchParams.get('email');

  // Official CodeMirror 6 language support only
  const LANGUAGE_CONFIG = {
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

  // Generate default starter code based on language and question solution
  const getDefaultCode = (lang: string, questionSolution?: any): string => {
    const config = LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG];
    const comment = config?.comment || '//';
    
    // If question has solution for this language, use it as starter template
    if (questionSolution && questionSolution[lang]) {
      return `${comment} Starter code template\n${comment} You can modify this solution\n\n${questionSolution[lang]}`;
    }
    
    // Default templates for each language
    const templates = {
      'python': `# Write your solution here\ndef solution():\n    # Your code here\n    pass\n\n# Test your solution\nif __name__ == "__main__":\n    result = solution()\n    print(result)`,
      'javascript': `// Write your solution here\nfunction solution() {\n    // Your code here\n    return null;\n}\n\n// Test your solution\nconsole.log(solution());`,
      'typescript': `// Write your solution here\nfunction solution(): any {\n    // Your code here\n    return null;\n}\n\n// Test your solution\nconsole.log(solution());`,
      'java': `public class Solution {\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        // Test your solution\n        System.out.println(sol.solution());\n    }\n    \n    public Object solution() {\n        // Your code here\n        return null;\n    }\n}`,
      'cpp': `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Write your solution here\n    auto solution() {\n        // Your code here\n        return nullptr;\n    }\n};\n\nint main() {\n    Solution sol;\n    // Test your solution\n    cout << "Result: " << endl;\n    return 0;\n}`,
      'c': `#include <stdio.h>\n#include <stdlib.h>\n\n// Write your solution here\nvoid solution() {\n    // Your code here\n    printf("Hello, World!\\n");\n}\n\nint main() {\n    solution();\n    return 0;\n}`,
      'csharp': `using System;\n\npublic class Solution {\n    public static void Main(string[] args) {\n        Solution sol = new Solution();\n        // Test your solution\n        Console.WriteLine(sol.SolutionMethod());\n    }\n    \n    public object SolutionMethod() {\n        // Your code here\n        return null;\n    }\n}`,
      'php': `<?php\n// Write your solution here\nfunction solution() {\n    // Your code here\n    return null;\n}\n\n// Test your solution\necho solution();\n?>`,
      'ruby': `# Write your solution here\ndef solution\n    # Your code here\n    nil\nend\n\n# Test your solution\nputs solution`,
      'go': `package main\n\nimport "fmt"\n\n// Write your solution here\nfunc solution() interface{} {\n    // Your code here\n    return nil\n}\n\nfunc main() {\n    result := solution()\n    fmt.Println(result)\n}`,
      'rust': `fn main() {\n    let result = solution();\n    println!("{:?}", result);\n}\n\n// Write your solution here\nfn solution() -> Option<i32> {\n    // Your code here\n    None\n}`,
      'swift': `import Foundation\n\n// Write your solution here\nfunc solution() -> Any? {\n    // Your code here\n    return nil\n}\n\n// Test your solution\nprint(solution() ?? "No result")`,
      'kotlin': `fun main() {\n    val result = solution()\n    println(result)\n}\n\n// Write your solution here\nfun solution(): Any? {\n    // Your code here\n    return null\n}`,
      'scala': `object Solution {\n    def main(args: Array[String]): Unit = {\n        val result = solution()\n        println(result)\n    }\n    \n    // Write your solution here\n    def solution(): Any = {\n        // Your code here\n        null\n    }\n}`,
      'sql': `-- Write your SQL query here\n-- Example: SELECT * FROM table_name WHERE condition;\n\nSELECT \n    -- Your columns here\nFROM \n    -- Your table here\nWHERE \n    -- Your conditions here;`,
      'html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Solution</title>\n</head>\n<body>\n    <!-- Write your HTML solution here -->\n    <h1>Hello, World!</h1>\n</body>\n</html>`,
      'css': `/* Write your CSS solution here */\n\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}\n\n.container {\n    /* Your styles here */\n}`,
      'dart': `void main() {\n    var result = solution();\n    print(result);\n}\n\n// Write your solution here\ndynamic solution() {\n    // Your code here\n    return null;\n}`,
      'r': `# Write your R solution here\nsolution <- function() {\n    # Your code here\n    return(NULL)\n}\n\n# Test your solution\nresult <- solution()\nprint(result)`,
      'matlab': `function result = solution()\n    % Write your MATLAB solution here\n    % Your code here\n    result = [];\nend\n\n% Test your solution\nresult = solution();\ndisp(result);`
    };
    
    return templates[lang as keyof typeof templates] || templates['python'];
  };

  // Resolve params on component mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Timer functionality
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, isSubmitted]);

  // Fetch interview data
  useEffect(() => {
    if (!interviewId || !email) return;

    const fetchInterview = async () => {
      try {
        setLoading(true);
        
        // Build URL with email parameter
        const url = `/api/candidates/interview/${interviewId}?email=${encodeURIComponent(email)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch interview');
        }
        
        const data = await response.json();
        const interviewInfo = data.interview || data;
        setInterview(interviewInfo);
        
        // Set timer from interview duration (convert minutes to seconds)
        if (interviewInfo.duration) {
          setTimeRemaining(interviewInfo.duration * 60);
        }
        
        // Filter for coding questions and set them
        const codingQuestions = interviewInfo.questions?.filter((q: any) => q.type === 'coding') || [];
        if (codingQuestions.length > 0) {
          setQuestions(codingQuestions);
          
          // Auto-detect primary language from questions
          const firstQuestion = codingQuestions[0];
          let detectedLanguages: string[] = ['python', 'javascript', 'java', 'cpp']; // Default fallback
          let primaryLanguage = 'python';
          
          if (firstQuestion.primaryLanguage) {
            primaryLanguage = firstQuestion.primaryLanguage;
          }
          
          if (firstQuestion.supportedLanguages && Array.isArray(firstQuestion.supportedLanguages)) {
            detectedLanguages = firstQuestion.supportedLanguages;
          }
          
          // Set available languages and primary language
          setAvailableLanguages(detectedLanguages);
          setLanguage(primaryLanguage);
          
          console.log(`🎯 Auto-detected coding languages:`, detectedLanguages);
          console.log(`🚀 Primary language set to:`, primaryLanguage);
          
          // Set initial code from starter code if available
          if (firstQuestion.starterCode) {
            setCode(firstQuestion.starterCode);
          } else {
            setCode(getDefaultCode(primaryLanguage, firstQuestion.solution));
          }
        }
        
        // Auto-start interview if not already started
        if (interviewInfo.status === 'pending' || interviewInfo.status === 'not_started') {
          await startInterview();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId, email]);

  // Update code when language changes
  useEffect(() => {
    if (questions.length > 0) {
      const currentQuestion = questions[activeQuestionIndex];
      if (currentQuestion?.starterCode) {
        setCode(currentQuestion.starterCode);
      } else {
        setCode(getDefaultCode(language, currentQuestion.solution));
      }
    }
  }, [language, activeQuestionIndex, questions]);



  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterview = async () => {
    if (!interviewId || !email) return;

    try {
      const response = await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          email: email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput('Please write some code before running.');
      return;
    }

    setIsRunning(true);
    setOutput('Running code...');

    try {
      const response = await fetch('/api/coding/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          code,
          input: '' // Add test input if needed
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setOutput(result.output || 'Code executed successfully!');
      } else {
        setOutput(`Error: ${result.error || 'Failed to execute code'}`);
      }
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : 'Failed to execute code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitInterview = async () => {
    if (!interviewId || !email) return;

    try {
      const response = await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          answers: {
            code,
            language,
            questionId: questions[activeQuestionIndex]?.id
          },
          timeSpent: interview?.duration ? (interview.duration * 60) - timeRemaining : 0,
          email: email,
          programmingLanguage: language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit interview');
      }

      setIsSubmitted(true);
      
      // Redirect to completion page with email parameter
      router.push(`/candidate/interview/${interviewId}/complete?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit interview');
    }
  };

  const nextQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(prev => prev - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!interview || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>No coding questions found for this interview.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = questions[activeQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Code2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Coding Interview - {language.toUpperCase()}
              </h1>
            </div>
            <Badge variant="outline" className="text-sm">
              Question {activeQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWebcam(!showWebcam)}
              className="flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>{showWebcam ? 'Hide' : 'Show'} Camera</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Problem Statement */}
        <div className="w-1/2 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{currentQuestion.title}</h2>
                <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
              
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">{currentQuestion.description}</p>
              </div>
            </div>

            {/* Examples */}
            {currentQuestion.examples && currentQuestion.examples.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Examples</h3>
                {currentQuestion.examples.map((example, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">Input:</span>
                        <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-sm">
                          {Array.isArray(example.input) ? example.input.join(', ') : example.input}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Output:</span>
                        <code className="ml-2 bg-gray-200 px-2 py-1 rounded text-sm">
                          {example.output}
                        </code>
                      </div>
                      {example.explanation && (
                        <div>
                          <span className="font-medium text-gray-700">Explanation:</span>
                          <span className="ml-2 text-gray-600">{example.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Constraints */}
            {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Constraints</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {currentQuestion.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints */}
            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hints</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {currentQuestion.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Editor Header */}
          <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FileCode className="h-5 w-5" />
              <span className="font-medium">Code Editor</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG]?.name || lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 bg-gray-900">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-gray-900 text-white font-mono text-sm p-4 resize-none border-none outline-none"
              placeholder="// Write your code here..."
              spellCheck={false}
            />
          </div>

          {/* Output Panel */}
          <div className="h-48 bg-gray-100 border-t border-gray-200">
            <Tabs defaultValue="output" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="output" className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4" />
                  <span>Output</span>
                </TabsTrigger>
                <TabsTrigger value="test">Test Cases</TabsTrigger>
              </TabsList>
              
              <TabsContent value="output" className="h-[calc(100%-40px)] p-4">
                <div className="h-full bg-white rounded border overflow-y-auto">
                  <pre className="p-3 text-sm font-mono whitespace-pre-wrap">
                    {output || 'Run your code to see the output here...'}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="test" className="h-[calc(100%-40px)] p-4">
                <div className="h-full bg-white rounded border overflow-y-auto p-3">
                  <p className="text-sm text-gray-600">Test cases will appear here after running your code.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={activeQuestionIndex === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={nextQuestion}
                disabled={activeQuestionIndex === questions.length - 1}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={runCode}
                disabled={isRunning}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </Button>
              
              <Button
                onClick={handleSubmitInterview}
                disabled={isSubmitted}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Submit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Webcam overlay */}
      {showWebcam && (
        <div className="fixed top-4 right-4 w-64 h-48 bg-black rounded-lg border-2 border-white shadow-lg z-50">
          <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-gray-400 text-sm">Camera Preview</span>
          </div>
        </div>
      )}
    </div>
  );
}