
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Upload, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import ImageUpload from './ImageUpload';

const QuestionBuilder = ({ questions, setQuestions }) => {
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question_number: questions.length + 1,
      question_text: '',
      question_image_url: '',
      has_sub_questions: false,
      marks: 1,
      answer_key: '',
      word_limit: '',
      difficulty: 'medium',
      category: '',
      sub_questions: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const deleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    // Renumber remaining questions
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions.map((q, index) => ({ ...q, question_number: index + 1 })));
  };

  const addSubQuestion = (questionId) => {
    const subQuestionLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newSubQuestion = {
          id: Date.now() + Math.random(),
          sub_question_label: subQuestionLabels[q.sub_questions.length] || `${q.sub_questions.length + 1}`,
          sub_question_text: '',
          sub_question_image_url: '',
          marks: 1,
          answer_key: '',
          word_limit: ''
        };
        return {
          ...q,
          has_sub_questions: true,
          sub_questions: [...q.sub_questions, newSubQuestion]
        };
      }
      return q;
    }));
  };

  const updateSubQuestion = (questionId, subQuestionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          sub_questions: q.sub_questions.map(sq =>
            sq.id === subQuestionId ? { ...sq, [field]: value } : sq
          )
        };
      }
      return q;
    }));
  };

  const deleteSubQuestion = (questionId, subQuestionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedSubQuestions = q.sub_questions.filter(sq => sq.id !== subQuestionId);
        return {
          ...q,
          sub_questions: updatedSubQuestions,
          has_sub_questions: updatedSubQuestions.length > 0
        };
      }
      return q;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
        <Button onClick={addQuestion} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      {questions.map((question, index) => (
        <Card key={question.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Question {question.question_number}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {question.difficulty}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteQuestion(question.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium mb-2">Question Text *</label>
              <RichTextEditor
                value={question.question_text}
                onChange={(value) => updateQuestion(question.id, 'question_text', value)}
                placeholder="Enter your question here with full text formatting support..."
              />
            </div>

            {/* Question Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Question Image (Optional)</label>
              <ImageUpload
                value={question.question_image_url}
                onChange={(url) => updateQuestion(question.id, 'question_image_url', url)}
                placeholder="Enter image URL or upload..."
                folder={`questions/question-${question.question_number}`}
              />
            </div>

            {/* Question Settings */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select
                  value={question.category || ''}
                  onValueChange={(value) => updateQuestion(question.id, 'category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Knowing & Understanding</SelectItem>
                    <SelectItem value="B">B - Investigating Patterns</SelectItem>
                    <SelectItem value="C">C - Communicating</SelectItem>
                    <SelectItem value="D">D - Real-life Applications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marks</label>
                <Input
                  type="number"
                  min="1"
                  value={question.marks}
                  onChange={(e) => updateQuestion(question.id, 'marks', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <Select
                  value={question.difficulty}
                  onValueChange={(value) => updateQuestion(question.id, 'difficulty', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Word Limit</label>
                <Input
                  type="number"
                  value={question.word_limit}
                  onChange={(e) => updateQuestion(question.id, 'word_limit', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Answer Key */}
            <div>
              <label className="block text-sm font-medium mb-2">Answer Key</label>
              <Textarea
                value={question.answer_key}
                onChange={(e) => updateQuestion(question.id, 'answer_key', e.target.value)}
                placeholder="Enter the correct answer or explanation..."
                rows={2}
              />
            </div>

            {/* Sub-questions Toggle */}
            <div className="flex items-center space-x-2 py-2">
              <Switch
                checked={question.has_sub_questions}
                onCheckedChange={(checked) => {
                  updateQuestion(question.id, 'has_sub_questions', checked);
                  if (!checked) {
                    updateQuestion(question.id, 'sub_questions', []);
                  }
                }}
              />
              <label className="text-sm font-medium">Has Sub-questions</label>
            </div>

            {/* Sub-questions */}
            {question.has_sub_questions && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Sub-questions ({question.sub_questions.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSubQuestion(question.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Sub-question
                  </Button>
                </div>

                {question.sub_questions.map((subQuestion) => (
                  <Card key={subQuestion.id} className="ml-4 border-dashed">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <h5 className="text-sm font-medium">
                          {question.question_number}{subQuestion.sub_question_label}
                        </h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSubQuestion(question.id, subQuestion.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Sub-question Text *</label>
                        <RichTextEditor
                          value={subQuestion.sub_question_text}
                          onChange={(value) => updateSubQuestion(question.id, subQuestion.id, 'sub_question_text', value)}
                          placeholder="Enter sub-question with full text formatting support..."
                        />
                      </div>

                      {/* Sub-question Image Upload */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Sub-question Image (Optional)</label>
                        <ImageUpload
                          value={subQuestion.sub_question_image_url}
                          onChange={(url) => updateSubQuestion(question.id, subQuestion.id, 'sub_question_image_url', url)}
                          placeholder="Enter image URL or upload..."
                          folder={`questions/question-${question.question_number}/sub-${subQuestion.sub_question_label}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Marks</label>
                          <Input
                            type="number"
                            min="1"
                            value={subQuestion.marks}
                            onChange={(e) => updateSubQuestion(question.id, subQuestion.id, 'marks', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Word Limit</label>
                          <Input
                            type="number"
                            value={subQuestion.word_limit}
                            onChange={(e) => updateSubQuestion(question.id, subQuestion.id, 'word_limit', e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Answer Key</label>
                        <Textarea
                          value={subQuestion.answer_key}
                          onChange={(e) => updateSubQuestion(question.id, subQuestion.id, 'answer_key', e.target.value)}
                          placeholder="Enter the correct answer..."
                          rows={1}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {questions.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-500 text-center">
              <p className="text-lg mb-2">No questions added yet</p>
              <p className="text-sm mb-4">Click "Add Question" to start building your mock test</p>
              <Button onClick={addQuestion} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add First Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuestionBuilder;
