import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle, FileText, Loader2, Eye, Home } from 'lucide-react';
import type { Question, Answer } from './MockExamStart';
import AITestEvaluation from '@/components/AITestEvaluation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface EvaluationResult {
  questionId: string;
  marksAwarded: number;
  totalMarks: number;
  evaluationType: string;
  comment: string;
  feedback: string;
}

const MockExamSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    subject,
    topic,
    answers,
    questions,
    timeSpent
  } = location.state || {};

  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(true);
  useEffect(() => {
    if (subject && answers && questions) {
      evaluateAnswers();
    }
  }, []);

  const evaluateAnswers = async () => {
    setIsEvaluating(true);
    try {
      // Prepare questions for AI evaluation
      const questionsForEvaluation = answers.map((answer: Answer) => {
        const question = questions.find((q: Question) => q.id === answer.questionId);
        if (!question) return null;

        let questionText = question.text;
        let referenceAnswer = question.answerKey || '';
        let marks = question.marks;

        // Handle sub-questions
        if (answer.subQuestionId) {
          const subQuestion = question.subQuestions?.find(sq => sq.id === answer.subQuestionId);
          if (subQuestion) {
            questionText = `${question.text}\n${subQuestion.text}`;
            referenceAnswer = subQuestion.answerKey || '';
            marks = subQuestion.marks;
          }
        }

        return {
          questionId: answer.subQuestionId || answer.questionId,
          questionText,
          referenceAnswer,
          studentAnswer: answer.content,
          marks,
          subject,
          topic
        };
      }).filter(Boolean);

      console.log('Sending for evaluation:', questionsForEvaluation);

      const { data, error } = await supabase.functions.invoke('ai-exam-evaluator', {
        body: { questions: questionsForEvaluation }
      });

      if (error) throw error;

      console.log('Evaluation results:', data);
      setEvaluations(data.evaluations || []);
    } catch (error: any) {
      console.error('Evaluation error:', error);
      toast.error('Failed to evaluate answers');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!subject || !answers || !questions) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Results Found</h2>
          <Button onClick={() => navigate('/mock-exams/select')}>
            Take New Exam
          </Button>
        </div>
      </div>;
  }
  const totalQuestions = questions.reduce((total: number, q: Question) => {
    return total + 1 + (q.subQuestions?.length || 0);
  }, 0);
  
  const attemptedCount = answers.length;
  const unattemptedCount = totalQuestions - attemptedCount;
  
  // Calculate total marks and awarded marks from AI evaluation
  const totalMarks = evaluations.reduce((sum, ev) => sum + ev.totalMarks, 0);
  const awardedMarks = evaluations.reduce((sum, ev) => sum + ev.marksAwarded, 0);
  const scorePercentage = totalMarks > 0 ? Math.round((awardedMarks / totalMarks) * 100) : 0;
  
  // Count fully correct answers (100% marks awarded)
  const correctAnswers = evaluations.filter(ev => ev.marksAwarded === ev.totalMarks).length;

  const getEvaluationForAnswer = (questionId: string, subQuestionId?: string) => {
    const evalId = subQuestionId || questionId;
    return evaluations.find(ev => ev.questionId === evalId);
  };
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  const getQuestionAnswer = (questionId: string, subQuestionId?: string) => {
    return answers.find((a: Answer) => a.questionId === questionId && a.subQuestionId === subQuestionId);
  };
  return <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-green-50 to-blue-50 py-8">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mock Exam Completed!</h1>
            <p className="text-gray-600">{subject} - {topic}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">Time Spent</h3>
                <p className="text-2xl font-bold text-blue-600">{formatTime(timeSpent)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">Score</h3>
                {isEvaluating ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">{scorePercentage}%</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">Attempted</h3>
                <p className="text-2xl font-bold text-purple-600">{attemptedCount}/{totalQuestions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">Unattempted</h3>
                <p className="text-2xl font-bold text-red-600">{unattemptedCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Answer Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Answers</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  {isEvaluating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                      <p className="text-gray-600">Evaluating your answers with AI...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question: Question, index: number) => <div key={question.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Q{index + 1}: {question.text.slice(0, 60)}...</h4>
                            <Badge variant="secondary">{question.marks} marks</Badge>
                          </div>
                          
                          {question.subQuestions ? <div className="ml-4 space-y-2">
                              {question.subQuestions.map((subQ, subIndex) => {
                          const answer = getQuestionAnswer(question.id, subQ.id);
                          const evaluation = getEvaluationForAnswer(question.id, subQ.id);
                          return <div key={subQ.id} className="flex items-center justify-between">
                                    <span className="text-sm">Q{index + 1}{String.fromCharCode(97 + subIndex)}: {subQ.text.slice(0, 40)}...</span>
                                    <div className="flex items-center gap-2">
                                      {evaluation && (
                                        <Badge variant={evaluation.marksAwarded === evaluation.totalMarks ? "default" : evaluation.marksAwarded > 0 ? "secondary" : "destructive"}>
                                          {evaluation.marksAwarded}/{evaluation.totalMarks} marks
                                        </Badge>
                                      )}
                                      {!answer && <Badge variant="destructive">Not Answered</Badge>}
                                    </div>
                                  </div>;
                        })}
                            </div> : <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Main question</span>
                              <div className="flex items-center gap-2">
                                {(() => {
                            const answer = getQuestionAnswer(question.id);
                            const evaluation = getEvaluationForAnswer(question.id);
                            return <>
                                      {evaluation && (
                                        <Badge variant={evaluation.marksAwarded === evaluation.totalMarks ? "default" : evaluation.marksAwarded > 0 ? "secondary" : "destructive"}>
                                          {evaluation.marksAwarded}/{evaluation.totalMarks} marks
                                        </Badge>
                                      )}
                                      {!answer && <Badge variant="destructive">Not Answered</Badge>}
                                    </>;
                          })()}
                              </div>
                            </div>}
                        </div>)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="detailed" className="mt-6">
                  {isEvaluating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                      <p className="text-gray-600">Evaluating your answers with AI...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {answers.map((answer: Answer, index: number) => {
                      const question = questions.find((q: Question) => q.id === answer.questionId);
                      const subQuestion = answer.subQuestionId ? question?.subQuestions?.find(sq => sq.id === answer.subQuestionId) : null;
                      const evaluation = getEvaluationForAnswer(answer.questionId, answer.subQuestionId);
                      return <div key={index} className="border rounded-lg p-4">
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-800">
                                {question?.text}
                                {subQuestion && <span className="block text-sm text-gray-600 mt-1">
                                    → {subQuestion.text}
                                  </span>}
                              </h4>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{answer.wordCount} words</Badge>
                                {evaluation && (
                                  <Badge variant={evaluation.marksAwarded === evaluation.totalMarks ? "default" : evaluation.marksAwarded > 0 ? "secondary" : "destructive"}>
                                    {evaluation.marksAwarded}/{evaluation.totalMarks} marks
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded p-3 mb-3">
                              <p className="text-xs text-gray-500 mb-1">Your Answer:</p>
                              <p className="text-sm whitespace-pre-wrap">{answer.content}</p>
                            </div>
                            {evaluation && (
                              <div className={`rounded p-3 ${
                                evaluation.marksAwarded === evaluation.totalMarks 
                                  ? 'bg-green-50 border border-green-200' 
                                  : evaluation.marksAwarded > 0 
                                  ? 'bg-yellow-50 border border-yellow-200' 
                                  : 'bg-red-50 border border-red-200'
                              }`}>
                                <p className="text-xs font-semibold mb-1">{evaluation.feedback}</p>
                                <p className="text-sm">{evaluation.comment}</p>
                              </div>
                            )}
                          </div>;
                    })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* AI Evaluation */}
          <div className="mt-8">
            <AITestEvaluation
              testType="mock"
              subject={subject}
              topic={topic}
              score={scorePercentage}
              correctAnswers={correctAnswers}
              totalQuestions={totalQuestions}
              questions={questions}
              answers={answers}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            
            <Button variant="outline" onClick={() => navigate('/mock-exams/select')} className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Take Different Test
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>;
};
export default MockExamSummary;