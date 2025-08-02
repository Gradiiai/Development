import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Play, Volume2, Copy, Check } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";

type CodingQuestion = {
  // Support both old and new formats
  Question?: string;
  Answer?: string;
  question?: string;
  correctAnswer?: string;
  type: 'coding';
  difficulty?: 'easy' | 'medium' | 'hard';
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints?: string[];
  hints?: string[];
};

type Props = {
  question: CodingQuestion;
  questionIndex: number;
  onCodeSubmit: (questionIndex: number, code: string, language: string) => void;
  initialCode?: string;
  initialLanguage?: string;
};

export default function CodingSection({
  question,
  questionIndex,
  onCodeSubmit,
  initialCode = '',
  initialLanguage = 'javascript'
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const textToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  const handleSubmit = () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please write some code before submitting.",
        variant: "destructive"
      });
      return;
    }
    onCodeSubmit(questionIndex, code, language);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageTemplate = (lang: string) => {
    const templates: Record<string, string> = {
      javascript: `// Write your solution here
function solution() {
    // Your code here
    return result;
}`,
      python: `# Write your solution here
def solution():
    # Your code here
    return result`,
      java: `// Write your solution here
public class Solution {
    public int solution() {
        // Your code here
        return result;
    }
}`,
      cpp: `// Write your solution here
#include <iostream>
using namespace std;

int solution() {
    // Your code here
    return result;
}`
    };
    return templates[lang] || templates.javascript;
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (!code.trim()) {
      setCode(getLanguageTemplate(newLanguage));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Question {questionIndex + 1}
            <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-800">
              Coding
            </Badge>
            {question.difficulty && (
              <Badge className={`ml-2 ${getDifficultyColor(question.difficulty)}`}>
                {question.difficulty}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => textToSpeech(question.question || question.Question || '')}
            >
              <Volume2 size={16} className="mr-2" />
              Read Question
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(code)}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Problem Statement</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{question.question || question.Question}</p>
        </div>

        {question.examples && question.examples.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Examples</h3>
            <div className="space-y-3">
              {question.examples.map((example, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Input:</span>
                      <pre className="text-sm bg-white p-2 rounded border mt-1">{example.input}</pre>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Output:</span>
                      <pre className="text-sm bg-white p-2 rounded border mt-1">{example.output}</pre>
                    </div>
                  </div>
                  {example.explanation && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-600">Explanation:</span>
                      <p className="text-sm text-gray-700 mt-1">{example.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {question.constraints && question.constraints.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Constraints</h3>
            <ul className="list-disc list-inside space-y-1">
              {question.constraints.map((constraint, index) => (
                <li key={index} className="text-sm text-gray-700">{constraint}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Your Solution</h3>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={getLanguageTemplate(language)}
            className="font-mono text-sm min-h-[300px] resize-y"
          />
        </div>

        {question.hints && question.hints.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Hints</h3>
            <ul className="list-disc list-inside space-y-1">
              {question.hints.map((hint, index) => (
                <li key={index} className="text-sm text-blue-700">{hint}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Test your solution with the provided examples before submitting.
          </div>
          <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
            <Play size={16} className="mr-2" />
            Submit Solution
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}