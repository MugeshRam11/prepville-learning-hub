import React from 'react';
import { cn } from '@/lib/utils';

type NumberingFormat = 'full' | 'short' | 'roman';

interface SubQuestionLabelProps {
  questionNumber: number;
  subQuestionLabel: string;
  subSubIndex?: number;
  format?: NumberingFormat;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Roman numeral conversion
const toRoman = (num: number): string => {
  const romanNumerals: [number, string][] = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  
  let result = '';
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
};

const SubQuestionLabel: React.FC<SubQuestionLabelProps> = ({
  questionNumber,
  subQuestionLabel,
  subSubIndex,
  format = 'full',
  isActive = false,
  size = 'md',
  className,
}) => {
  // Build the label based on format
  const buildLabel = (): string => {
    switch (format) {
      case 'full':
        // Format: "1(a)(i)" or "1(a)"
        if (subSubIndex !== undefined) {
          return `${questionNumber}(${subQuestionLabel})(${toRoman(subSubIndex + 1)})`;
        }
        return `${questionNumber}(${subQuestionLabel})`;
      
      case 'short':
        // Format: "1ai" or "1a"
        if (subSubIndex !== undefined) {
          return `${questionNumber}${subQuestionLabel}${toRoman(subSubIndex + 1)}`;
        }
        return `${questionNumber}${subQuestionLabel}`;
      
      case 'roman':
        // Format: "(i)" or "(a)"
        if (subSubIndex !== undefined) {
          return `(${toRoman(subSubIndex + 1)})`;
        }
        return `(${subQuestionLabel})`;
      
      default:
        return `${questionNumber}${subQuestionLabel}`;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[1.5rem]',
    md: 'text-sm px-2 py-1 min-w-[2rem]',
    lg: 'text-base px-3 py-1.5 min-w-[2.5rem]',
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded font-medium transition-colors",
        sizeClasses[size],
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {buildLabel()}
    </span>
  );
};

// Helper component for showing sub-sub-questions (like 1ai, 1aii)
interface SubSubQuestionLabelProps {
  questionNumber: number;
  parentLabel: string;
  index: number;
  isActive?: boolean;
  className?: string;
}

export const SubSubQuestionLabel: React.FC<SubSubQuestionLabelProps> = ({
  questionNumber,
  parentLabel,
  index,
  isActive = false,
  className,
}) => {
  return (
    <SubQuestionLabel
      questionNumber={questionNumber}
      subQuestionLabel={parentLabel}
      subSubIndex={index}
      format="short"
      isActive={isActive}
      size="sm"
      className={className}
    />
  );
};

export default SubQuestionLabel;
