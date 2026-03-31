//import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase/client';
import { OnboardingFormData } from '@/types/niche-mapping';
import { completeOnboardingSchema } from '@/lib/validations/onboarding/questions';
import { TABLES } from '@/lib/supabase/constants';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'onboarding' });

export async function saveContentProfile(data: OnboardingFormData) {
  try {
    const validatedData = completeOnboardingSchema.parse(data);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      log.error('Error getting user:', {
        statusCode: userError.status,
        message: userError.message,

      });
      return { success: false, error: 'Error getting user', profile: null };
    }

    if (!user) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    log.info('Inserting profile for user:', {
      userId: user.id,
      data: validatedData,
      action: "supabase_upsert"
    });
    const { data: profile, error } = await supabase
      .from(TABLES.USER_CONTENT_PROFILE)
      .upsert(
        {
          user_id: user.id,
          question_1_niche: validatedData.question_1_niche,
          question_2_goal: validatedData.question_2_goal,
          question_3_platforms: validatedData.question_3_platforms,
          question_4_experience: validatedData.question_4_experience,
          question_5_frequency: validatedData.question_5_frequency,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      log.error('Error upserting profile:', {
        userId: user.id,
        error: error.message,
        error_code: error.code
      });
      throw error;
    }

    console.log('Profile saved successfully!');

    // revalidatePath('/onboarding');
    // revalidatePath('/content-engine');
    // revalidatePath('/script-creator');

    return { success: true, profile };
  } catch (error: any) {
    console.error('Error saving content profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to save content profile',
    };
  }
}

export async function getContentProfile() {
  try {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, profile: null };
    }

    const { data: profile, error } = await supabase
      .from('user_content_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { success: true, profile };
  } catch (error: any) {
    console.error('Error fetching content profile:', error);
    return {
      success: false,
      profile: null,
      error: error.message,
    };
  }
}

export async function updateAIContext(aiStrategy: any) {
  try {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error: updateError } = await supabase
      .from('user_content_profile')
      .update({
        question_1_niche: aiStrategy,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    //revalidatePath('/settings/profile');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating AI strategy:', error);
    return {
      success: false,
      error: error.message || 'Failed to update AI strategy',
    };
  }
}
