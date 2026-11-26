import { z } from 'zod';

const answer = {
  answer_type: z.enum(['short_answer','text_equation','working_box','multiple_choice']),
  answer_key: z.string().default(''),
  solution: z.string().nullable().optional(),
  marking_rubric: z.array(z.string()).optional(),
  answer_config: z.object({
    tolerance: z.number().nonnegative().optional(),
    options: z.array(z.object({id:z.string(),content:z.string()})).optional()
  }).optional()
};

export const practiceQuestion = z.object({
  programme:z.literal('MYP'),subject:z.literal('mathematics'),
  myp_year:z.enum(['Year 1','Year 2','Year 3','Year 4','Year 5']),
  strand:z.enum(['Number','Algebra','Geometry and Trigonometry','Statistics and Probability']),
  topic:z.string().trim().min(1),subtopic:z.string().nullable().optional(),
  difficulty:z.enum(['easy','medium','hard']),question_type:z.enum(['single','multi_part']),
  question_text:z.string().trim().min(1),image_url:z.string().refine(v=>!v || (/^\/(?!\/)|^https:\/\//i.test(v) && !/[\\\s]/.test(v)), 'Invalid image URL').nullable().optional(),
  command_term:z.string().nullable().optional(),marks:z.number().int().positive(),
  is_published:z.boolean(),review_status:z.enum(['draft','review_pending','approved','archived','rejected']),
  ...answer,
  subquestions:z.array(z.object({
    id:z.string().uuid().optional(),label:z.string().min(1),marks:z.number().int().positive(),
    sub_question_text:z.string().trim().min(1),sub_question_image_url:z.string().refine(v=>!v || (/^\/(?!\/)|^https:\/\//i.test(v) && !/[\\\s]/.test(v)), 'Invalid image URL').nullable().optional(),
    command_term:z.string().nullable().optional(),...answer
  })).optional()
});

export type PracticeQuestionRequest = z.infer<typeof practiceQuestion>;
