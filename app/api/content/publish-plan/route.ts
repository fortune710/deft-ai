import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PublishPlanPayload } from "@/types/content-engine";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {
    const { contentPlan, contentItems, userId }: PublishPlanPayload = await request.json();
    const supabase = await createServerSupabaseClient();

    await supabase.from('content_plans')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_active', true);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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