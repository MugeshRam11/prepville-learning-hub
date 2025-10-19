import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle, XCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AITestEvaluationProps {
  testType: 'mock' | 'quiz';
  subject: string;
  topic?: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  questions?: any[];
  answers?: any[];
}

interface EvaluationResult {
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  performanceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
}

const AITestEvaluation: React.FC<AITestEvaluationProps> = ({
  testType,
  subject,
  topic,
  score,
  correctAnswers,
  totalQuestions,
  questions,
  answers
}) => {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    evaluateTest();
  }, []);

  const evaluateTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('chatbot', {
        body: {
          mode: 'evaluate_test',
          testType,
          subject,
          topic,
          score,
          correctAnswers,
          totalQuestions,
          questions: questions?.slice(0, 5), // Send only first 5 questions to avoid token limits
          answers: answers?.slice(0, 5)
        }
      });

      if (functionError) {
        console.error('Error calling chatbot function:', functionError);
        
        // Check for payment/credits error
        if (functionError.message?.includes('402') || functionError.message?.includes('credits')) {
          const creditsMsg = 'Out of AI credits. Please add credits in Settings → Workspace → Usage to continue.';
          setError(creditsMsg);
          toast.error(creditsMsg, { duration: 8000 });
        } else {
          setError(functionError.message || 'Failed to generate evaluation');
          toast.error('Failed to generate AI evaluation');
        }
        setIsLoading(false);
        return;
      }

      if (data?.evaluation) {
        setEvaluation(data.evaluation);
      } else {
        throw new Error('Invalid evaluation response');
      }
    } catch (err: any) {
      console.error('AI Evaluation error:', err);
      
      // More specific error messages
      if (err.message?.includes('402') || err.message?.includes('credits')) {
        const creditsMsg = 'Out of AI credits. Go to Settings → Workspace → Usage to add more.';
        setError(creditsMsg);
        toast.error(creditsMsg, { duration: 8000 });
      } else {
        setError(err.message || 'Failed to generate evaluation');
        toast.error('Failed to generate AI evaluation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'average': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'needs-improvement': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'good': return <TrendingUp className="w-6 h-6 text-blue-600" />;
      case 'average': return <Lightbulb className="w-6 h-6 text-yellow-600" />;
      case 'needs-improvement': return <XCircle className="w-6 h-6 text-red-600" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Test Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            <p className="text-center text-muted-foreground">
              Analyzing your performance...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !evaluation) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-6 h-6" />
            Evaluation Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error || 'Failed to generate evaluation'}</p>
          <Button onClick={evaluateTest} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Test Performance Analysis
          </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="text-center p-6 bg-white rounded-lg border-2 border-purple-200">
          <div className="text-5xl font-bold text-purple-600 mb-2">{score}%</div>
          <div className="text-sm text-gray-600">
            {correctAnswers} correct out of {totalQuestions} questions
          </div>
        </div>

        {/* Performance Level */}
        <div className={`p-4 rounded-lg border-2 ${getPerformanceColor(evaluation.performanceLevel)}`}>
          <div className="flex items-center gap-3 mb-2">
            {getPerformanceIcon(evaluation.performanceLevel)}
            <h3 className="font-semibold text-lg capitalize">
              {evaluation.performanceLevel.replace('-', ' ')}
            </h3>
          </div>
          <p className="text-sm">{evaluation.overallFeedback}</p>
        </div>

        {/* Wrong Answers & Areas for Improvement */}
        {evaluation.weaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-600">Areas That Need Attention</h3>
            </div>
            <div className="space-y-2">
              {evaluation.weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-red-600 font-medium">•</span>
                  <span className="text-sm text-red-800">{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Suggestions */}
        {evaluation.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-600">How to Improve</h3>
            </div>
            <div className="space-y-2">
              {evaluation.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-600 font-medium">{index + 1}.</span>
                  <span className="text-sm text-blue-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITestEvaluation;
