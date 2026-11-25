import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface PracticeAnswerConfig {
  tolerance?: number;
  options?: { id: string; content: string }[];
}
export interface MarkingFields {
  answer_type: string;
  answer_config?: PracticeAnswerConfig;
  marking_rubric?: string[];
}

export function PracticeMarkingFields({value,change}: {
  value: MarkingFields; change: (fields: Partial<MarkingFields>) => void;
}) {
  return <div className="grid gap-3">
    <label>Marking rubric (one criterion per line)
      <Textarea value={(value.marking_rubric || []).join('\n')}
        onChange={event => change({marking_rubric: event.target.value.split('\n')})} />
    </label>
    {value.answer_type === 'multiple_choice' ?
      <label>Options (one per line, enter the correct letter as the answer key)
        <Textarea value={(value.answer_config?.options || []).map(option => option.content).join('\n')}
          onChange={event => change({answer_config: {options: event.target.value.split('\n').map((content,index) =>
            ({id: String.fromCharCode(65 + index),content}))}})} />
      </label> :
      <label>Numeric tolerance
        <Input type="number" min="0" step="any" value={value.answer_config?.tolerance ?? 0}
          onChange={event => change({answer_config: {tolerance: Number(event.target.value)}})} />
      </label>}
  </div>;
}
