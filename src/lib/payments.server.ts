import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function activatePlus(userId: string, paymentId: string) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);
  await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "plus",
        status: "active",
        mp_payment_id: paymentId,
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}
