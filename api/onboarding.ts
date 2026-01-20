import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireClerkUserId, supabaseAdmin } from "./_utils";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔐 Autenticação via Clerk
    const clerkUserId = await requireClerkUserId(req);

    const {
      avgPrice,
      clientsPerDay,
      daysPerWeek,
      firstName,
      fullName,
      email,
    } = req.body ?? {};

    // 🛡️ Validação defensiva mínima
    if (
      typeof avgPrice !== "number" ||
      typeof clientsPerDay !== "number" ||
      typeof daysPerWeek !== "number"
    ) {
      return res.status(400).json({
        error: "Dados inválidos no onboarding",
      });
    }

    // 💾 UPSERT no Supabase (idempotente)
    const { data, error } = await supabaseAdmin
      .from("barbers")
      .upsert(
        {
          clerk_user_id: clerkUserId,
          email: email ?? null,
          first_name: firstName ?? null,
          full_name: fullName ?? null,
          avg_price: avgPrice,
          clients_per_day: clientsPerDay,
          days_per_week: daysPerWeek,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "clerk_user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase upsert error:", error);
      return res.status(500).json({
        error: "Erro ao salvar onboarding no banco",
      });
    }

    return res.status(200).json({
      success: true,
      barber: data,
    });
  } catch (err: any) {
    console.error("❌ Onboarding API error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
