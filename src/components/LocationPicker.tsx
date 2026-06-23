import { useEffect, useState } from "react";
import { X, MapPin, Send, Loader2 } from "lucide-react";
import { MapView, reverseGeocode, type ReverseAddress } from "./MapView";

export function LocationPicker({
  onCancel,
  onSend,
}: {
  onCancel: () => void;
  onSend: (data: { lat: number; lng: number; label: string; address: string }) => void;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addr, setAddr] = useState<ReverseAddress | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setErr("Geolocalização indisponível neste dispositivo."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (e) => setErr(e.message || "Não foi possível obter sua localização"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    setLoadingAddr(true);
    reverseGeocode(coords.lat, coords.lng).then((a) => { setAddr(a); setLoadingAddr(false); });
  }, [coords]);

  const shortLabel = addr?.road
    ? [addr.road, addr.city].filter(Boolean).join(", ")
    : addr?.city || "Localização atual";
  const fullAddress = addr?.display ?? `${coords?.lat.toFixed(6)}, ${coords?.lng.toFixed(6)}`;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="px-3 py-3 border-b flex items-center gap-2">
        <button onClick={onCancel} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <div className="font-semibold flex-1">Enviar localização</div>
      </header>

      <div className="flex-1 relative bg-muted">
        {coords ? (
          <MapView lat={coords.lat} lng={coords.lng} zoom={17} />
        ) : err ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{err}</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="border-t bg-background p-3 space-y-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{loadingAddr ? "Obtendo endereço…" : shortLabel}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{loadingAddr ? "" : fullAddress}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={!coords}
          onClick={() => coords && onSend({ lat: coords.lat, lng: coords.lng, label: shortLabel, address: fullAddress })}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Enviar localização atual
        </button>
      </div>
    </div>
  );
}
