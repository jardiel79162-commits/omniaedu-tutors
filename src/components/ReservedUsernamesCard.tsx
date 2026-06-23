import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AtSign, Plus, Trash2, Loader2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  listMyReservedUsernames,
  reserveUsername,
  releaseReservedUsername,
  checkUsernameAvailability,
} from "@/lib/reserved-usernames.functions";
import { usePlus } from "@/lib/use-plus";

type Item = {
  id: string;
  username: string;
  expires_at: string | null;
  created_at: string;
};

export function ReservedUsernamesCard() {
  const { isPlus } = usePlus();
  const list = useServerFn(listMyReservedUsernames);
  const reserve = useServerFn(reserveUsername);
  const release = useServerFn(releaseReservedUsername);
  const check = useServerFn(checkUsernameAvailability);

  const [items, setItems] = useState<Item[] | null>(null);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const data = await list();
      setItems(data as Item[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar reservas");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setAvailable(null);
    const u = value.trim().toLowerCase();
    if (!u || u.length < 2) return;
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await check({ data: { username: u } });
        setAvailable(res.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  async function handleAdd() {
    if (!value.trim() || !available) return;
    setSaving(true);
    try {
      await reserve({ data: { username: value.trim() } });
      setValue("");
      setAvailable(null);
      await refresh();
      toast.success("Username reservado");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível reservar");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await release({ data: { id } });
      await refresh();
      toast.success("Reserva removida");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover");
    }
  }

  const count = items?.length ?? 0;
  const slotsLeft = Math.max(0, 3 - count);

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary grid place-items-center">
          <AtSign className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Usernames reservados</div>
          <div className="text-[11px] text-muted-foreground">
            Até 3 nomes ficam seus. Após cancelar o PLUS, ficam bloqueados por 90 dias.
          </div>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {count}/3
        </span>
      </div>

      {!isPlus && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
          Exclusivo PLUS. Assine para reservar seus @.
        </div>
      )}

      {isPlus && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border bg-background px-3 h-10">
              <span className="text-muted-foreground text-sm">@</span>
              <input
                value={value}
                onChange={(e) =>
                  setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                }
                placeholder="seu_username"
                maxLength={30}
                disabled={slotsLeft === 0}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : available === true ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : available === false && value ? (
                <X className="h-4 w-4 text-destructive" />
              ) : null}
            </div>
            <button
              onClick={handleAdd}
              disabled={!available || saving || slotsLeft === 0}
              className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Reservar
            </button>
          </div>

          <div className="space-y-1.5">
            {items === null ? (
              <div className="text-xs text-muted-foreground">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma reserva ainda.</div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2"
                >
                  <span className="text-sm font-semibold truncate flex-1">@{it.username}</span>
                  {it.expires_at && (
                    <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                      <Clock className="h-3 w-3" />
                      libera {new Date(it.expires_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(it.id)}
                    aria-label="Remover"
                    className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
