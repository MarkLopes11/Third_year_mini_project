'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSummaryContext } from "./SummaryProvider";

const USE_API = true;

const staticQuiz = [
  {
    question: "What is the key feature highlighted regarding the DJI RS 4 Mini's stabilization?",
    options: [
      "It uses a second-generation stabilization algorithm.",
      "It features improved auto-axis locks for quicker setup.",
      "It has a significantly reduced payload capacity compared to previous models.",
      "It utilizes a completely new type of motor technology."
    ],
    answer: "It features improved auto-axis locks for quicker setup."
  },
  {
    question: "What is the maximum payload capacity of the DJI RS 4 Mini?",
    options: [
      "1 kg",
      "1.5 kg",
      "2 kg",
      "2.5 kg"
    ],
    answer: "2 kg"
  }
];

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuizDialog({ open, onOpenChange }: QuizDialogProps) {
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { videoId } = useSummaryContext();

  const fetchQuiz = async () => {
    if (!videoId) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("https://021c-106-194-240-111.ngrok-free.app/generate_quiz/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId }),
      });

      if (!response.ok) throw new Error("Failed to fetch quiz");

      const data = await response.json();

      const transformedQuiz = data.quiz.quiz.map((q: any) => {
        const options = q.options.map((opt: string) => opt.substring(3).trim());
        const answerIndex = q.answer.charCodeAt(0) - 65;
        const answer = options[answerIndex];

        return {
          question: q.question,
          options: options,
          answer: answer
        };
      });

      setQuiz(transformedQuiz);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      setQuiz(staticQuiz);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (value: string) => {
    if (isAnswered) return;

    const isCorrect = value === quiz[currentQuestion]?.answer;

    setScore((prevScore) => {
      const newScore = isCorrect ? prevScore + 1 : prevScore;

      if (currentQuestion === quiz.length - 1) {
        setFinalScore(newScore);
      }

      return newScore;
    });

    setSelectedAnswer(value);
    setIsAnswered(true);

    setTimeout(() => {
      if (currentQuestion < quiz.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer('');
        setIsAnswered(false);
      } else {
        setQuizCompleted(true);
      }
    }, 1500);
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setFinalScore(0);
    setQuizCompleted(false);
    setSelectedAnswer('');
    setIsAnswered(false);

    if (USE_API) {
      fetchQuiz();
    } else {
      setQuiz(staticQuiz);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setCurrentQuestion(0);
      setScore(0);
      setFinalScore(0);
      setQuizCompleted(false);
      setSelectedAnswer('');
      setIsAnswered(false);
      setIsLoading(true);

      if (USE_API) {
        fetchQuiz();
      } else {
        setQuiz(staticQuiz);
        setIsLoading(false);
      }
    }
  }, [open, videoId]);

  const progress = quiz.length > 0 ? ((currentQuestion + 1) / quiz.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quiz Challenge</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Loading quiz questions...</p>
          </div>
        ) : quiz.length > 0 && !quizCompleted ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Question {currentQuestion + 1} of {quiz.length}</span>
              <span>Score: {score}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <h2 className="text-xl font-bold">{quiz[currentQuestion]?.question}</h2>
            <RadioGroup
              value={selectedAnswer}
              onValueChange={(value) => {
                setSelectedAnswer(value);
                if (!isAnswered) handleSubmit(value);
              }}
            >
              {quiz[currentQuestion]?.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem
                    value={option}
                    id={`option-${index}`}
                    disabled={isAnswered}
                  />
                  <Label
                    htmlFor={`option-${index}`}
                    className={
                      isAnswered
                        ? option === quiz[currentQuestion]?.answer
                          ? "text-green-500 border-green-500 font-semibold" // ✅ Correct
                          : option === selectedAnswer
                            ? "text-red-500 border-red-500 font-semibold" // ❌ Wrong
                            : "text-gray-500"
                        : ""
                    }
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : quiz.length > 0 ? (
          <div className="text-center py-6">
            <h2 className="text-2xl font-bold">Quiz Completed!</h2>
            <p className="text-xl">Final Score: {finalScore} out of {quiz.length}</p>
            <Button onClick={handleRetakeQuiz} className="mt-4">
              Retake Quiz
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Alert variant="destructive">
              <AlertTitle>Failed to load quiz</AlertTitle>
              <AlertDescription>
                Unable to load quiz questions. Please try again later.
              </AlertDescription>
            </Alert>
            <Button onClick={handleRetakeQuiz} className="mt-4">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}