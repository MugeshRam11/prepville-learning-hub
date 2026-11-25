import React from 'react';
import { renderFinalText } from './renderFinalText';

/**
 * ⚠️ LEGACY COMPATIBILITY ADAPTER ⚠️
 *
 * All rendering has been consolidated under `renderFinalText`
 * in `@/lib/renderFinalText` which implements the canonical mathematical
 * pipeline. This adapter ensures 100% backward compatibility for legacy
 * imports while eliminating rendering drift.
 */
export const renderLatexContent = (text: string | null | undefined): React.ReactNode => {
  return renderFinalText(text);
};

export default renderLatexContent;
