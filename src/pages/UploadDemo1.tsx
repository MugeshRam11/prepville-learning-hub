import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const UploadDemo1 = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const uploadMockTest = async () => {
    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload mock tests",
          variant: "destructive"
        });
        return;
      }

      // Create the mock test
      const { data: mockTest, error: testError } = await supabase
        .from('mock_tests')
        .insert({
          title: 'demo 1',
          subject: 'mathematics',
          topic: 'demo 1',
          is_published: true,
          created_by: user.id,
          total_questions: 1
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create the main question with sub-questions
      const { data: mainQuestion, error: questionError } = await supabase
        .from('mock_questions')
        .insert({
          mock_test_id: mockTest.id,
          question_number: 1,
          question_text: `A park café offers a choice of drink (Tea or Coffee) and a choice of snack (Cake or Biscuit).

The probability a visitor chooses Tea is 0.6.

If a visitor chooses Tea, the probability they choose Cake is 0.7.

If a visitor chooses Coffee, the probability they choose Cake is 0.4.`,
          question_image_url: '/lovable-uploads/demo1-tree-diagram.jpg',
          has_sub_questions: true,
          category: 'Probability',
          difficulty: 'medium',
          marks: 12
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create sub-questions
      const subQuestions = [
        {
          question_id: mainQuestion.id,
          sub_question_label: 'a',
          sub_question_text: 'Complete the tree diagram below by writing down the missing probabilities on the branches.',
          marks: 3,
          answer_key: 'Coffee branch = 0.4, Tea→Biscuit = 0.3, Coffee→Cake branch needs to be labeled, Coffee→Biscuit = 0.6'
        },
        {
          question_id: mainQuestion.id,
          sub_question_label: 'b',
          sub_question_text: 'Determine the probability that a randomly selected visitor chooses Coffee and Cake.',
          marks: 2,
          answer_key: '0.4 × 0.4 = 0.16'
        },
        {
          question_id: mainQuestion.id,
          sub_question_label: 'c',
          sub_question_text: 'Determine the probability that a visitor chose Tea given they chose Cake.',
          marks: 4,
          answer_key: 'P(Tea|Cake) = P(Tea and Cake)/P(Cake) = (0.6 × 0.7)/(0.6 × 0.7 + 0.4 × 0.4) = 0.42/0.58 = 0.724'
        },
        {
          question_id: mainQuestion.id,
          sub_question_label: 'd',
          sub_question_text: 'Find that the events "choosing Tea" (T) and "choosing Cake" (K) are independent or not.',
          marks: 3,
          answer_key: 'Check if P(T and K) = P(T) × P(K). P(T and K) = 0.42, P(T) = 0.6, P(K) = 0.58. 0.6 × 0.58 = 0.348 ≠ 0.42, so NOT independent'
        }
      ];

      const { error: subQuestionsError } = await supabase
        .from('mock_sub_questions')
        .insert(subQuestions);

      if (subQuestionsError) throw subQuestionsError;

      toast({
        title: "Success!",
        description: "Mock test 'demo 1' has been uploaded successfully with 4 sub-questions",
      });

      setUploaded(true);

      // Navigate to the mock test view after 2 seconds
      setTimeout(() => {
        navigate(`/admin/mock-tests/view/${mockTest.id}`);
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading mock test:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload mock test",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // Auto-upload when component mounts
    if (!uploaded && !uploading) {
      uploadMockTest();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-3xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Uploading Mock Test: demo 1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploading && (
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Creating mock test with probability questions...</p>
            </div>
          )}
          
          {uploaded && (
            <div className="text-center space-y-3">
              <div className="text-green-500 text-5xl">✓</div>
              <p className="text-lg font-semibold">Mock test uploaded successfully!</p>
              <p className="text-muted-foreground">
                Title: demo 1<br />
                Subject: Mathematics<br />
                Topic: demo 1<br />
                Questions: 1 main question with 4 sub-parts (a, b, c, d)<br />
                Total Marks: 12
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Redirecting to mock test view...
              </p>
            </div>
          )}

          {!uploading && !uploaded && (
            <div className="text-center space-y-3">
              <Button onClick={uploadMockTest} className="w-full">
                Upload Mock Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadDemo1;
