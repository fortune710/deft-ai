import jwt from 'jsonwebtoken';

export function getUserToken(userId: string): string {
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