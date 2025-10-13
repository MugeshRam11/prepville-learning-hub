import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle, FileText, RotateCcw, Eye, Home } from 'lucide-react';
import type { Question, Answer } from './MockExamStart';
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
    return total + (q.subQuestions ? q.subQuestions.length : 1);
  }, 0);
  const attemptedCount = answers.length;
  const unattemptedCount = totalQuestions - attemptedCount;
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
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <h3 className="font-semibold text-gray-800 mb-1">Attempted</h3>
                <p className="text-2xl font-bold text-green-600">{attemptedCount}</p>
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
                  <div className="space-y-4">
                    {questions.map((question: Question, index: number) => <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Q{index + 1}: {question.text.slice(0, 60)}...</h4>
                          <Badge variant="secondary">{question.marks} marks</Badge>
                        </div>
                        
                        {question.subQuestions ? <div className="ml-4 space-y-2">
                            {question.subQuestions.map((subQ, subIndex) => {
                        const answer = getQuestionAnswer(question.id, subQ.id);
                        return <div key={subQ.id} className="flex items-center justify-between">
                                  <span className="text-sm">Q{index + 1}{String.fromCharCode(97 + subIndex)}: {subQ.text.slice(0, 40)}...</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={answer ? "default" : "destructive"}>
                                      {answer ? "Answered" : "Not Answered"}
                                    </Badge>
                                    {answer && <span className="text-xs text-gray-500">{answer.wordCount} words</span>}
                                  </div>
                                </div>;
                      })}
                          </div> : <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Main question</span>
                            <div className="flex items-center gap-2">
                              {(() => {
                          const answer = getQuestionAnswer(question.id);
                          return <>
                                    <Badge variant={answer ? "default" : "destructive"}>
                                      {answer ? "Answered" : "Not Answered"}
                                    </Badge>
                                    {answer && <span className="text-xs text-gray-500">{answer.wordCount} words</span>}
                                  </>;
                        })()}
                            </div>
                          </div>}
                      </div>)}
                  </div>
                </TabsContent>

                <TabsContent value="detailed" className="mt-6">
                  <div className="space-y-6">
                    {answers.map((answer: Answer, index: number) => {
                    const question = questions.find((q: Question) => q.id === answer.questionId);
                    const subQuestion = answer.subQuestionId ? question?.subQuestions?.find(sq => sq.id === answer.subQuestionId) : null;
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
                              <Badge variant="secondary">
                                {subQuestion?.marks || question?.marks} marks
                              </Badge>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm whitespace-pre-wrap">{answer.content}</p>
                          </div>
                        </div>;
                  })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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