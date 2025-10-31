import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Upload, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import ImageUpload from './ImageUpload';
import EquationEditor from './EquationEditor';

const QuestionBuilder = ({ questions, setQuestions }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newQuestionData, setNewQuestionData] = useState({
    question_text: '',
    question_image_url: '',
    category: '',
    marks: 1,
    difficulty: 'medium',
    word_limit: '',
    answer_key: '',
    has_sub_questions: false
  });

  const resetNewQuestionData = () => {
    setNewQuestionData({
      question_text: '',
      question_image_url: '',
      category: '',
      marks: 1,
      difficulty: 'medium',
      word_limit: '',
      answer_key: '',
      has_sub_questions: false
    });
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      question_number: questions.length + 1,
      question_text: newQuestionData.question_text,
      question_image_url: newQuestionData.question_image_url,
      has_sub_questions: newQuestionData.has_sub_questions,
      marks: newQuestionData.marks,
      answer_key: newQuestionData.answer_key,
      word_limit: newQuestionData.word_limit,
      difficulty: newQuestionData.difficulty,
      category: newQuestionData.category,
      sub_questions: []
    };
    setQuestions([...questions, newQuestion]);
    setShowAddDialog(false);
    resetNewQuestionData();
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
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Question Title */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Question Title</Label>
                <Input
                  placeholder="Question title"
                  value={newQuestionData.question_text}
                  onChange={(e) => setNewQuestionData({...newQuestionData, question_text: e.target.value})}
                />
              </div>
              <div>
                <Label>Topic</Label>
                <Input
                  placeholder="Topic name"
                  value={newQuestionData.category}
                  onChange={(e) => setNewQuestionData({...newQuestionData, category: e.target.value})}
                />
              </div>
            </div>

            {/* Question Text */}
            <div>
              <Label>Question Text</Label>
              <RichTextEditor
                value={newQuestionData.question_text}
                onChange={(value) => setNewQuestionData({...newQuestionData, question_text: value})}
                placeholder="Enter the question text..."
              />
            </div>

            {/* Question Image */}
            <div>
              <Label>Question Image (optional)</Label>
              <ImageUpload
                value={newQuestionData.question_image_url}
                onChange={(url) => setNewQuestionData({...newQuestionData, question_image_url: url})}
                placeholder="Enter image URL or upload..."
                folder="questions/new"
              />
            </div>

            {/* Subject, Level, Difficulty */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Subject</Label>
                <Select value={newQuestionData.category} onValueChange={(value) => setNewQuestionData({...newQuestionData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
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
                <Label>Level</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Select level"
                  value={newQuestionData.marks}
                  onChange={(e) => setNewQuestionData({...newQuestionData, marks: parseInt(e.target.value) || 1})}
                />
              </div>

              <div>
                <Label>Difficulty</Label>
                <Select value={newQuestionData.difficulty} onValueChange={(value) => setNewQuestionData({...newQuestionData, difficulty: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Answer Key */}
            <div>
              <Label>Answer Key</Label>
              <EquationEditor
                value={newQuestionData.answer_key}
                onChange={(value) => setNewQuestionData({...newQuestionData, answer_key: value})}
                placeholder="Enter the correct answer and explanation..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                resetNewQuestionData();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddQuestion}
                disabled={!newQuestionData.question_text}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <EquationEditor
                value={question.answer_key}
                onChange={(value) => updateQuestion(question.id, 'answer_key', value)}
                placeholder="Enter the correct answer or explanation - supports math equations and normal text..."
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
                        <EquationEditor
                          value={subQuestion.answer_key}
                          onChange={(value) => updateSubQuestion(question.id, subQuestion.id, 'answer_key', value)}
                          placeholder="Enter the correct answer - supports math equations and normal text..."
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
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
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
