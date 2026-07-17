import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Subtle custom cursor for the mock-exam workspace.
 *
 * Renders two additive layers that follow the pointer — a small solid violet
 * dot (fast) and a larger indigo/sky ring (slower) — that scale + glow when
 * hovering interactive elements. It is purely decorative: the native caret is
 * still shown over answer inputs (see the `.exam-cursor-none` rule in
 * index.css), so typing is unaffected.
 *
 * Renders nothing on touch / coarse-pointer devices or when the user prefers
 * reduced motion.
 */
const HOVER_SELECTOR = 'button, a, [role="button"], [data-cursor="hover"]';

const ExamCursor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Raw pointer position.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Springs give the dot/ring their trailing feel.
  const dotX = useSpring(x, { stiffness: 900, damping: 40, mass: 0.3 });
  const dotY = useSpring(y, { stiffness: 900, damping: 40, mass: 0.3 });
  const ringX = useSpring(x, { stiffness: 250, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 250, damping: 28, mass: 0.6 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)');
    if (!fine.matches || !motionOk.matches) return;

    setEnabled(true);

    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const handleOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(HOVER_SELECTOR)) setHovering(true);
    };
    const handleOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(HOVER_SELECTOR)) setHovering(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleOver);
    window.addEventListener('mouseout', handleOut);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      window.removeEventListener('mouseout', handleOut);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Trailing ring */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border-2 border-violet-500/60 mix-blend-multiply dark:mix-blend-screen"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: hovering ? 46 : 30,
          height: hovering ? 46 : 30,
          borderColor: hovering ? 'hsl(199 90% 55% / 0.8)' : 'hsl(258 90% 66% / 0.6)',
          boxShadow: hovering
            ? '0 0 18px 2px hsl(258 90% 66% / 0.45)'
            : '0 0 0 0 hsl(258 90% 66% / 0)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      />
      {/* Leading dot */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full bg-gradient-to-br from-violet-500 to-indigo-600"
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
        animate={{ width: hovering ? 8 : 6, height: hovering ? 8 : 6 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      />
    </>
  );
};

export default ExamCursor;
