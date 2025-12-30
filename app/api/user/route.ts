import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
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

    // Create a server-safe client (no cookie/session persistence).
    // We'll pass the token directly to `getUser(token)` so Supabase Auth validates it.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get the authenticated user from Supabase
    // Supabase automatically validates the token and returns the user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError) {
      console.error("Error getting user from Supabase:", userError);
      return NextResponse.json(
        { error: "Failed to authenticate user", details: userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Print user to console (for testing)
    console.log("=== USER IDENTIFIED ===");
    console.log("User ID:", user.id);
    console.log("Email:", user.email);
    console.log("User Metadata:", JSON.stringify(user.user_metadata, null, 2));
    console.log("App Metadata:", JSON.stringify(user.app_metadata, null, 2));
    console.log("Created At:", user.created_at);
    console.log("Updated At:", user.updated_at);
    console.log("Last Sign In:", user.last_sign_in_at);
    console.log("=========================");

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      message: "User identified successfully",
    });
  } catch (error) {
    console.error("Unexpected error in /api/user:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
