import { z } from 'zod';

export const GOAL_OPTIONS = [
  {
    value: 'grow_audience',
    label: 'Grow an audience',
    description: 'Build a loyal following and expand your reach',
  },
  {
    value: 'get_engagement',
    label: 'Get more engagement',
    description: 'Increase likes, comments, and shares on your content',
  },
  {
    value: 'build_authority',
    label: 'Build authority in my niche',
    description: 'Establish yourself as an expert and thought leader',
  },
  {
    value: 'drive_traffic',
    label: 'Drive traffic (newsletter / site)',
    description: 'Direct followers to your website or newsletter',
  },
  {
    value: 'sell_product',
    label: 'Sell a product or service',
    description: 'Convert your audience into paying customers',
  },
] as const;

export const PLATFORM_OPTIONS = [
  {
    value: 'tiktok',
    label: 'TikTok',
    icon: 'Music',
  },
  {
    value: 'instagram',
    label: 'Instagram Reels',
    icon: 'Instagram',
  },
  {
    value: 'youtube_shorts',
    label: 'YouTube Shorts',
    icon: 'Youtube',
  },
  {
    value: 'twitter',
    label: 'X (Twitter)',
    icon: 'Twitter',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    icon: 'Linkedin',
  },
] as const;

export const EXPERIENCE_OPTIONS = [
  {
    value: 'complete_beginner',
    label: 'Complete beginner',
    description: 'Tell me exactly what to do',
  },
  {
    value: 'some_experience',
    label: 'Some experience',
    description: 'I want guidance + flexibility',
  },
  {
    value: 'experienced_creator',
    label: 'Experienced creator',
    description: 'Optimize my system',
  },
] as const;

export const FREQUENCY_OPTIONS = [
  {
    value: '1_2_per_week',
    label: '1–2 times per week',
    description: 'Steady and sustainable pace',
  },
  {
    value: '3_4_per_week',
    label: '3–4 times per week',
    description: 'Regular, consistent presence',
  },
  {
    value: 'daily',
    label: 'Daily',
    description: 'Maximum visibility and growth',
  },
  {
    value: 'not_sure',
    label: "I'm not sure yet",
    description: 'Recommend for me',
  },
] as const;

export const NICHE_EXAMPLES = [
  'Fitness for busy professionals',
  'Personal finance for Gen Z',
  'Indie game dev tips',
  'Sustainable living hacks',
  'UI/UX design principles',
  'Mental health for entrepreneurs',
];

export const step1Schema = z.object({
  question_1_niche: z
    .string()
    .min(3, 'Please enter at least 3 characters')
    .max(200, 'Please keep it under 200 characters'),
});

export const step2Schema = z.object({
  question_2_goal: z.enum([
    'grow_audience',
    'get_engagement',
    'build_authority',
    'drive_traffic',
    'sell_product',
  ]),
});

export const step3Schema = z.object({
  question_3_platforms: z
    .array(
      z.object({
        name: z.string(),
        isPrimary: z.boolean(),
      })
    )
    .min(1, 'Please select at least one platform')
    .refine((platforms) => platforms.some((p) => p.isPrimary), {
      message: 'Please mark one platform as primary',
    }),
});

export const step4Schema = z.object({
  question_4_experience: z.enum([
    'complete_beginner',
    'some_experience',
    'experienced_creator',
  ]),
});

export const step5Schema = z.object({
  question_5_frequency: z.enum(['1_2_per_week', '3_4_per_week', 'daily', 'not_sure']),
});

export const completeOnboardingSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema);
