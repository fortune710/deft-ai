import { PublishPlanPayload } from "@/types/content-engine";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create authenticated Supabase client using the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase configuration missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const { contentPlan, contentItems, userId }: PublishPlanPayload = await request.json();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
    });

    const { 
        data: { user }, 
        error: authError 
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
        console.error("Error getting user from Supabase:", authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await supabase.from('content_plans')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_active', true);
    
   

    const { data: contentPlanData, error: contentPlanError } = await supabase.from('content_plans').insert({
        ...contentPlan,
        user_id: userId,
    })
    .select()
    .single();
    
    if (contentPlanError || !contentPlanData) {
        return NextResponse.json({ error: contentPlanError?.message || 'Failed to create content plan' }, { status: 500 });
    }

    const { data: contentItemsData, error: contentItemsError } = await supabase.from('content_items')
    .insert(
        contentItems.map((item) => ({
        ...item,
        plan_id: contentPlanData.id,
        user_id: userId,
    })))
    .select();

    if (contentItemsError || !contentItemsData) {
        return NextResponse.json({ error: contentItemsError?.message || 'Failed to create content items' }, { status: 500 });
    }
    
    
    return NextResponse.json({ message: 'Content plan and items created successfully', planId: contentPlanData.id }, { status: 200 });
}