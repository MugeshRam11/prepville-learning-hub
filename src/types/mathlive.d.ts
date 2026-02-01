import type { MathfieldElement } from 'mathlive';

declare global {
  interface Window {
    mathVirtualKeyboard: {
      show: () => void;
      hide: () => void;
      visible: boolean;
    };
  }
  
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<MathfieldElement> & {
          'virtual-keyboard-mode'?: string;
          'virtual-keyboard-theme'?: string;
          'smart-mode'?: string;
          'smart-superscript'?: string;
          'remove-extraneous-parentheses'?: string;
          'math-virtual-keyboard-policy'?: string;
        },
        MathfieldElement
      >;
    }
  }
}

export {};
