import { experienceLevelSchema, goalOptionsSchema, postingFrequencySchema } from '@/lib/validations/onboarding/questions';
import { DetailedNiche } from './niche-agent';
import z from 'zod';

/**
 * User Content Profile Types
 * 
 * Types for the user content profile table that stores onboarding responses
 * and AI-generated content strategy recommendations.
 */

/**
 * Platform selection with primary platform designation
 */
export interface Platform {
  name: string;
  isPrimary: boolean;
}

/**
 * Complete user content profile matching the database schema
 */
export interface UserContentProfile {
  id: string;
  user_id: string;
  question_1_niche: DetailedNiche; // Structured AI strategy object
  question_2_goal: string | null;
  question_3_platforms: Platform[];
  question_4_experience: string | null;
  question_5_frequency: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Onboarding form data structure
 */
export interface OnboardingFormData {
  question_1_niche: DetailedNiche | null;
  question_2_goal: string;
  question_3_platforms: Platform[];
  question_4_experience: string;
  question_5_frequency: string;
}

/**
 * Content goal options
 */
export type GoalOption = z.infer<typeof goalOptionsSchema>

/**
 * Platform options
 */
export type PlatformOption =
  | 'tiktok'
  | 'instagram'
  | 'youtube_shorts'
  | 'twitter'
  | 'linkedin';

/**
 * Experience level options
 */
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

/**
 * Posting frequency options
 */
export type PostingFrequency = z.infer<typeof postingFrequencySchema>;
