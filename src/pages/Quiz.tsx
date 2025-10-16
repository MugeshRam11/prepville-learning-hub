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
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useXPSystem } from '@/hooks/useXPSystem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        question: 'Simplify: 3x + 5x',
        options: ['8x', '8x²', '15x', '2x'],
        correctAnswer: 0
      },
      {
        id: 3,
        question: 'What is the result of x² when x = 4?',
        options: ['8', '16', '12', '20'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'Solve for y: y - 7 = 12',
        options: ['5', '19', '21', '15'],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What is 4(x + 2) when expanded?',
        options: ['4x + 2', '4x + 8', '4x + 4', 'x + 8'],
        correctAnswer: 1
      },
      {
        id: 6,
        question: 'If 3a = 21, what is the value of a?',
        options: ['6', '7', '8', '9'],
        correctAnswer: 1
      },
      {
        id: 7,
        question: 'Simplify: 2x + 3 - x + 5',
        options: ['x + 8', '3x + 8', 'x + 2', '2x + 8'],
        correctAnswer: 0
      },
      {
        id: 8,
        question: 'What is the value of 5n when n = 3?',
        options: ['8', '15', '18', '20'],
        correctAnswer: 1
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
      },
      {
        id: 2,
        question: 'How many sides does a pentagon have?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 1
      },
      {
        id: 3,
        question: 'What is the area of a rectangle with length 8 cm and width 5 cm?',
        options: ['13 cm²', '26 cm²', '40 cm²', '45 cm²'],
        correctAnswer: 2
      },
      {
        id: 4,
        question: 'What is the perimeter of a square with side 6 cm?',
        options: ['12 cm', '18 cm', '24 cm', '36 cm'],
        correctAnswer: 2
      },
      {
        id: 5,
        question: 'What angle is formed by perpendicular lines?',
        options: ['45°', '60°', '90°', '180°'],
        correctAnswer: 2
      },
      {
        id: 6,
        question: 'How many vertices does a cube have?',
        options: ['6', '8', '10', '12'],
        correctAnswer: 1
      },
      {
        id: 7,
        question: 'What is the diameter of a circle if the radius is 7 cm?',
        options: ['3.5 cm', '7 cm', '14 cm', '21 cm'],
        correctAnswer: 2
      },
      {
        id: 8,
        question: 'What type of triangle has all sides equal?',
        options: ['Scalene', 'Isosceles', 'Equilateral', 'Right-angled'],
        correctAnswer: 2
      },
      {
        id: 9,
        question: 'What is the sum of angles in a quadrilateral?',
        options: ['180°', '270°', '360°', '450°'],
        correctAnswer: 2
      },
      {
        id: 10,
        question: 'What is the area of a circle with radius 3 cm? (Use π ≈ 3.14)',
        options: ['9.42 cm²', '18.84 cm²', '28.26 cm²', '37.68 cm²'],
        correctAnswer: 2
      }
    ]
  },
  'physics-motion': {
    title: 'Laws of Motion',
    subject: 'Physics',
    topic: 'Mechanics',
    timeMinutes: 5,
    questions: [
      {
        id: 1,
        question: "What is Newton's First Law of Motion also known as?",
        options: ['Law of Acceleration', 'Law of Inertia', 'Law of Action-Reaction', 'Law of Gravity'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'If a force of 10 N is applied to a mass of 2 kg, what is the acceleration?',
        options: ['5 m/s²', '8 m/s²', '12 m/s²', '20 m/s²'],
        correctAnswer: 0
      },
      {
        id: 3,
        question: 'According to Newton\'s Third Law, for every action there is an equal and opposite...',
        options: ['Force', 'Reaction', 'Motion', 'Velocity'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'What is the SI unit of force?',
        options: ['Joule', 'Watt', 'Newton', 'Pascal'],
        correctAnswer: 2
      },
      {
        id: 5,
        question: 'An object at rest will remain at rest unless acted upon by what?',
        options: ['Gravity', 'Friction', 'An external force', 'Momentum'],
        correctAnswer: 2
      },
      {
        id: 6,
        question: 'What is the formula for force according to Newton\'s Second Law?',
        options: ['F = m/a', 'F = ma', 'F = m + a', 'F = a/m'],
        correctAnswer: 1
      },
      {
        id: 7,
        question: 'If you push a wall with 50 N of force, how much force does the wall push back?',
        options: ['0 N', '25 N', '50 N', '100 N'],
        correctAnswer: 2
      }
    ]
  },
  'chemistry-atoms': {
    title: 'Atomic Structure',
    subject: 'Chemistry',
    topic: 'Atoms & Molecules',
    timeMinutes: 7,
    questions: [
      {
        id: 1,
        question: 'What is the center of an atom called?',
        options: ['Electron', 'Nucleus', 'Proton', 'Neutron'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'Which particle has a negative charge?',
        options: ['Proton', 'Neutron', 'Electron', 'Nucleus'],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'What is the atomic number of an element equal to?',
        options: ['Number of neutrons', 'Number of protons', 'Number of electrons + protons', 'Mass number'],
        correctAnswer: 1
      },
      {
        id: 4,
        question: 'Which particles are found in the nucleus?',
        options: ['Only protons', 'Only neutrons', 'Protons and neutrons', 'Electrons and protons'],
        correctAnswer: 2
      },
      {
        id: 5,
        question: 'What is the mass number of an atom?',
        options: ['Number of protons', 'Number of neutrons', 'Protons + neutrons', 'Protons + electrons'],
        correctAnswer: 2
      },
      {
        id: 6,
        question: 'Which particle has approximately the same mass as a proton?',
        options: ['Electron', 'Neutron', 'Photon', 'Positron'],
        correctAnswer: 1
      },
      {
        id: 7,
        question: 'What are isotopes?',
        options: ['Atoms with same protons, different neutrons', 'Atoms with same neutrons, different protons', 'Atoms with same electrons', 'Different elements'],
        correctAnswer: 0
      },
      {
        id: 8,
        question: 'How many electrons can the first shell of an atom hold?',
        options: ['2', '4', '8', '10'],
        correctAnswer: 0
      },
      {
        id: 9,
        question: 'What determines the chemical properties of an element?',
        options: ['Number of neutrons', 'Number of protons', 'Number of electrons', 'Atomic mass'],
        correctAnswer: 2
      }
    ]
  },
  'biology-cells': {
    title: 'Cell Biology Fundamentals',
    subject: 'Biology',
    topic: 'Cell Biology',
    timeMinutes: 5,
    questions: [
      {
        id: 1,
        question: 'What is the basic unit of life?',
        options: ['Tissue', 'Organ', 'Cell', 'Organism'],
        correctAnswer: 2
      },
      {
        id: 2,
        question: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Chloroplast'],
        correctAnswer: 1
      },
      {
        id: 3,
        question: 'What is the function of the cell membrane?',
        options: ['Protein synthesis', 'Energy production', 'Controls what enters and exits', 'DNA storage'],
        correctAnswer: 2
      },
      {
        id: 4,
        question: 'Which organelle contains genetic material?',
        options: ['Cytoplasm', 'Nucleus', 'Mitochondria', 'Vacuole'],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'What type of cells have a cell wall?',
        options: ['Animal cells only', 'Plant cells only', 'Both animal and plant', 'Neither'],
        correctAnswer: 1
      },
      {
        id: 6,
        question: 'Where does photosynthesis occur in plant cells?',
        options: ['Mitochondria', 'Nucleus', 'Chloroplast', 'Ribosome'],
        correctAnswer: 2
      }
    ]
  },
  'calculus-limits': {
    title: 'Limits and Continuity',
    subject: 'Mathematics',
    topic: 'Calculus',
    timeMinutes: 8,
    questions: [
      {
        id: 1,
        question: 'What is the limit of a constant function f(x) = c as x approaches any value?',
        options: ['0', 'c', 'x', 'undefined'],
        correctAnswer: 1
      },
      {
        id: 2,
        question: 'What is lim(x→2) of x + 3?',
        options: ['2', '3', '5', '6'],
        correctAnswer: 2
      },
      {
        id: 3,
        question: 'A function is continuous at a point if:',
        options: ['The limit exists', 'The function is defined', 'Limit equals function value', 'All of the above'],
        correctAnswer: 3
      },
      {
        id: 4,
        question: 'What is lim(x→0) of sin(x)/x?',
        options: ['0', '1', 'undefined', '∞'],
        correctAnswer: 1
      },
      {
        id: 5,
        question: 'If lim(x→a⁺) f(x) ≠ lim(x→a⁻) f(x), the function has a:',
        options: ['Continuous point', 'Jump discontinuity', 'Removable discontinuity', 'Vertical asymptote'],
        correctAnswer: 1
      },
      {
        id: 6,
        question: 'What is lim(x→∞) of 1/x?',
        options: ['0', '1', '∞', 'undefined'],
        correctAnswer: 0
      },
      {
        id: 7,
        question: 'What is lim(x→3) of x²?',
        options: ['3', '6', '9', '12'],
        correctAnswer: 2
      },
      {
        id: 8,
        question: 'Which of these functions is continuous everywhere?',
        options: ['f(x) = 1/x', 'f(x) = |x|', 'f(x) = 1/(x-2)', 'f(x) = tan(x)'],
        correctAnswer: 1
      },
      {
        id: 9,
        question: 'What is lim(x→0) of (x² + 2x)/x?',
        options: ['0', '1', '2', 'undefined'],
        correctAnswer: 2
      },
      {
        id: 10,
        question: 'A vertical asymptote occurs when:',
        options: ['Limit is finite', 'Limit is infinite', 'Function is continuous', 'Function is differentiable'],
        correctAnswer: 1
      }
    ]
  }
};

const Quiz = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { updateTopicProgress, updatePerformanceCriteria, updateDailyChallenge } = useProgressTracking();
  const { addXP } = useXPSystem();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [progressUpdated, setProgressUpdated] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch quiz from database if UUID format, otherwise use mock data
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) {
        setIsLoading(false);
        return;
      }

      // Check if it's a UUID (database test) or slug (mock data)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId);

      if (isUUID) {
        // Fetch from database
        try {
          const { data: test, error: testError } = await supabase
            .from('tests')
            .select('*')
            .eq('id', quizId)
            .single();

          if (testError) throw testError;

          if (!test) {
            toast.error('Test not found');
            setIsLoading(false);
            return;
          }

          // Fetch questions for this test
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('test_id', quizId)
            .order('created_at');

          if (questionsError) throw questionsError;

          // Format data to match quiz structure
          const formattedQuiz = {
            title: test.title,
            subject: test.test_type || 'General',
            topic: test.description || '',
            timeMinutes: test.time_limit_minutes || 10,
            questions: questions?.map((q, idx) => ({
              id: idx + 1,
              question: q.question_text,
              options: [q.option_a, q.option_b, q.option_c, q.option_d],
              correctAnswer: q.correct_answer ? q.correct_answer.charCodeAt(0) - 65 : 0, // Convert 'A' to 0, 'B' to 1, etc.
              explanation: q.explanation || undefined,
              image: q.question_image_url || undefined
            })) || []
          };

          setQuizData(formattedQuiz);
        } catch (error) {
          console.error('Error fetching quiz:', error);
          toast.error('Failed to load quiz');
        }
      } else {
        // Use mock data
        const mockData = mockQuizData[quizId as keyof typeof mockQuizData];
        setQuizData(mockData || null);
      }

      setIsLoading(false);
    };

    fetchQuizData();
  }, [quizId]);

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

  if (isLoading) {
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

  // Check if quiz has valid questions
  if (!quizData.questions || quizData.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No Questions Available</h1>
            <p className="text-muted-foreground mb-4">This quiz doesn't have any questions yet.</p>
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
            <h1 className="text-2xl font-bold mb-4">Preparing Quiz...</h1>
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
    
    // Update progress after quiz completion
    if (!progressUpdated && quizData) {
      const score = calculateScoreValue();
      const topicName = getTopicFromQuiz(quizData.topic);
      
      // Award XP based on performance
      const xpReward = Math.round(score * 0.2); // 20 XP max for 100%
      addXP('quiz_completed', xpReward, `Completed ${quizData.title}`);
      
      // Update topic progress (1 task completed)
      updateTopicProgress(topicName, 1);
      
      // Update performance criteria based on quiz performance
      const criteriaIncrease = Math.round(score * 0.05); // Up to 5% increase
      if (topicName.toLowerCase().includes('algebra')) {
        updatePerformanceCriteria('knowledge_understanding', criteriaIncrease);
      } else if (topicName.toLowerCase().includes('geometry')) {
        updatePerformanceCriteria('pattern_recognition', criteriaIncrease);
      } else if (topicName.toLowerCase().includes('statistics') || topicName.toLowerCase().includes('probability')) {
        updatePerformanceCriteria('real_life_applications', criteriaIncrease);
      } else {
        updatePerformanceCriteria('communication', criteriaIncrease);
      }
      
      // Update daily challenge
      updateDailyChallenge();
      
      setProgressUpdated(true);
    }
  };
  
  const getTopicFromQuiz = (quizTopic: string): string => {
    if (quizTopic.toLowerCase().includes('algebra')) return 'Algebra';
    if (quizTopic.toLowerCase().includes('geometry')) return 'Geometry';
    if (quizTopic.toLowerCase().includes('stat') || quizTopic.toLowerCase().includes('prob')) return 'Statistics & Probability';
    if (quizTopic.toLowerCase().includes('number')) return 'Number Systems';
    return 'Algebra'; // default
  };
  
  const calculateScoreValue = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (quizData && answer === quizData.questions[index]?.correctAnswer) {
        correct++;
      }
    });
    return quizData ? Math.round((correct / quizData.questions.length) * 100) : 0;
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

  // Extra safety check for current question
  if (!currentQ) {
    console.error('Current question is undefined. Index:', currentQuestion, 'Total:', quizData.questions.length);
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Question Not Found</h1>
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
