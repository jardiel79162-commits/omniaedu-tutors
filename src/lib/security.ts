/**
 * Utilitários de segurança que rodam no cliente.
 *
 * Importante: estes checks são UX/defesa-em-profundidade. A validação
 * autoritativa está nas RLS policies, validators dos server fns e nas
 * regras de bucket do storage.
 */

// ---------- Sanitização ----------

/** Escapa caracteres HTML perigosos. Use para renderizar texto bruto. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Remove tags de script/iframe e atributos on*= de uma string HTML. */
export function stripDangerousHtml(s: string): string {
  return s
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:\s*/gi, "");
}

// ---------- Detecção heurística ----------

const SQLI_PATTERNS = [
  /\bor\s+1\s*=\s*1\b/i,
  /\bunion\s+select\b/i,
  /\bdrop\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bxp_cmdshell\b/i,
  /;\s*--/,
];

const XSS_PATTERNS = [
  /<\s*script/i,
  /javascript\s*:/i,
  /\son(load|click|error|mouseover|focus)\s*=/i,
  /<\s*(iframe|embed|object)/i,
];

const PATH_TRAVERSAL = [/\.\.\//, /\.\.\\/, /%2e%2e/i, /%252e/i];

export interface RiskReport {
  score: number; // 0–100
  flags: string[];
}

/** Pontua o risco de uma string de entrada (input livre do usuário). */
export function scoreInputRisk(input: string): RiskReport {
  if (!input) return { score: 0, flags: [] };
  const flags: string[] = [];
  let score = 0;
  for (const r of SQLI_PATTERNS) if (r.test(input)) { score += 40; flags.push("sqli"); break; }
  for (const r of XSS_PATTERNS) if (r.test(input)) { score += 35; flags.push("xss"); break; }
  for (const r of PATH_TRAVERSAL) if (r.test(input)) { score += 30; flags.push("path_traversal"); break; }
  if (input.length > 10000) { score += 10; flags.push("oversize"); }
  return { score: Math.min(100, score), flags };
}

// ---------- Validação de URL (anti-SSRF de links externos) ----------

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isSafeExternalUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    // Faixas privadas IPv4
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false; // link-local
    return true;
  } catch {
    return false;
  }
}

// ---------- Validação de upload (magic bytes) ----------

export interface UploadCheckOptions {
  maxBytes?: number;
  allow?: "image" | "video" | "audio" | "any-media";
}

const SIGNATURES: { mime: string; ext: string; head: number[]; kind: "image" | "video" | "audio" }[] = [
  { mime: "image/jpeg", ext: "jpg", head: [0xff, 0xd8, 0xff], kind: "image" },
  { mime: "image/png", ext: "png", head: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], kind: "image" },
  { mime: "image/gif", ext: "gif", head: [0x47, 0x49, 0x46, 0x38], kind: "image" },
  { mime: "image/webp", ext: "webp", head: [0x52, 0x49, 0x46, 0x46], kind: "image" }, // RIFF...WEBP
  { mime: "video/mp4", ext: "mp4", head: [0x00, 0x00, 0x00], kind: "video" }, // ftyp em offset 4
  { mime: "video/webm", ext: "webm", head: [0x1a, 0x45, 0xdf, 0xa3], kind: "video" },
  { mime: "audio/mpeg", ext: "mp3", head: [0x49, 0x44, 0x33], kind: "audio" }, // ID3
  { mime: "audio/ogg", ext: "ogg", head: [0x4f, 0x67, 0x67, 0x53], kind: "audio" },
  { mime: "audio/wav", ext: "wav", head: [0x52, 0x49, 0x46, 0x46], kind: "audio" },
];

const DANGEROUS_EXT = /\.(exe|bat|cmd|com|sh|js|jsx|ts|tsx|php|phtml|asp|aspx|jsp|rb|py|pl|cgi|jar|war|msi|dll|svg|html?|htm)(\.|$)/i;

export interface UploadCheckResult {
  ok: boolean;
  reason?: string;
  detectedMime?: string;
}

/** Lê os primeiros bytes do arquivo e confere se a assinatura bate. */
export async function validateUpload(
  file: File,
  opts: UploadCheckOptions = {},
): Promise<UploadCheckResult> {
  const max = opts.maxBytes ?? 50 * 1024 * 1024;
  if (file.size <= 0) return { ok: false, reason: "Arquivo vazio." };
  if (file.size > max) return { ok: false, reason: `Arquivo maior que ${Math.round(max / 1024 / 1024)}MB.` };
  if (DANGEROUS_EXT.test(file.name)) return { ok: false, reason: "Tipo de arquivo bloqueado." };

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  // checagem ftyp do mp4 (bytes 4..7)
  const isMp4 = head.length >= 8 && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
  if (isMp4) return acceptIfAllowed("video/mp4", "video", opts);

  for (const sig of SIGNATURES) {
    if (sig.head.every((b, i) => head[i] === b)) {
      // webp/wav usam mesmo RIFF; valida marca em offset 8
      if (sig.mime === "image/webp") {
        const tag = String.fromCharCode(head[8] ?? 0, head[9] ?? 0, head[10] ?? 0, head[11] ?? 0);
        if (tag !== "WEBP") continue;
      }
      if (sig.mime === "audio/wav") {
        const tag = String.fromCharCode(head[8] ?? 0, head[9] ?? 0, head[10] ?? 0, head[11] ?? 0);
        if (tag !== "WAVE") continue;
      }
      return acceptIfAllowed(sig.mime, sig.kind, opts);
    }
  }
  return { ok: false, reason: "Não foi possível verificar o tipo do arquivo." };
}

function acceptIfAllowed(
  mime: string,
  kind: "image" | "video" | "audio",
  opts: UploadCheckOptions,
): UploadCheckResult {
  if (!opts.allow || opts.allow === "any-media") return { ok: true, detectedMime: mime };
  if (opts.allow === kind) return { ok: true, detectedMime: mime };
  return { ok: false, reason: `Esperado ${opts.allow}, recebido ${kind}.`, detectedMime: mime };
}

/** Gera um nome aleatório seguro mantendo a extensão derivada do MIME. */
export function safeFilename(mime: string): string {
  const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
  const rand = crypto.randomUUID().replace(/-/g, "");
  return `${rand}.${ext}`;
}

// ---------- Log de evento de segurança (cliente -> RPC) ----------

import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "low" | "medium" | "high" | "critical";

export async function logSecurityEvent(args: {
  type: string;
  severity?: Severity;
  riskScore?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.rpc("log_security_event", {
      _event_type: args.type,
      _severity: args.severity ?? "low",
      _risk_score: args.riskScore ?? 0,
      _route: typeof window !== "undefined" ? window.location.pathname : undefined,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      _message: args.message ?? undefined,
      _metadata: (args.metadata ?? {}) as never,
    });
  } catch {
    // logger nunca pode quebrar a UX
  }
}
