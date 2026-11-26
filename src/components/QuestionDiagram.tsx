import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function validDiagram(value: string) {
  return (
    !value || (/^\/(?!\/)|^https:\/\//i.test(value) && !/[\\\s]/.test(value))
  );
}
function useDiagramUrl(value?: string | null) {
  const [signed, setSigned] = useState({ ref: '', url: '' });
  const managed = value?.startsWith('/practice-diagrams/');
  useEffect(() => {
    if (!managed || !value) return;
    let active = true;
    async function resolve() {
      const { data } = await supabase.storage
        .from('practice-diagrams')
        .createSignedUrl(
          value!.split('#')[0].slice('/practice-diagrams/'.length),
          3600,
        );
      if (active) setSigned({ ref: value!, url: data?.signedUrl ?? '' });
    }
    void resolve();
    const timer = setInterval(resolve, 50 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [value, managed]);
  return {
    url: managed ? signed.ref === value && signed.url : value,
    failed: signed.ref === value,
  };
}
export function DiagramImage({
  src,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { url } = useDiagramUrl(src);
  return url ? (
    <img {...props} src={url} />
  ) : (
    <span role="status">Loading diagram…</span>
  );
}
export default function QuestionDiagram({
  value,
  label,
}: {
  value?: string | null;
  label: string;
}) {
  const { url, failed } = useDiagramUrl(value);
  if (!value || !validDiagram(value)) return null;
  const alt = new URLSearchParams(value.split('#')[1]).get('alt') ?? label;
  if (!url)
    return (
      <small role="status">
        {failed ? 'Diagram unavailable' : 'Loading diagram…'}
      </small>
    );
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={'Enlarge ' + label}
          className="block max-w-full"
        >
          <img
            src={url}
            alt={alt}
            className="max-w-full h-auto max-h-72 object-contain"
          />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{label}</DialogTitle>
        <img
          src={url}
          alt={alt}
          className="max-h-[78vh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

// Preserve existing Mock rendering for legacy images, including locally generated previews.
export function MockDiagram(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return props.src?.startsWith('/practice-diagrams/') ? (
    <QuestionDiagram
      value={props.src}
      label={props.alt || 'Question diagram'}
    />
  ) : (
    <img {...props} />
  );
}
