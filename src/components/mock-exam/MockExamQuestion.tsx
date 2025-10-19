
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Eye } from 'lucide-react';
import EquationEditor from '@/components/admin/EquationEditor';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Question } from '@/pages/MockExamStart';

interface MockExamQuestionProps {
  question: Question;
  questionNumber: number;
  subQuestionIndex: number | null;
  answer: string;
  onAnswerChange: (questionId: string, content: string, subQuestionId?: string) => void;
  onNext?: () => void;
  isLastQuestion?: boolean;
}

const MockExamQuestion = ({
  question,
  questionNumber,
  subQuestionIndex,
  answer,
  onAnswerChange,
  onNext,
  isLastQuestion
}: MockExamQuestionProps) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Sync with parent answer prop
  React.useEffect(() => {
    setCurrentAnswer(answer);
  }, [answer, question.id, subQuestionIndex]);

  const handleAnswerChange = (content: string) => {
    setCurrentAnswer(content);
    const subQuestionId = subQuestionIndex !== null 
      ? question.subQuestions?.[subQuestionIndex]?.id 
      : undefined;
    // Immediately save to parent state
    onAnswerChange(question.id, content, subQuestionId);
  };


  const saveDraft = () => {
    console.log('Draft saved');
    // Auto-advance to next question after saving
    if (onNext) {
      onNext();
    }
  };

  const renderLatexContent = (text: string) => {
    // Check if the text contains LaTeX commands (starts with backslash)
    const hasLatex = /\\[a-zA-Z]+/.test(text);
    
    if (hasLatex) {
      // If it's mostly LaTeX (no $ delimiters), render the entire text as LaTeX
      try {
        const html = katex.renderToString(text, {
          displayMode: false,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        return <span className="text-red-500">LaTeX Error: {text}</span>;
      }
    } else {
      // Split text by $...$ patterns to find LaTeX equations in regular text
      const parts = text.split(/(\$[^$]+\$)/g);
      
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // This is a LaTeX equation
          const equation = part.slice(1, -1); // Remove the $ symbols
          try {
            const html = katex.renderToString(equation, {
              displayMode: false,
              throwOnError: false,
              errorColor: '#cc0000',
              strict: false
            });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (error) {
            return <span key={index} className="text-red-500">Error: {equation}</span>;
          }
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      });
    }
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
                        Question {questionNumber}: {renderLatexContent(question.text)}
                      </div>
                      <div>
                        Part {String.fromCharCode(97 + subQuestionIndex)}: {renderLatexContent(displayQuestion.text)}
                      </div>
                    </div>
                  ) : (
                    <div>Question {questionNumber}: {renderLatexContent(displayQuestion.text)}</div>
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
            {/* Math-enabled Answer Editor */}
            <div className="space-y-2">
              <EquationEditor
                value={currentAnswer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here... Use math notation, fractions, symbols, and equations directly."
                className="min-h-[300px]"
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Words: {currentAnswer ? wordCount : 0}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
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

            {/* LaTeX Preview */}
            {showPreview && currentAnswer && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Formatted Preview:</h4>
                <div className="text-base leading-relaxed">
                  {renderLatexContent(currentAnswer)}
                </div>
              </div>
            )}

            {/* Auto-save indicator */}
            <div className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Auto-saved
            </div>

            {/* Submit/Next Button - Always enabled */}
            {onNext && (
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={onNext}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLastQuestion ? 'Submit Test' : 'Next Question'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MockExamQuestion;
