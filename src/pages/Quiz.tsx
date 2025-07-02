import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowLeft, CheckCircle } from 'lucide-react';

// Mock quiz data
const mockQuizData = {
  'speed-distance-time': {
    title: 'Speed, Distance, Time',
    subject: 'Mathematics',
    topic: 'Number (Unit 1)',
    timeMinutes: 5,
    questions: [
      {
        id: 1,
        question: 'A train travels 120 km in 2 hours. What is its average speed?',
        options: ['60 km/h', '100 km/h', '40 km/h', '70 km/h'],
        correctAnswer: 0
      },
      {
        id: 2,
        question: 'If a cyclist moves at 15 km/h for 2.5 hours, how far do they travel?',
        options: ['25.5 km', '35 km', '37.5 km', '30 km'],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'A bus takes 4 hours to travel 180 km. What is its speed?',
        options: ['36 km/h', '45 km/h', '50 km/h', '60 km/h'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'How long will it take a car to travel 150 km at a speed of 50 km/h?',
        options: ['3 hours', '2.5 hours', '4 hours', '3.5 hours'],
        correctAnswer: 0
      },
      {
        id: 5,
        question: 'If a plane flies at 480 km/h and travels for 1.5 hours, how far does it go?',
        options: ['620 km', '700 km', '720 km', '640 km'],
        correctAnswer: 2
      }
    ]
  },
  'algebra-basics': {
    title: 'Algebra Basics',
    subject: 'Mathematics',
    topic: 'Algebra',
    timeMinutes: 6,
    questions: [
      {
        id: 1,
        question: 'What is the value of x in the equation 2x + 5 = 15?',
        options: ['5', '10', '7.5', '3'],
        correctAnswer: 0
      },
      {
        id: 2,
        question: 'Simplify: 3x + 2x - x',
        options: ['4x', '5x', '6x', '2x'],
        correctAnswer: 0
      }
    ]
  },
  'geometry-intro': {
    title: 'Introduction to Geometry',
    subject: 'Mathematics',
    topic: 'Geometry',
    timeMinutes: 8,
    questions: [
      {
        id: 1,
        question: 'What is the sum of angles in a triangle?',
        options: ['90°', '180°', '270°', '360°'],
        correctAnswer: 1
      }
    ]
  }
};

const Quiz = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const quizData = quizId ? mockQuizData[quizId as keyof typeof mockQuizData] : null;

  useEffect(() => {
    if (quizData) {
      setTimeLeft(quizData.timeMinutes * 60); // Convert to seconds
    }
  }, [quizData]);

  useEffect(() => {
    if (timeLeft > 0 && !isCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isCompleted) {
      handleSubmitQuiz();
    }
  }, [timeLeft, isCompleted]);

  if (!quizData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Quiz Not Found</h1>
            <Button onClick={() => navigate('/quick-practice')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quick Practice
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = () => {
    setIsCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quizData.questions[index]?.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quizData.questions.length) * 100);
  };

  if (isCompleted) {
    const score = calculateScore();
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <CardTitle>Quiz Completed!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-3xl font-bold text-green-600">{score}%</p>
                <p className="text-muted-foreground">Your Score</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Correct: {selectedAnswers.filter((answer, index) => 
                  answer === quizData.questions[index]?.correctAnswer).length} / {quizData.questions.length}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => navigate('/quick-practice')}>
                  Take Another Quiz
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/practice')}>
                  Back to Practice
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Quiz Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <Button variant="ghost" onClick={() => navigate('/quick-practice')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{quizData.subject}</Badge>
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Question {currentQuestion + 1} of {quizData.questions.length}</span>
              <span>{Math.round(((currentQuestion + 1) / quizData.questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{currentQ.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full p-4 text-left rounded-lg border transition-colors ${
                      selectedAnswers[currentQuestion] === index
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers[currentQuestion] === undefined}
                >
                  {currentQuestion === quizData.questions.length - 1 ? 'Submit Quiz' : 'Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Quiz;
