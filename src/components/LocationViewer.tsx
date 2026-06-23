import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Navigation, Loader2 } from "lucide-react";
import { MapView, reverseGeocode, type ReverseAddress } from "./MapView";

export function LocationViewer({
  lat, lng, initialLabel, initialAddress, onClose,
}: {
  lat: number; lng: number; initialLabel?: string; initialAddress?: string; onClose: () => void;
}) {
  const [addr, setAddr] = useState<ReverseAddress | null>(null);
  const [loading, setLoading] = useState(!initialAddress);

  useEffect(() => {
    if (initialAddress) return;
    setLoading(true);
    reverseGeocode(lat, lng).then(a => { setAddr(a); setLoading(false); });
  }, [lat, lng, initialAddress]);

  const label = initialLabel || (addr?.road ? [addr.road, addr.city].filter(Boolean).join(", ") : addr?.city || "Localização");
  const full = initialAddress || addr?.display || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="px-3 py-3 border-b flex items-center gap-2">
        <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="font-semibold flex-1 truncate">{label}</div>
      </header>

      <div className="flex-1 bg-muted">
        <MapView lat={lat} lng={lng} zoom={17} />
      </div>

      <div className="border-t bg-background p-3 space-y-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{loading ? "Carregando endereço…" : label}</div>
            <div className="text-xs text-muted-foreground line-clamp-3">
              {loading ? <Loader2 className="h-3.5 w-3.5 inline animate-spin" /> : full}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
          </div>
        </div>
        <a
          href={`geo:${lat},${lng}?q=${lat},${lng}`}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2"
        >
          <Navigation className="h-4 w-4" /> Como chegar
        </a>
      </div>
    </div>
  );
}
