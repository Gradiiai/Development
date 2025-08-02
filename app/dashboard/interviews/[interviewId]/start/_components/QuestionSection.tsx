import { Lightbulb, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import MCQSection from "./MCQSection";
import CodingSection from "./CodingSection";

type BaseQuestion = {
  // Support both old and new formats
  Question?: string;
  Answer?: string;
  question?: string;
  correctAnswer?: string;
  type?: 'behavioral' | 'mcq' | 'coding';
};

type MCQOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type MCQQuestion = BaseQuestion & {
  type: 'mcq';
  options?: MCQOption[];
  explanation?: string;
};

type CodingQuestion = BaseQuestion & {
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

type BehavioralQuestion = BaseQuestion & {
  type?: 'behavioral';
};

type InterviewQuestion = MCQQuestion | CodingQuestion | BehavioralQuestion;

type Props = {
  interviewQuestions: InterviewQuestion[];
  activeQuestionIndex: number;
  onMCQAnswer?: (questionIndex: number, selectedOptionId: string) => void;
  onCodingSubmit?: (questionIndex: number, code: string, language: string) => void;
  mcqAnswers?: Record<number, string>;
  codingSubmissions?: Record<number, { code: string; language: string }>;
};

function QuestionSection({
  interviewQuestions,
  activeQuestionIndex,
  onMCQAnswer,
  onCodingSubmit,
  mcqAnswers = {},
  codingSubmissions = {}
}: Props) {
  const textToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  const currentQuestion = interviewQuestions[activeQuestionIndex];

  console.log("Current question object:", currentQuestion);

  if (!currentQuestion) {
    return <div className="p-6 border-r h-full">No question available</div>;
  }

  // Render different question types
  const renderQuestionContent = () => {
    const questionType = currentQuestion.type || 'behavioral';
    
    switch (questionType) {
      case 'mcq':
        return (
          <MCQSection
            question={currentQuestion as MCQQuestion}
            questionIndex={activeQuestionIndex}
            onAnswerSelect={(questionIndex, selectedOptionId, confidence, timeSpent) => {
              if (onMCQAnswer) {
                onMCQAnswer(questionIndex, selectedOptionId);
              }
            }}
            selectedAnswer={mcqAnswers[activeQuestionIndex]}
            timeLimit={120} // 2 minutes per MCQ question
            onTimeUp={() => {
              console.log('Time up for question', activeQuestionIndex);
              // Auto-submit or move to next question
            }}
          />
        );
      
      case 'coding':
        return (
          <CodingSection
            question={currentQuestion as CodingQuestion}
            questionIndex={activeQuestionIndex}
            onCodeSubmit={onCodingSubmit || (() => {})}
            initialCode={codingSubmissions[activeQuestionIndex]?.code}
            initialLanguage={codingSubmissions[activeQuestionIndex]?.language}
          />
        );
      
      case 'behavioral':
      default:
        return (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-semibold">
              Question {activeQuestionIndex + 1}:
            </h2>
            <p className="text-lg">{currentQuestion.question || currentQuestion.Question}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => textToSpeech(currentQuestion.question || currentQuestion.Question || '')}
              >
                <Volume2 size={16} className="mr-2" />
                Read Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.speechSynthesis.cancel()}
              >
                Stop Reading
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                <Lightbulb size={20} />
                Note :
              </h3>
              <p className="text-sm text-blue-600">
                Click on Record Answer when you want to answer the question. At the
                end of interview we will give you the feedback along with correct
                answer for each of question and your answer to compare it.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6 border-r h-full">
      <div className="flex flex-wrap gap-3 mb-6">
        {interviewQuestions.map((question, index) => {
          const questionType = question.type || 'behavioral';
          const getTypeColor = () => {
            switch (questionType) {
              case 'mcq': return 'bg-pink-500';
              case 'coding': return 'bg-indigo-500';
              case 'behavioral': return 'bg-blue-500';
              default: return 'bg-gray-500';
            }
          };
          
          return (
            <div
              key={index}
              className={`p-2 rounded-full text-xs md:text-sm text-center w-10 h-10 flex items-center justify-center text-white ${
                activeQuestionIndex === index
                  ? `${getTypeColor()} ring-4 ring-opacity-30 ring-current`
                  : "bg-gray-300"
              }`}
              title={`Question ${index + 1} - ${questionType.toUpperCase()}`}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
      
      {renderQuestionContent()}
    </div>
  );
}

export default QuestionSection;
