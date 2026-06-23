import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activatePlus } from "./payments.server";

const MP_BASE = "https://api.mercadopago.com";
const PLUS_PRICE = 19.9;

function getToken() {
  const t = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  return t;
}

function getPublicBase() {
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.VITE_PUBLIC_BASE_URL ||
    "https://jtc-interlink.lovable.app"
  );
}

// Expose the MP public (publishable) key to the browser so MP.js can tokenize cards.
export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.MERCADO_PAGO_PUBLIC_KEY;
  if (!key) throw new Error("MERCADO_PAGO_PUBLIC_KEY não configurado");
  return { public_key: key };
});

// Create a Pix payment in-app: returns QR code + ticket url
export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      payer_email: z.string().email().max(200),
      payer_first_name: z.string().min(1).max(60),
      payer_last_name: z.string().min(1).max(60),
      payer_doc_number: z.string().min(8).max(20),
    }),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const token = getToken();
    const idem = `pix-${userId}-${Date.now()}`;
    const body = {
      transaction_amount: PLUS_PRICE,
      description: "Peacely PLUS — Mensal",
      payment_method_id: "pix",
      notification_url: `${getPublicBase()}/api/public/mp-webhook`,
      external_reference: `plus:${userId}`,
      payer: {
        email: data.payer_email,
        first_name: data.payer_first_name,
        last_name: data.payer_last_name,
        identification: {
          type: "CPF",
          number: data.payer_doc_number.replace(/\D/g, ""),
        },
      },
    };
    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idem,
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json();
    if (!res.ok) {
      console.error("[MP] pix error", json);
      throw new Error(json?.message || "Falha ao criar pagamento Pix");
    }
    const poi = json?.point_of_interaction?.transaction_data || {};
    return {
      payment_id: String(json.id),
      status: json.status as string,
      qr_code: poi.qr_code as string,
      qr_code_base64: poi.qr_code_base64 as string,
      ticket_url: poi.ticket_url as string,
      amount: PLUS_PRICE,
    };
  });

// Get payment status (poll while waiting Pix confirmation)
export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ payment_id: z.string().min(1).max(50) }))
  .handler(async ({ data, context }) => {
    const token = getToken();
    const res = await fetch(`${MP_BASE}/v1/payments/${data.payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json: any = await res.json();
    if (!res.ok) throw new Error(json?.message || "Falha ao consultar pagamento");
    // Verify ownership: external_reference must encode the caller's user id.
    const expectedRef = `plus:${context.userId}`;
    if (json.external_reference !== expectedRef) {
      throw new Error("Pagamento não encontrado");
    }
    if (json.status === "approved") {
      await activatePlus(context.userId, String(json.id));
    }
    return { status: json.status as string };
  });

// In-app card payment (credit/debit) — receives a tokenized card from MP.js
export const createCardPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      token: z.string().min(8).max(200),
      payment_method_id: z.string().min(2).max(40),
      payment_type: z.enum(["credit_card", "debit_card"]),
      installments: z.number().int().min(1).max(12).default(1),
      issuer_id: z.string().max(40).optional(),
      payer_email: z.string().email().max(200),
      payer_first_name: z.string().min(1).max(60),
      payer_last_name: z.string().min(1).max(60),
      payer_doc_number: z.string().min(8).max(20),
    }),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const token = getToken();
    const idem = `card-${userId}-${Date.now()}`;
    const body: Record<string, unknown> = {
      transaction_amount: PLUS_PRICE,
      token: data.token,
      description: "Peacely PLUS — Mensal",
      installments: data.installments,
      payment_method_id: data.payment_method_id,
      notification_url: `${getPublicBase()}/api/public/mp-webhook`,
      external_reference: `plus:${userId}`,
      statement_descriptor: "Peacely",
      payer: {
        email: data.payer_email,
        first_name: data.payer_first_name,
        last_name: data.payer_last_name,
        identification: {
          type: "CPF",
          number: data.payer_doc_number.replace(/\D/g, ""),
        },
      },
    };
    if (data.issuer_id) (body as any).issuer_id = data.issuer_id;

    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idem,
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json();
    if (!res.ok) {
      console.error("[MP] card error", json);
      throw new Error(json?.message || "Falha ao processar cartão");
    }
    if (json.status === "approved") {
      await activatePlus(userId, String(json.id));
    }
    return {
      payment_id: String(json.id),
      status: json.status as string,
      status_detail: json.status_detail as string,
    };
  });
