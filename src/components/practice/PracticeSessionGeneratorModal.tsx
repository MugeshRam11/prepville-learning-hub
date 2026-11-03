import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PracticeSessionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: {
    myp_year?: string;
    strand?: string;
    topic?: string;
    difficulty?: string;
  };
}

const MYP_YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] as const;
const STRANDS = [
  'Number',
  'Algebra',
  'Geometry and Trigonometry',
  'Statistics and Probability'
] as const;

export const PracticeSessionGeneratorModal: React.FC<PracticeSessionGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialFilters
}) => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState('Personalized MYP Math Practice');
  const [count, setCount] = useState(50); // Default 50 as requested by client
  const [mypYear, setMypYear] = useState<string>(initialFilters?.myp_year || 'all');
  const [strand, setStrand] = useState<string>(initialFilters?.strand || 'all');
  const [difficulty, setDifficulty] = useState<string>(initialFilters?.difficulty || 'all');
  const [unattemptedOnly, setUnattemptedOnly] = useState(true);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const filters = {
        myp_year: mypYear !== 'all' ? mypYear : null,
        strand: strand !== 'all' ? strand : null,
        difficulty: difficulty !== 'all' ? difficulty : null,
        unattempted_only: unattemptedOnly
      };

      // Call secure backend generation RPC (PV-19)
      const { data, error } = await supabase.rpc('generate_practice_session', {
        p_title: title.trim() || 'Personalized Practice Session',
        p_count: count,
        p_filters: filters
      });

      if (error) throw error;

      const generated = data?.[0];
      if (!generated?.session_id) {
        throw new Error('No practice session was generated.');
      }

      toast.success(
        `Generated personalized practice session with ${generated.total_questions} question(s)!`
      );
      onClose();
      navigate(`/practice/session/${generated.session_id}`);
    } catch (err: any) {
      console.error('Session generation failed:', err);
      toast.error(err.message || 'Failed to generate practice session. Check filter availability.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Generate Custom Practice Session
          </DialogTitle>
          <DialogDescription>
            Assemble a custom practice exam paper of up to 50 questions tailored to your chosen
            curriculum strands, years, and difficulty.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-5 py-2">
          {/* Session Title */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Session Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra & Trig Exam Prep"
              className="mt-1 h-9"
              required
            />
          </div>

          {/* Number of Questions Slider */}
          <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">Number of Questions</Label>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 font-mono text-sm px-2.5 py-0.5">
                {count} Questions
              </Badge>
            </div>
            <Slider
              value={[count]}
              onValueChange={(val) => setCount(val[0])}
              min={5}
              max={50}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>5 min</span>
              <span className="text-indigo-600 font-semibold">50 (Client Target)</span>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">MYP Year</Label>
              <Select value={mypYear} onValueChange={setMypYear}>
                <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All MYP Years (1–5)</SelectItem>
                  {MYP_YEARS.map((yr) => (
                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Curriculum Strand</Label>
              <Select value={strand} onValueChange={setStrand}>
                <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strands</SelectItem>
                  {STRANDS.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-9 mt-1 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Unattempted Only Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-800">Prioritize Unattempted Questions</div>
              <div className="text-[11px] text-muted-foreground">
                Excludes questions you have previously submitted.
              </div>
            </div>
            <Switch
              checked={unattemptedOnly}
              onCheckedChange={setUnattemptedOnly}
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={generating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Session...
                </>
              ) : (
                `Generate ${count}-Question Session`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PracticeSessionGeneratorModal;

