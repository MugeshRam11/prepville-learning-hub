import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Sparkles } from 'lucide-react';

const ManualQuestionForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    level: 'MYP',
    difficulty: 'Medium',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    answer_key: '',
    explanation: '',
    is_published: true
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      topic: '',
      level: 'MYP',
      difficulty: 'Medium',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      answer_key: '',
      explanation: '',
      is_published: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.topic || !formData.question_text || !formData.answer_key) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('subject_questions')
        .insert([{
          title: formData.topic,
          subject: formData.subject.toLowerCase() as any,
          topic: formData.topic,
          level: formData.level,
          difficulty: formData.difficulty,
          question_text: formData.question_text,
          option_a: formData.option_a,
          option_b: formData.option_b,
          option_c: formData.option_c,
          option_d: formData.option_d,
          answer_key: formData.answer_key.toUpperCase(),
          explanation: formData.explanation || null,
          is_published: formData.is_published
        }]);

      if (error) throw error;

      toast({
        title: "✅ Question Created",
        description: "Question added successfully to the database",
      });

      resetForm();
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: "Failed to Create",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Create Question Manually
        </CardTitle>
        <CardDescription>
          Add a single question to the database with all details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject & Topic Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={formData.subject} onValueChange={(val) => handleInputChange('subject', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                  <SelectItem value="economics">Economics</SelectItem>
                  <SelectItem value="computer_science">Computer Science</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Algebra, Thermodynamics"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
              />
            </div>
          </div>

          {/* Level & Difficulty Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select value={formData.level} onValueChange={(val) => handleInputChange('level', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="MYP">MYP</SelectItem>
                  <SelectItem value="IBDP">IBDP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(val) => handleInputChange('difficulty', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              placeholder="Enter the question..."
              value={formData.question_text}
              onChange={(e) => handleInputChange('question_text', e.target.value)}
              rows={4}
            />
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="option_a">Option A</Label>
              <Input
                id="option_a"
                placeholder="Option A"
                value={formData.option_a}
                onChange={(e) => handleInputChange('option_a', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="option_b">Option B</Label>
              <Input
                id="option_b"
                placeholder="Option B"
                value={formData.option_b}
                onChange={(e) => handleInputChange('option_b', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="option_c">Option C</Label>
              <Input
                id="option_c"
                placeholder="Option C"
                value={formData.option_c}
                onChange={(e) => handleInputChange('option_c', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="option_d">Option D</Label>
              <Input
                id="option_d"
                placeholder="Option D"
                value={formData.option_d}
                onChange={(e) => handleInputChange('option_d', e.target.value)}
              />
            </div>
          </div>

          {/* Answer Key */}
          <div className="space-y-2">
            <Label htmlFor="answer_key">Correct Answer * (A, B, C, or D)</Label>
            <Select value={formData.answer_key} onValueChange={(val) => handleInputChange('answer_key', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              placeholder="Provide an explanation for the correct answer..."
              value={formData.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Question
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Clear Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManualQuestionForm;
