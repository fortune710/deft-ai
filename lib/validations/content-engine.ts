import { z } from 'zod';

export const itemStatusSchema = z.enum(['idea', 'in_progress', 'ready', 'published']);

export const platformSchema = z.enum(['youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook']);

export const itemContentSchema = z.object({
  hook_suggestion: z.string().optional(),
  script_content: z.string().optional(),
  cta_suggestion: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  clip_suggestions: z.array(z.string()).optional(),
  caption: z.string().optional(),
});

export const contentItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  platform: platformSchema,
  scheduled_date: z.date({
    required_error: 'Scheduled date is required',
  }),
  status: itemStatusSchema,
  content: itemContentSchema,
});

export const createContentPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  platforms: z.array(platformSchema).min(1, 'Select at least one platform'),
});

export const updateContentPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  platforms: z.array(platformSchema).optional(),
});

export const generatePlanConfigSchema = z.object({
  title: z.string().optional(),
  startDate: z.date(),
  platforms: z.array(platformSchema).min(1, 'Select at least one platform'),
  frequency: z.string(),
});
