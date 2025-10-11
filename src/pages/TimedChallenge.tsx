import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Clock, Zap, Trophy, Play, Pause, RotateCcw } from 'lucide-react';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useXPSystem } from '@/hooks/useXPSystem';
import { toast } from 'sonner';

const TimedChallenge = () => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isActive, setIsActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const { updatePerformanceCriteria } = useProgressTracking();
  const { addXP } = useXPSystem();

  const challenges = [
    {
      question: "Solve: 2x + 5 = 13",
      options: ["x = 3", "x = 4", "x = 5", "x = 6"],
      correct: 1
    },
    {
      question: "What is 15% of 200?",
      options: ["20", "25", "30", "35"],
      correct: 2
    },
    {
      question: "Simplify: 3(x + 4) - 2x",
      options: ["x + 12", "x + 4", "5x + 12", "x + 8"],
      correct: 0
    },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleChallengeComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsActive(true);
    setTimeLeft(300);
    setCurrentQuestion(0);
    setScore(0);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(300);
    setCurrentQuestion(0);
    setScore(0);
  };

  const handleAnswer = async (selectedIndex: number) => {
    if (selectedIndex === challenges[currentQuestion].correct) {
      setScore(score + 1);
      toast.success("Correct! +1 point");
    } else {
      toast.error("Incorrect. Try the next one!");
    }

    if (currentQuestion < challenges.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      await handleChallengeComplete();
    }
  };

  const handleChallengeComplete = async () => {
    setIsActive(false);
    await updatePerformanceCriteria('real_life_applications', 7);
    await addXP('timed_challenge', 15, 'Completed Timed Challenge');
    toast.success(`Challenge Complete! Score: ${score}/${challenges.length}`, {
      description: "+7% Application & +15 XP earned!"
    });
  };

  const progressPercentage = (currentQuestion / challenges.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
              Timed Challenge
            </h1>
            <p className="text-gray-600">Beat the clock and test your skills!</p>
          </div>

          {/* Timer Card */}
          <Card className="mb-6 border-2 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Time Remaining</p>
                    <p className={`text-3xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-orange-600'}`}>
                      {formatTime(timeLeft)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Score</p>
                  <p className="text-3xl font-bold text-green-600">{score}/{challenges.length}</p>
                </div>
              </div>

              <Progress value={(timeLeft / 300) * 100} className="mb-4" />

              <div className="flex gap-2">
                {!isActive ? (
                  <Button onClick={handleStart} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500">
                    <Play className="w-4 h-4 mr-2" />
                    Start Challenge
                  </Button>
                ) : (
                  <Button onClick={handlePause} variant="outline" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question Card */}
          {isActive && (
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Question {currentQuestion + 1} of {challenges.length}</CardTitle>
                  <Badge variant="secondary">{Math.floor(timeLeft / challenges.length)}s per question</Badge>
                </div>
                <Progress value={progressPercentage} className="mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
                  <h3 className="text-xl font-semibold mb-4">{challenges[currentQuestion].question}</h3>
                  
                  <div className="grid gap-3">
                    {challenges[currentQuestion].options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleAnswer(index)}
                        className="justify-start h-auto p-4 text-left hover:bg-orange-100 transition-all"
                      >
                        <span className="font-semibold mr-3 text-orange-600">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Challenge Info */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <h3 className="font-semibold mb-1">Quick Thinking</h3>
                <p className="text-sm text-gray-600">5-minute challenge</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <h3 className="font-semibold mb-1">Earn Rewards</h3>
                <p className="text-sm text-gray-600">+7% Application & +15 XP</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold mb-1">Beat the Clock</h3>
                <p className="text-sm text-gray-600">Test your speed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TimedChallenge;
