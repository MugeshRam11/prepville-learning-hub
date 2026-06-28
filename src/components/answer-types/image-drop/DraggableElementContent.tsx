import React from 'react';
import { cn } from '@/lib/utils';
import { cleanMathContent, normalizeMath, stripLatexFormatting } from '@/lib/mathFormat';

export type DraggableElementLike = {
  id?: string;
  type?: 'text' | 'image' | string;
  content?: unknown;
  label?: unknown;
  text?: unknown;
  imageUrl?: string;
  image_url?: string;
};

export type DraggableElementDisplay =
  | { kind: 'both'; imageUrl: string; text: string }
  | { kind: 'image'; imageUrl: string }
  | { kind: 'text'; text: string }
  | { kind: 'missing'; text: string };

const normalizeText = (el: DraggableElementLike | null | undefined): string => {
  if (!el) return '';
  const raw = (el.content ?? el.label ?? el.text) as unknown;
  if (raw === null || raw === undefined) return '';
  const str = typeof raw === 'string' ? raw : String(raw);
  return normalizeMath(stripLatexFormatting(cleanMathContent(str.trim())));
};

const normalizeImageUrl = (el: DraggableElementLike | null | undefined): string => {
  if (!el) return '';
  return String(el.imageUrl || el.image_url || '').trim();
};

export const getDraggableElementDisplay = (
  el: DraggableElementLike | null | undefined
): DraggableElementDisplay => {
  const imageUrl = normalizeImageUrl(el);
  const text = normalizeText(el);

  const hasImage = !!imageUrl;
  const hasText = !!text;

  if (hasImage && hasText) return { kind: 'both', imageUrl, text };
  if (hasImage) return { kind: 'image', imageUrl };
  if (hasText) return { kind: 'text', text };
  return { kind: 'missing', text: 'Missing label' };
};

const sizeStyles = {
  chip: {
    wrap: 'flex-row items-center gap-2',
    img: 'h-6 w-6',
    text: 'text-sm',
  },
  zone: {
    wrap: 'flex-col items-center justify-center gap-1',
    img: 'max-h-[55%] w-auto',
    text: 'text-xs sm:text-sm',
  },
  review: {
    wrap: 'flex-row items-center gap-2',
    img: 'h-7 w-7',
    text: 'text-xs',
  },
} as const;

export const DraggableElementContent: React.FC<{
  element: DraggableElementLike | null | undefined;
  size?: keyof typeof sizeStyles;
  className?: string;
}> = ({ element, size = 'chip', className }) => {
  const display = getDraggableElementDisplay(element);
  const isDev = import.meta.env.DEV;
  const styles = sizeStyles[size];

  if (display.kind === 'missing') {
    const id = element?.id ? ` (${element.id})` : '';
    return (
      <span className={cn('text-xs italic text-muted-foreground', className)}>
        {display.text}
        {isDev ? id : null}
      </span>
    );
  }

  if (display.kind === 'image') {
    return (
      <img
        src={display.imageUrl}
        alt={normalizeText(element) || 'draggable element'}
        className={cn(styles.img, 'object-contain rounded', className)}
        draggable={false}
      />
    );
  }

  if (display.kind === 'text') {
    return (
      <span
        className={cn(
          styles.text,
          'font-medium text-foreground leading-tight break-words text-center',
          className
        )}
        title={display.text}
      >
        {display.text}
      </span>
    );
  }

  // both
  return (
    <div className={cn('flex min-w-0 max-w-full', styles.wrap, className)}>
      <img
        src={display.imageUrl}
        alt={display.text || 'draggable element'}
        className={cn(styles.img, 'object-contain rounded')}
        draggable={false}
      />
      <span
        className={cn(
          styles.text,
          size === 'chip' ? 'truncate' : '',
          'min-w-0 font-medium text-foreground leading-tight break-words text-center'
        )}
        title={display.text}
      >
        {display.text}
      </span>
    </div>
  );
};
