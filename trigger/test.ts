import { task, logger } from "@trigger.dev/sdk/v3";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import type { Platform, ItemStatus } from "@/types/content-engine";

interface TestTaskPayload {
  userId: string;
}

function getToken(userId: string): string {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
  if (!jwtSecret) {
    throw new Error("JWT secret is required");
  }
  
  // Important: Supabase Auth (GoTrue) validates the JWT `aud` claim.
  // If `aud` doesn't match (usually "authenticated"), you'll get:
  // "Token audience doesn't match request audience".
  const token = jwt.sign(
    {
      sub: userId,
      role: "authenticated",
    },
    jwtSecret,
    {
      expiresIn: "1h",
      audience: "authenticated",
      issuer: "supabase",
    }
  );
  return token;
}

function createSupabaseClient(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration missing");
  }

  const token = getToken(userId);
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export const testUserTokenTask = task({
  id: "test-user-token",
  run: async (payload: TestTaskPayload) => {
    const { userId } = payload;

    logger.log("Generating JWT token for user", { userId });

    // Generate token using Supabase JWT secret
    const token = getToken(userId);

    logger.log("Token generated, calling /api/user", { userId, tokenLength: token.length });

    // Get the base URL - use NEXT_PUBLIC_APP_URL or localhost for local dev
    // const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // const apiUrl = `${baseUrl}/api/user`;

    // logger.log("Calling API", { apiUrl });

    // // Call the API with the token in Authorization header
    // const response = await fetch(apiUrl, {
    //   method: "GET",
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //     "Content-Type": "application/json",
    //   },
    // });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   logger.error("API call failed", {
    //     status: response.status,
    //     statusText: response.statusText,
    //     error: errorText,
    //   });
    //   throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    // }

    // const data = await response.json();
    // logger.log("API response received", { data });

    // Create test content plan and content item
    logger.log("Creating test content plan and content item", { userId });
    
    const supabase = createSupabaseClient(userId);
    
    // Verify the user
    const { 
      data: { user: authUser }, 
      error: authError 
    } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      logger.error("Error getting user from Supabase", { authError });
      throw new Error(`Unauthorized: ${authError?.message || 'User not found'}`);
    }

    // Create test content plan
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    const { data: contentPlanData, error: contentPlanError } = await supabase
      .from('content_plans')
      .insert({
        user_id: userId,
        title: "Test Content Plan",
        description: "This is a test content plan created by the test task",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        platforms: ['youtube', 'instagram'] as Platform[],
        is_active: false,
        archived_at: null,
      })
      .select()
      .single();

    if (contentPlanError || !contentPlanData) {
      logger.error("Failed to create content plan", { contentPlanError });
      throw new Error(`Failed to create content plan: ${contentPlanError?.message || 'Unknown error'}`);
    }

    logger.log("Content plan created", { planId: contentPlanData.id });

    // Create test content item
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1); // Tomorrow

    const { data: contentItemData, error: contentItemError } = await supabase
      .from('content_items')
      .insert({
        plan_id: contentPlanData.id,
        user_id: userId,
        title: "Test Content Item",
        description: "This is a test content item created by the test task",
        platform: 'youtube' as Platform,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'idea' as ItemStatus,
        content: {
          script_content: "This is a test script for the content item. It contains sample content that can be used for testing purposes.",
          hook_suggestion: "Hook: Start with a question that grabs attention",
          cta_suggestion: "Call to action: Subscribe for more content",
          hashtags: ["#test", "#content", "#youtube"],
        },
        position: 0,
      })
      .select()
      .single();

    if (contentItemError || !contentItemData) {
      logger.error("Failed to create content item", { contentItemError });
      throw new Error(`Failed to create content item: ${contentItemError?.message || 'Unknown error'}`);
    }

    logger.log("Content item created", { itemId: contentItemData.id });

    return {
      success: true,
      userId,
      //user: data.user,
      contentPlan: {
        id: contentPlanData.id,
        title: contentPlanData.title,
      },
      contentItem: {
        id: contentItemData.id,
        title: contentItemData.title,
        platform: contentItemData.platform,
      },
      message: "Token generated, user identified, and test content plan/item created successfully",
    };
  },
});

