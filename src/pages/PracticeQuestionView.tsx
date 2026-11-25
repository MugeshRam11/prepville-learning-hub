import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function PracticeQuestionView() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    if (!questionId) { navigate('/practice', {replace: true}); return; }
    supabase.rpc('start_single_question_attempt', {p_question_id: questionId}).then(({data,error}) => {
      if (!active) return;
      if (error || !data?.[0]) {
        toast.error('This question could not be opened.');
        navigate('/practice', {replace: true});
      } else navigate('/practice/session/' + data[0].session_id, {replace: true});
    });
    return () => { active = false; };
  }, [questionId,navigate]);
  return <main className="p-8" role="status">Opening practice question…</main>;
}
