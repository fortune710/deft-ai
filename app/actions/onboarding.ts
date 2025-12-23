//import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase/client';
import { OnboardingFormData } from '@/types/niche-mapping';
import { completeOnboardingSchema } from '@/lib/validations/onboarding';

export async function saveContentProfile(
  data: OnboardingFormData,
  aiContext: any,
  systemPrompt: string
) {
  try {
    console.log('Validating data...');
    const validatedData = completeOnboardingSchema.parse(data);

    console.log('Getting user from session...');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('User:', user ? 'Found' : 'Not found');
    if (userError) {
      console.error('Error getting user:', userError);
    }

    if (!user) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    console.log('Inserting profile for user:', user.id);
    const { data: profile, error } = await supabase
      .from('user_content_profile')
      .upsert(
        {
          user_id: user.id,
          question_1_niche: validatedData.question_1_niche,
          question_2_goal: validatedData.question_2_goal,
          question_3_platforms: validatedData.question_3_platforms,
          question_4_experience: validatedData.question_4_experience,
          question_5_frequency: validatedData.question_5_frequency,
          ai_context: aiContext,
          system_prompt: systemPrompt,
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
      console.error('Error upserting profile:', error);
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

export async function updateAIContext(aiContext: any, systemPrompt: string) {
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
        ai_context: aiContext,
        system_prompt: systemPrompt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    //revalidatePath('/settings/profile');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating AI context:', error);
    return {
      success: false,
      error: error.message || 'Failed to update AI strategy',
    };
  }
}
