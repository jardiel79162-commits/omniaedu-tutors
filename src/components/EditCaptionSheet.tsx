import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updatePostCaption } from "@/lib/social";

export function EditCaptionSheet({
  postId,
  initialCaption,
  onClose,
  onSaved,
}: {
  postId: string;
  initialCaption: string;
  onClose: () => void;
  onSaved: (caption: string) => void;
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    const trimmed = caption.trim();
    if (trimmed === initialCaption.trim()) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await updatePostCaption(postId, trimmed);
      onSaved(trimmed);
      toast.success("Legenda atualizada");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={onClose}>
      <div
        className="bg-background w-full rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-semibold">Editar legenda</h3>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm font-semibold text-primary disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escreva uma legenda…"
            maxLength={2200}
            rows={8}
            autoFocus
            className="w-full resize-none rounded-xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-2 text-right text-xs text-muted-foreground">
            {caption.length}/2200
          </div>
        </div>
      </div>
    </div>
  );
}
