import { z } from 'zod';
import { detailedNicheSchema } from '@/lib/validations/onboarding/niche'

export const goalOptionsSchema = z.enum([
    'grow_audience',
    'get_engagement',
    'build_authority',
    'drive_traffic',
    'sell_product',
])

export const experienceLevelSchema = z.enum([
    'complete_beginner',
    'some_experience',
    'experienced_creator',
])

export const postingFrequencySchema = z.enum(['1_2_per_week', '3_4_per_week', 'daily', 'not_sure'])

export const step1Schema = z.object({
    question_1_niche: detailedNicheSchema
});

export const step2Schema = z.object({
    question_2_goal: goalOptionsSchema,
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
    question_4_experience: experienceLevelSchema,
});

export const step5Schema = z.object({
    question_5_frequency: postingFrequencySchema,
});

export const completeOnboardingSchema = step1Schema
    .merge(step2Schema)
    .merge(step3Schema)
    .merge(step4Schema)
    .merge(step5Schema);
