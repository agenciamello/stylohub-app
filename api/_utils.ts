import type { VercelRequest } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

// Supabase ADMIN (server-side)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function getBearerToken(req: VercelRequest): string | null {
  const raw = req.headers.authorization || req.headers.Authorization;
  if (!raw || typeof raw !== "string") return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

/**
 * Valida o token enviado pelo frontend (Authorization: Bearer <token>)
 * e retorna o clerk userId (sub).
 */
export async function requireClerkUserId(req: VercelRequest): Promise<string> {
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing Authorization Bearer token");

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Missing env: CLERK_SECRET_KEY");

  // verifyToken valida o JWT (usando secretKey / JWKS conforme config)
  const { sub } = await verifyToken(token, { secretKey });
  if (!sub) throw new Error("Invalid token: missing sub");

  return sub;
}
