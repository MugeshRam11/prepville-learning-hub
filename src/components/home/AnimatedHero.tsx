import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Clock, Zap, ArrowRight, Sparkles, Play, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AnimatedHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentWord, setCurrentWord] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [progress, setProgress] = useState(0);

  const words = ['Smarter', 'Faster', 'Better', 'Higher'];
  
  // Animated word cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Mock question interaction
  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    setTimeout(() => setShowFeedback(true), 300);
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedOption(null);
    }, 2500);
  };

  const mockQuestion = {
    text: "What is the derivative of x²?",
    options: ["x", "2x", "2x²", "x/2"],
    correct: 1
  };

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        
        {/* Floating question cards */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-16 h-16 bg-card rounded-xl shadow-lg border border-border/50"
            style={{
              left: `${10 + i * 20}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <div className="flex items-center justify-center h-full text-primary font-bold text-xl">
              {['A', 'B', 'C', 'D', '?'][i]}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="container relative z-10 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Learning Platform</span>
            </motion.div>

            {/* Main Headline */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              >
                Practice{' '}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWord}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                  >
                    {words[currentWord]}.
                  </motion.span>
                </AnimatePresence>
                <br />
                <span className="text-foreground">Score Higher.</span>
                <br />
                <span className="text-muted-foreground">Succeed Faster.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed"
              >
                Thousands of exam-oriented questions, intelligent practice, 
                instant feedback, and performance tracking — all in one platform.
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground text-lg px-8 h-14 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                {user ? (
                  <LayoutDashboard className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                )}
                {user ? 'Go to Dashboard' : 'Start Practicing'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 hover:bg-primary/5 transition-all duration-300"
                onClick={() => navigate(user ? '/mock-exams/select' : '/pricing')}
              >
                {user ? 'Mock Exams' : 'View Plans'}
              </Button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-wrap gap-8 pt-4"
            >
              {[
                { value: '10K+', label: 'Questions' },
                { value: '500+', label: 'Video Hours' },
                { value: '2.5K+', label: 'Students' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl shadow-primary/10">
              <CardContent className="p-0">
                {/* Mock Test Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      <span className="font-semibold">Quick Practice</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>02:45</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 bg-primary-foreground/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-foreground rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Question Area */}
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      Question 3 of 10
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">
                      {mockQuestion.text}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {mockQuestion.options.map((option, index) => (
                      <motion.button
                        key={index}
                        onClick={() => handleOptionSelect(index)}
                        disabled={selectedOption !== null}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          selectedOption === index
                            ? showFeedback
                              ? index === mockQuestion.correct
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-red-500 bg-red-50 text-red-700'
                              : 'border-primary bg-primary/5'
                            : selectedOption !== null && index === mockQuestion.correct && showFeedback
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                        whileHover={{ scale: selectedOption === null ? 1.02 : 1 }}
                        whileTap={{ scale: selectedOption === null ? 0.98 : 1 }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                            selectedOption === index && showFeedback
                              ? index === mockQuestion.correct
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-muted'
                          }`}>
                            {selectedOption === index && showFeedback ? (
                              index === mockQuestion.correct ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                '✗'
                              )
                            ) : (
                              String.fromCharCode(65 + index)
                            )}
                          </span>
                          <span className="font-medium">{option}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Feedback Panel */}
                  <AnimatePresence>
                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className={`p-4 rounded-xl ${
                          selectedOption === mockQuestion.correct
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedOption === mockQuestion.correct
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}>
                            {selectedOption === mockQuestion.correct ? (
                              <Check className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-white font-bold">✗</span>
                            )}
                          </div>
                          <div>
                            <h4 className={`font-semibold ${
                              selectedOption === mockQuestion.correct
                                ? 'text-green-700'
                                : 'text-red-700'
                            }`}>
                              {selectedOption === mockQuestion.correct ? 'Correct!' : 'Incorrect'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              The derivative of x² is 2x (using the power rule: nx^(n-1))
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            {/* Floating elements around the card */}
            <motion.div
              className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Live Demo
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedHero;
