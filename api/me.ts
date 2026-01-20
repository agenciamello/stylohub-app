import { requireClerkUserId, supabaseAdmin } from "./_utils.ts";

export default async function handler(req: any, res: any) {
  let clerkUserId: string;
  try {
    clerkUserId = await requireClerkUserId(req);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message ?? "Unauthorized" });
  }

  const { data, error } = await supabaseAdmin
    .from("barbers")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ barber: data ?? null });
}
