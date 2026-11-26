import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadQuestionDiagram } from '@/lib/questionMedia';
import { validateDiagram } from '../../../supabase/functions/_shared/diagram';
import QuestionDiagram, { validDiagram } from '@/components/QuestionDiagram';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  folder?: string;
  bank?: boolean;
  kind?: 'stem' | 'part' | 'answer-option';
}
export default function QuestionMediaUploader({
  value,
  onChange,
  placeholder,
  bank = false,
  kind,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<File>();
  const metadata = new URLSearchParams(value?.split('#')[1]);
  async function upload(file: File) {
    setBusy(true);
    setError('');
    setRetry(undefined);
    try {
      await validateDiagram(file);
      const img = await createImageBitmap(file);
      const dimensions = {
        width: String(img.width),
        height: String(img.height),
      };
      img.close();
      let ref: string;
      try {
        ref = await uploadQuestionDiagram(file, bank);
      } catch (error) {
        setRetry(file);
        throw error;
      }
      const info = new URLSearchParams({ ...dimensions, kind: kind ?? 'stem' });
      onChange(ref + '#' + info);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to upload image');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  const alt = metadata.get('alt') ?? '';
  return (
    <div className="space-y-2">
      <Input
        aria-label={kind === 'part' ? 'Part image URL' : 'Image URL'}
        placeholder={placeholder ?? 'HTTPS image URL or local image path'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
      />
      {value && !validDiagram(value) && (
        <p role="alert">Use an HTTPS URL or local image path.</p>
      )}
      <input
        hidden
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files?.[0]) void upload(e.target.files[0]);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? 'Uploading…' : value ? 'Replace diagram' : 'Upload diagram'}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => onChange('')}
        >
          Clear diagram
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        JPEG, PNG or WebP · Up to 5 MB
      </p>
      {error && (
        <p role="alert">
          {error}{' '}
          {retry && (
            <button type="button" onClick={() => upload(retry)}>
              Retry upload
            </button>
          )}
        </p>
      )}
      {value && (
        <>
          <label>
            Diagram description
            <Input
              value={alt}
              onChange={(e) => {
                metadata.set('alt', e.target.value);
                onChange(value.split('#')[0] + '#' + metadata);
              }}
            />
          </label>
          <QuestionDiagram
            value={value}
            label={kind === 'part' ? 'Part diagram' : 'Question diagram'}
          />
        </>
      )}
    </div>
  );
}
