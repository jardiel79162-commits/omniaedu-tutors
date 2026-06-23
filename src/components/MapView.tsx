import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths for bundlers
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

export function MapView({ lat, lng, zoom = 16, className }: { lat: number; lng: number; zoom?: number; className?: string }) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom className={className} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon} />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  );
}

export type ReverseAddress = {
  display: string;
  road?: string;
  city?: string;
  state?: string;
  country?: string;
};

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseAddress | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR&zoom=18`, {
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    const a = j.address || {};
    return {
      display: j.display_name as string,
      road: a.road || a.pedestrian || a.footway,
      city: a.city || a.town || a.village || a.suburb,
      state: a.state,
      country: a.country,
    };
  } catch {
    return null;
  }
}
