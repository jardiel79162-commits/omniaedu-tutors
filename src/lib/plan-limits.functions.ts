import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanLimitRow = {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string | null;
  value_type: "number" | "boolean" | "text" | "unlimited";
  free_value: any;
  plus_value: any;
  unit: string | null;
  sort_order: number;
  enabled: boolean;
  updated_at: string;
};

export const listPlanLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plan_limits" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as unknown as PlanLimitRow[];
  });

export const updatePlanLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    free_value?: any;
    plus_value?: any;
    enabled?: boolean;
    label?: string;
    description?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    } as any);
    if (!isAdmin) throw new Error("Forbidden");

    const patch: Record<string, any> = {};
    if (data.free_value !== undefined) patch.free_value = data.free_value;
    if (data.plus_value !== undefined) patch.plus_value = data.plus_value;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.label !== undefined) patch.label = data.label;
    if (data.description !== undefined) patch.description = data.description;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("plan_limits" as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
