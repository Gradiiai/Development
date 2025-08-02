import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Volume2, Clock, Star, AlertCircle, Lightbulb } from "lucide-react";

type MCQOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type MCQQuestion = {
  // Support both old and new formats
  Question?: string;
  Answer?: string;
  question?: string;
  correctAnswer?: string;
  options?: MCQOption[];
  type: 'mcq';
  explanation?: string;
};

type Props = {
  question: MCQQuestion;
  questionIndex: number;
  onAnswerSelect: (questionIndex: number, selectedOptionId: string, confidence?: number, timeSpent?: number) => void;
  selectedAnswer?: string;
  showResults?: boolean;
  timeLimit?: number; // in seconds
  onTimeUp?: () => void;
};

export default function MCQSection({
  question,
  questionIndex,
  onAnswerSelect,
  selectedAnswer,
  showResults = false,
  timeLimit = 120, // 2 minutes default
  onTimeUp
}: Props) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [confidence, setConfidence] = useState(3);
  const [startTime] = useState(Date.now());
  const [hasAnswered, setHasAnswered] = useState(false);
  // Timer effect
  useEffect(() => {
    if (showResults || hasAnswered) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResults, hasAnswered, onTimeUp]);

  const textToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(text);
      speech.rate = 0.9;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = () => {
    return ((timeLimit - timeLeft) / timeLimit) * 100;
  };

  const getTimeColor = () => {
    if (timeLeft <= 30) return "text-red-600";
    if (timeLeft <= 60) return "text-yellow-600";
    return "text-green-600";
  };

  const handleOptionSelect = (optionId: string) => {
    if (!showResults && !hasAnswered) {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      setHasAnswered(true);
      onAnswerSelect(questionIndex, optionId, confidence, timeSpent);
    }
  };

  const handleConfidenceChange = (rating: number) => {
    if (!showResults && !hasAnswered) {
      setConfidence(rating);
    }
  };

  const getOptionStyle = (option: MCQOption) => {
    if (!showResults) {
      return selectedAnswer === option.id
        ? "border-blue-500 bg-blue-50"
        : "border-gray-200 hover:border-gray-300";
    }

    // Show results mode
    if (option.isCorrect) {
      return "border-green-500 bg-green-50";
    }
    if (selectedAnswer === option.id && !option.isCorrect) {
      return "border-red-500 bg-red-50";
    }
    return "border-gray-200";
  };

  const getOptionIcon = (option: MCQOption) => {
    if (!showResults) {
      return selectedAnswer === option.id ? (
        <CheckCircle className="h-5 w-5 text-blue-500" />
      ) : (
        <Circle className="h-5 w-5 text-gray-400" />
      );
    }

    // Show results mode
    if (option.isCorrect) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (selectedAnswer === option.id && !option.isCorrect) {
      return <CheckCircle className="h-5 w-5 text-red-500" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-xl font-bold">
              Question {questionIndex + 1}
            </CardTitle>
            <Badge variant="secondary" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              Multiple Choice
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            {!showResults && (
              <div className={`flex items-center space-x-2 ${getTimeColor()}`}>
                <Clock size={16} />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => textToSpeech(question.question || question.Question || '')}
              className="hover:bg-blue-50"
            >
              <Volume2 size={16} className="mr-2" />
              Listen
            </Button>
          </div>
        </div>
        
        {/* Timer Progress Bar */}
        {!showResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Time Progress</span>
              <span className={`font-medium ${getTimeColor()}`}>
                {timeLeft <= 30 && <AlertCircle size={14} className="inline mr-1" />}
                {Math.round((timeLeft / timeLimit) * 100)}% remaining
              </span>
            </div>
            <Progress 
              value={getTimeProgress()} 
              className="h-2"
              style={{
                background: timeLeft <= 30 ? '#fee2e2' : timeLeft <= 60 ? '#fef3c7' : '#dcfce7'
              }}
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <p className="text-lg font-medium text-gray-800 leading-relaxed">{question.question || question.Question}</p>
        </div>
        
        {/* Confidence Rating */}
        {!showResults && !hasAnswered && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Confidence Level</span>
              </div>
              <span className="text-sm text-yellow-700">How confident are you?</span>
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleConfidenceChange(rating)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    confidence >= rating
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'bg-white border border-yellow-300 text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  <Star size={16} className={confidence >= rating ? 'fill-current' : ''} />
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-yellow-700">
              {confidence === 1 && "Not confident at all"}
              {confidence === 2 && "Slightly confident"}
              {confidence === 3 && "Moderately confident"}
              {confidence === 4 && "Very confident"}
              {confidence === 5 && "Extremely confident"}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {question.options?.map((option, index) => (
            <div
              key={option.id}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                getOptionStyle(option)
              } ${!showResults && !hasAnswered ? 'hover:shadow-lg' : ''} ${
                hasAnswered && !showResults ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              onClick={() => handleOptionSelect(option.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-sm ${
                    selectedAnswer === option.id ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-500'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                </div>
                {getOptionIcon(option)}
                <span className="text-gray-700 flex-1 font-medium">{option.text}</span>
                {showResults && option.isCorrect && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-300">
                    ✓ Correct
                  </Badge>
                )}
                {showResults && selectedAnswer === option.id && !option.isCorrect && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border border-red-300">
                    ✗ Your Answer
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {showResults && question.explanation && (
          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-blue-800 text-lg">Explanation</h4>
            </div>
            <p className="text-blue-700 leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {!showResults && !hasAnswered && (
          <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-green-50 border border-teal-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-teal-800 font-medium mb-1">💡 Pro Tips:</p>
                <ul className="text-sm text-teal-700 space-y-1">
                  <li>• Read all options carefully before selecting</li>
                  <li>• Set your confidence level to track your performance</li>
                  <li>• Use the audio feature if you prefer listening</li>
                  <li>• You cannot change your answer once selected</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {hasAnswered && !showResults && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Answer submitted! You can proceed to the next question.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}