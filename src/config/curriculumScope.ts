/**
 * Central Curriculum & Programme Scope Specification
 * 
 * Target Launch: 9 November 2026
 * Scope: International Baccalaureate (IB) Middle Years Programme (MYP) — Mathematics Only.
 * All other programmes and subjects are frozen and disabled until subsequent releases.
 */

export type ProgrammeCode = 'MYP' | 'IBDP';

export type SubjectCode = 
  | 'mathematics' 
  | 'physics' 
  | 'chemistry' 
  | 'biology' 
  | 'language_literature' 
  | 'social_studies' 
  | 'computer_science';

export interface CurriculumOffering {
  programme: ProgrammeCode;
  subject: SubjectCode;
  displayName: string;
  programmeName: string;
  enabled: boolean;
  status: 'active' | 'coming_soon' | 'planned';
  description: string;
}

export const LAUNCH_CURRICULUM_CATALOGUE: Record<string, CurriculumOffering> = {
  'myp-mathematics': {
    programme: 'MYP',
    subject: 'mathematics',
    displayName: 'MYP Mathematics',
    programmeName: 'IB Middle Years Programme',
    enabled: true,
    status: 'active',
    description: 'Standard and Extended mathematics for IB MYP years 1-5.',
  },
  'ibdp-mathematics': {
    programme: 'IBDP',
    subject: 'mathematics',
    displayName: 'IBDP Mathematics (AA / AI)',
    programmeName: 'IB Diploma Programme',
    enabled: false,
    status: 'coming_soon',
    description: 'Analysis & Approaches and Applications & Interpretation for IBDP.',
  },
  'ibdp-physics': {
    programme: 'IBDP',
    subject: 'physics',
    displayName: 'IBDP Physics',
    programmeName: 'IB Diploma Programme',
    enabled: false,
    status: 'coming_soon',
    description: 'Higher Level and Standard Level IBDP Physics.',
  },
  'ibdp-chemistry': {
    programme: 'IBDP',
    subject: 'chemistry',
    displayName: 'IBDP Chemistry',
    programmeName: 'IB Diploma Programme',
    enabled: false,
    status: 'coming_soon',
    description: 'Higher Level and Standard Level IBDP Chemistry.',
  },
  'ibdp-biology': {
    programme: 'IBDP',
    subject: 'biology',
    displayName: 'IBDP Biology',
    programmeName: 'IB Diploma Programme',
    enabled: false,
    status: 'coming_soon',
    description: 'Higher Level and Standard Level IBDP Biology.',
  },
};

/**
 * Check whether a programme and subject are enabled in the current release scope
 */
export const isCurriculumEnabled = (programme: string, subject: string): boolean => {
  const key = `${programme.toLowerCase()}-${subject.toLowerCase()}`;
  const offering = LAUNCH_CURRICULUM_CATALOGUE[key];
  return offering?.enabled === true;
};

/**
 * Validates whether an incoming creation, query, or attempt request is permitted
 * under the active scope.
 */
export const assertCurriculumPermitted = (programme: string, subject: string): void => {
  if (!isCurriculumEnabled(programme, subject)) {
    throw new Error(
      `Access Denied: ${programme} ${subject} is not available in the current PrepVille release scope. Only IB MYP Mathematics is enabled.`
    );
  }
};
