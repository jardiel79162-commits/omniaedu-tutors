import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { Image as ImageIcon, Type, X } from "lucide-react";
import { toast } from "sonner";

const PALETTE = ["#075E54", "#1f8f5e", "#0ea5e9", "#7c3aed", "#dc2626", "#f59e0b", "#0f172a"];

export function StoryComposer({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(PALETTE[0]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function pickImage(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx 5MB)");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMode("image");
  }

  async function save() {
    if (mode === "text" && !text.trim()) return;
    if (mode === "image" && !imageFile) return;
    setSaving(true);
    const userId = await getCurrentUserId();
    if (!userId) {
      setSaving(false);
      return;
    }
    let mediaUrl: string | null = null;
    if (mode === "image" && imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("status-media")
        .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
      if (upErr) {
        setSaving(false);
        toast.error("Falha ao enviar imagem");
        return;
      }
      mediaUrl = supabase.storage.from("status-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("statuses").insert({
      user_id: userId,
      content: text.trim() || null,
      background: mode === "text" ? bg : null,
      media_url: mediaUrl,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Story publicado");
    onClose();
  }

  const canPublish = mode === "image" ? !!imageFile : !!text.trim();

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={mode === "text" ? { background: bg } : { background: "#000" }}
    >
      <div className="flex items-center justify-between px-4 pt-4 text-white">
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-black/30 grid place-items-center">
          <X className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("text");
              setImageFile(null);
              setImagePreview(null);
            }}
            className={`h-10 w-10 rounded-full grid place-items-center ${
              mode === "text" ? "bg-white text-foreground" : "bg-black/30"
            }`}
            aria-label="Texto"
          >
            <Type className="h-5 w-5" />
          </button>
          <label
            className={`h-10 w-10 rounded-full grid place-items-center cursor-pointer ${
              mode === "image" ? "bg-white text-foreground" : "bg-black/30"
            }`}
            aria-label="Imagem"
          >
            <ImageIcon className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
              }}
            />
          </label>
        </div>
        <button
          disabled={saving || !canPublish}
          onClick={save}
          className="rounded-full bg-white text-foreground px-5 py-2 font-semibold disabled:opacity-50"
        >
          {saving ? "..." : "Publicar"}
        </button>
      </div>

      {mode === "image" && imagePreview ? (
        <>
          <div className="flex-1 grid place-items-center px-4 overflow-hidden">
            <img
              src={imagePreview}
              alt="Pré-visualização"
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
          <div className="px-4 pb-6">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Adicione uma legenda..."
              className="w-full bg-black/40 text-white placeholder-white/60 rounded-full px-4 py-3 outline-none"
              maxLength={200}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 grid place-items-center px-6">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite seu story..."
              className="w-full bg-transparent text-white text-2xl text-center placeholder-white/60 outline-none resize-none font-semibold"
              rows={6}
              maxLength={300}
            />
          </div>
          <div className="flex gap-2 justify-center pb-6">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setBg(c)}
                className={`h-9 w-9 rounded-full ring-2 ${bg === c ? "ring-white" : "ring-transparent"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
