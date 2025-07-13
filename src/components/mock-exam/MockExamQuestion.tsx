
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Check } from 'lucide-react';
import MathEditor from './MathEditor';
import type { Question } from '@/pages/MockExamStart';

interface MockExamQuestionProps {
  question: Question;
  subQuestionIndex: number | null;
  answer: string;
  onAnswerChange: (questionId: string, content: string, subQuestionId?: string) => void;
}

const MockExamQuestion = ({
  question,
  subQuestionIndex,
  answer,
  onAnswerChange
}: MockExamQuestionProps) => {
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(answer);

  React.useEffect(() => {
    setCurrentAnswer(answer);
  }, [answer]);

  const handleAnswerChange = (content: string) => {
    setCurrentAnswer(content);
    const subQuestionId = subQuestionIndex !== null 
      ? question.subQuestions?.[subQuestionIndex]?.id 
      : undefined;
    onAnswerChange(question.id, content, subQuestionId);
  };

  const insertMathEquation = (equation: string) => {
    const newContent = currentAnswer + equation;
    handleAnswerChange(newContent);
    setShowMathEditor(false);
  };

  const saveDraft = () => {
    console.log('Draft saved');
  };

  const wordCount = currentAnswer.trim().split(/\s+/).filter(word => word.length > 0).length;

  const displayQuestion = subQuestionIndex !== null 
    ? question.subQuestions?.[subQuestionIndex] 
    : question;

  if (!displayQuestion) return null;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">
                  {subQuestionIndex !== null ? (
                    <div>
                      <div className="text-gray-600 text-base font-normal mb-2">
                        Question {question.id}: {question.text}
                      </div>
                      <div>
                        Part {String.fromCharCode(97 + subQuestionIndex)}: {displayQuestion.text}
                      </div>
                    </div>
                  ) : (
                    displayQuestion.text
                  )}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="ml-4">
                {displayQuestion.marks} marks
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Passage if exists */}
            {question.passage && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <h4 className="font-medium text-blue-800 mb-2">Reference Passage:</h4>
                <p className="text-blue-700 leading-relaxed">{question.passage}</p>
              </div>
            )}

            {/* Image if exists */}
            {question.image && (
              <div className="mb-6">
                <img 
                  src={question.image} 
                  alt="Question illustration" 
                  className="max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(question.image, '_blank')}
                  onError={(e) => {
                    console.error('Failed to load image:', question.image);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', question.image);
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">Click to view in full size</p>
              </div>
            )}

            {/* Long content indicator */}
            <div className="text-sm text-gray-500 mb-4">
              {question.image ? 'Refer to the image above. ' : ''}Scroll down if the question continues...
            </div>
          </CardContent>
        </Card>

        {/* Answer Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Math Editor */}
            {showMathEditor && (
              <MathEditor
                onInsert={insertMathEquation}
                onCancel={() => setShowMathEditor(false)}
              />
            )}

            {/* Answer Textarea */}
            <div className="space-y-2">
              <Textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your answer here... You can use the equation editor for mathematical expressions."
                className="min-h-[300px] resize-none"
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Words: {currentAnswer ? wordCount : 0}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMathEditor(!showMathEditor)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Insert Equation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveDraft}
                    className="flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Save Draft
                  </Button>
                </div>
              </div>
            </div>

            {/* Auto-save indicator */}
            <div className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Auto-saved
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MockExamQuestion;
