import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { renderFinalText } from '@/lib/renderFinalText';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Response = Database['public']['Views']['practice_review_queue']['Row'];
export function PracticeGrading() {
  const [open,setOpen] = useState(false);
  const [pending,setPending] = useState(true);
  const [page,setPage] = useState(0);
  const [revision,refresh] = useState(0);
  const [rows,setRows] = useState<Response[]>([]);
  const [total,setTotal] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    let query = supabase.from('practice_review_queue').select('*',{count:'exact'});
    if (pending) query=query.eq('evaluation','pending');
    query.order('session_question_id').order('part_id').range(page*10,page*10+9).then(({data,count,error})=>{
      if (!active) return;
      if (error) toast.error(error.message);
      setRows(data || []); setTotal(count || 0);
    });
    return () => {active=false;};
  },[open,page,pending,revision]);
  return <section>
    <Button variant="outline" onClick={()=>setOpen(!open)}>Review student answers</Button>
    {open && <div className="space-y-3 p-3">
      <label><input type="checkbox" checked={pending} onChange={e=>{setPending(e.target.checked);setPage(0);}} /> Pending only</label>
      {rows.map(r => <form key={r.session_question_id+r.part_id} className="space-y-2 rounded border p-3"
        onSubmit={async e=>{
          e.preventDefault();
          const marks=Number(new FormData(e.currentTarget).get('marks'));
          const {error}=await supabase.rpc('review_practice_part',{p_item:r.session_question_id,p_part:r.part_id,p_marks:marks});
          if(error) toast.error(error.message); else {toast.success('Marks saved');refresh(v=>v+1);}
        }}>
        <p>{renderFinalText(r.question_text)}</p>{r.sub_question_text && <p>{renderFinalText(r.sub_question_text)}</p>}
        <p>Student answer {renderFinalText(typeof r.answer === 'string' ? r.answer : JSON.stringify(r.answer))}</p>
        <p>Expected answer {renderFinalText(r.answer_key)}</p>
        {Array.isArray(r.marking_rubric) && r.marking_rubric.map((line,i)=><p key={i}>{renderFinalText(String(line))}</p>)}
        <label>Marks <input required className="border w-16" type="number" name="marks" min={0} max={r.maximum} defaultValue={r.earned ?? ''}/> / {r.maximum}</label>
        <Button type="submit">Save marks</Button>
      </form>)}
      <div>{total} responses <Button disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button>
        <Button disabled={(page+1)*10>=total} onClick={()=>setPage(page+1)}>Next</Button></div>
    </div>}
  </section>;
}
