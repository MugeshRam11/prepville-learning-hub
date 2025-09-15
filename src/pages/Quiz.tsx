
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuizHeader from '@/components/quiz/QuizHeader';
import QuizProgress from '@/components/quiz/QuizProgress';
import QuizQuestion from '@/components/quiz/QuizQuestion';
import QuizResults from '@/components/quiz/QuizResults';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
        question: 'What is the result of 4 + 5?',
        options: ['5', '7', '9', '10', '12'],
        correctAnswer: 2,
        optionFeedback: {
          0: { type: 'calculation-error', message: 'Wrong – confusion with subtraction' },
          1: { type: 'interpretation-error', message: 'Wrong – misinterpreted operation' },
          2: { type: 'correct', message: 'Correct – 4 + 5 = 9' },
          3: { type: 'carelessness', message: 'Wrong – carelessness in addition' },
          4: { type: 'concept-error', message: 'Wrong – random guess' }
        }
      },
      {
        id: 2,
        question: 'What is the value of x in the equation 2x + 5 = 15?',
        options: ['5', '10', '7.5', '3'],
        correctAnswer: 0,
        optionFeedback: {
          0: { type: 'correct', message: 'Perfect! Solving 2x + 5 = 15: subtract 5 from both sides to get 2x = 10, then divide by 2 to get x = 5.' },
          1: { type: 'calculation-error', message: 'You may have forgotten to divide by 2 at the final step. After getting 2x = 10, divide both sides by 2.' },
          2: { type: 'carelessness', message: 'Check your arithmetic. When 2x = 10, dividing by 2 gives x = 5, not 7.5.' },
          3: { type: 'concept-error', message: 'Review the steps for solving linear equations. You need to isolate x by undoing the operations.' }
        }
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
  const [isInitialized, setIsInitialized] = useState(false);

  const quizData = quizId ? mockQuizData[quizId as keyof typeof mockQuizData] : null;

  useEffect(() => {
    if (quizData && !isInitialized) {
      console.log('Initializing quiz:', quizData.title);
      setTimeLeft(quizData.timeMinutes * 60);
      setCurrentQuestion(0);
      setSelectedAnswers([]);
      setIsCompleted(false);
      setIsInitialized(true);
    }
  }, [quizData, isInitialized]);

  useEffect(() => {
    if (timeLeft > 0 && !isCompleted && isInitialized) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isCompleted && isInitialized) {
      console.log('Time up! Submitting quiz...');
      handleSubmitQuiz();
    }
  }, [timeLeft, isCompleted, isInitialized]);

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

  // Don't render quiz content until it's properly initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading Quiz...</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAnswerSelect = (answerIndex: number) => {
    console.log('Answer selected:', answerIndex, 'for question:', currentQuestion);
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    console.log('Moving to next question. Current:', currentQuestion, 'Total:', quizData.questions.length);
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      console.log('Last question reached, submitting quiz...');
      handleSubmitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = () => {
    console.log('Quiz submitted with answers:', selectedAnswers);
    setIsCompleted(true);
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
    const correctAnswers = selectedAnswers.filter((answer, index) => 
      answer === quizData.questions[index]?.correctAnswer).length;

    return (
      <>
        <Header />
        <QuizResults
          score={score}
          correctAnswers={correctAnswers}
          totalQuestions={quizData.questions.length}
          onTakeAnother={() => navigate('/quick-practice')}
          onBackToPractice={() => navigate('/practice')}
        />
        <Footer />
      </>
    );
  }

  const currentQ = quizData.questions[currentQuestion];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          <QuizHeader
            subject={quizData.subject}
            timeLeft={timeLeft}
            onBack={() => navigate('/quick-practice')}
          />

          <QuizProgress
            currentQuestion={currentQuestion}
            totalQuestions={quizData.questions.length}
          />

          <QuizQuestion
            question={currentQ}
            selectedAnswer={selectedAnswers[currentQuestion]}
            onAnswerSelect={handleAnswerSelect}
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
            isFirstQuestion={currentQuestion === 0}
            isLastQuestion={currentQuestion === quizData.questions.length - 1}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Quiz;
