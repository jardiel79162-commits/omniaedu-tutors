import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { activatePlus } from "@/lib/payments.server";

const MP_BASE = "https://api.mercadopago.com";

/**
 * Verifies MercadoPago x-signature header.
 * Format: "ts=<unix>,v1=<hex_hmac>"
 * Manifest signed: id:<dataId>;request-id:<reqId>;ts:<ts>;
 * See https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */
function verifyMpSignature(
  secret: string,
  sigHeader: string | null,
  reqIdHeader: string | null,
  dataId: string | null,
): boolean {
  if (!sigHeader || !dataId) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  // Reject signatures older than 5 minutes (replay protection)
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;

  const manifest = `id:${dataId};${reqIdHeader ? `request-id:${reqIdHeader};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        if (!token || !secret) {
          console.error("[mp-webhook] missing secrets");
          return new Response("misconfigured", { status: 500 });
        }

        const url = new URL(request.url);
        let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
        let topic = url.searchParams.get("type") || url.searchParams.get("topic");

        // Read raw body once (needed if we ever want body-based HMAC; MP signs the id)
        const rawBody = await request.text();
        try {
          const body = rawBody ? JSON.parse(rawBody) : null;
          if (body?.data?.id) paymentId = String(body.data.id);
          if (body?.type) topic = String(body.type);
        } catch {
          // ignore — query string fallback
        }

        // Verify signature BEFORE any external call
        const sigHeader = request.headers.get("x-signature");
        const reqIdHeader = request.headers.get("x-request-id");
        if (!verifyMpSignature(secret, sigHeader, reqIdHeader, paymentId)) {
          return new Response("invalid signature", { status: 401 });
        }

        if (!paymentId || (topic && topic !== "payment")) {
          return new Response("ignored", { status: 200 });
        }

        const res = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error("[mp-webhook] fetch payment failed", res.status);
          return new Response("ok", { status: 200 });
        }
        const p: { status?: string; external_reference?: string; id?: string | number } =
          await res.json();
        if (p.status === "approved" && p.external_reference?.startsWith("plus:")) {
          const uid = p.external_reference.slice(5);
          await activatePlus(uid, String(p.id));
        }
        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
