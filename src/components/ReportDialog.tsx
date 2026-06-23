import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";
import {
  submitReport,
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reports.functions";

const REASONS: ReportReason[] = [
  "spam_golpe",
  "assedio_bullying",
  "nudez",
  "odio_violencia",
  "automutilacao",
  "outro",
];

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetUserId,
  targetLabel,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId: string;
  targetLabel?: string;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const send = useServerFn(submitReport);

  if (!open) return null;

  async function handleSubmit() {
    if (!reason) {
      toast.error("Selecione um motivo");
      return;
    }
    if (reason === "outro" && details.trim().length < 10) {
      toast.error("Descreva o motivo (mín. 10 caracteres)");
      return;
    }
    setBusy(true);
    try {
      await send({
        data: {
          target_type: targetType,
          target_id: targetId,
          target_user_id: targetUserId,
          reason,
          details: details.trim() || null,
        },
      });
      toast.success("Denúncia enviada ao departamento de investigação");
      setReason(null);
      setDetails("");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar denúncia");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 px-5 pt-5 pb-3 border-b">
          <div className="h-10 w-10 rounded-xl bg-destructive/15 text-destructive grid place-items-center">
            <Flag className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base">Denunciar</h2>
            <p className="text-xs text-muted-foreground truncate">
              {targetLabel ?? `Denunciar ${targetType}`}
            </p>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Motivo
            </p>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                    reason === r
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {REPORT_REASON_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {reason && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {reason === "outro" ? "Explique o que aconteceu" : "Detalhes (opcional)"}
              </p>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1500))}
                placeholder="Descreva o ocorrido com o máximo de detalhes possível…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {details.length}/1500
              </p>
            </div>
          )}

          <div className="bg-muted/60 rounded-xl p-3 text-[11px] text-muted-foreground">
            Sua identidade é protegida. A denúncia é enviada ao departamento de
            investigação. Perfis com 10 ou mais denúncias entram em supervisão.
          </div>
        </div>

        <footer className="px-5 py-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full bg-muted text-foreground text-sm font-semibold py-2.5 hover:bg-muted/80"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !reason}
            className="flex-1 rounded-full bg-destructive text-destructive-foreground text-sm font-bold py-2.5 disabled:opacity-50 hover:opacity-90"
          >
            {busy ? "Enviando…" : "Enviar denúncia"}
          </button>
        </footer>
      </div>
    </div>
  );
}
