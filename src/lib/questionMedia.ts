import { supabase } from '@/integrations/supabase/client';
import { validateDiagram } from '../../supabase/functions/_shared/diagram';
export async function uploadQuestionDiagram(file: File, bank = false) {
  await validateDiagram(file);
  const body = new FormData();
  body.set('file', file);
  if (bank) body.set('bank', 'true');
  const { data, error } = await supabase.functions.invoke('question-diagram', {
    body,
  });
  if (error || !data?.ref) throw Error('Diagram upload failed. Please retry.');
  return String(data.ref);
}
