"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Locate, Search, CheckCircle2 } from "lucide-react";

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  title?: string;
}

declare global {
  interface Window {
    L: typeof import("leaflet");
  }
}

export default function MapPicker({ open, onClose, onSelect, title = "Pick Location" }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latlng, setLatlng] = useState<{ lat: number; lng: number } | null>(null);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      return data.display_name as string;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        const map = mapInstanceRef.current;
        const L = window.L;
        if (map && L) {
          map.setView([latNum, lngNum], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([latNum, lngNum]);
          } else {
            const icon = L.divIcon({
              html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#7B61FF,#B47FFF);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid rgba(255,255,255,0.9);box-shadow:0 4px 16px rgba(123,97,255,0.6)"></div>`,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            });
            markerRef.current = L.marker([latNum, lngNum], { icon }).addTo(map);
          }
          setLatlng({ lat: latNum, lng: lngNum });
          setAddress(display_name);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const locateMe = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        const L = window.L;
        if (map && L) {
          map.setView([latitude, longitude], 17);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            const icon = L.divIcon({
              html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#7B61FF,#B47FFF);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid rgba(255,255,255,0.9);box-shadow:0 4px 16px rgba(123,97,255,0.6)"></div>`,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
            });
            markerRef.current = L.marker([latitude, longitude], { icon }).addTo(map);
          }
        }
        const addr = await reverseGeocode(latitude, longitude);
        setLatlng({ lat: latitude, lng: longitude });
        setAddress(addr);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!open) return;

    const initMap = async () => {
      if (!mapRef.current) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = window.L;
      const map = L.map(mapRef.current!, {
        center: [20.5937, 78.9629], // India center
        zoom: 5,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("click", async (e: import("leaflet").LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const icon = L.divIcon({
            html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#7B61FF,#B47FFF);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid rgba(255,255,255,0.9);box-shadow:0 4px 16px rgba(123,97,255,0.6)"></div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
        setLatlng({ lat, lng });
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
      });

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open]);

  const handleConfirm = () => {
    if (latlng && address) {
      onSelect(address, latlng.lat, latlng.lng);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}
          />

          {/* Modal Wrapper for Centering */}
          <div style={{ position: "fixed", inset: 0, zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <motion.div
              initial={{ opacity:0, scale:0.94, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.94, y:20 }} transition={{ type:"spring", damping:28, stiffness:300 }}
              style={{
                width:"min(680px,96vw)", borderRadius:20, overflow:"hidden", pointerEvents: "auto",
                background:"rgba(9,14,26,0.97)", border:"1px solid rgba(123,97,255,0.25)",
                boxShadow:"0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
                  background:"rgba(123,97,255,0.15)", border:"1px solid rgba(123,97,255,0.3)" }}>
                  <MapPin style={{ width:15, height:15, color:"#B47FFF" }} />
                </div>
                <span style={{ fontSize:15, fontWeight:700, color:"#F0F4FF" }}>{title}</span>
              </div>
              <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,0.08)",
                background:"rgba(255,255,255,0.04)", color:"rgba(240,244,255,0.4)", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X style={{ width:14, height:14 }} />
              </button>
            </div>

            {/* Search bar */}
            <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)",
              display:"flex", gap:8 }}>
              <div style={{ flex:1, position:"relative" }}>
                <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"rgba(240,244,255,0.3)", pointerEvents:"none" }} />
                <input
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchAddress()}
                  placeholder="Search for an address or place..."
                  style={{ width:"100%", paddingLeft:36, paddingRight:14, paddingTop:9, paddingBottom:9,
                    borderRadius:10, fontSize:13, color:"#F0F4FF", background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)", outline:"none", fontFamily:"inherit" }}
                />
              </div>
              <button onClick={searchAddress} disabled={loading} style={{ padding:"9px 16px", borderRadius:10, fontSize:12, fontWeight:700,
                background:"rgba(123,97,255,0.2)", border:"1px solid rgba(123,97,255,0.35)", color:"#B47FFF",
                cursor:"pointer", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                {loading ? "..." : "Search"}
              </button>
              <button onClick={locateMe} disabled={locating} title="Use my location" style={{ padding:"9px 12px", borderRadius:10,
                background:"rgba(0,229,255,0.1)", border:"1px solid rgba(0,229,255,0.25)", color:"#00E5FF",
                cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <Locate style={{ width:14, height:14 }} />
                {locating ? <span style={{ fontSize:11 }}>...</span> : <span style={{ fontSize:11, fontWeight:700 }}>GPS</span>}
              </button>
            </div>

            {/* Map */}
            <div style={{ position:"relative", height:340 }}>
              <div ref={mapRef} style={{ width:"100%", height:"100%" }} />
              {!latlng && (
                <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)",
                  background:"rgba(9,14,26,0.85)", padding:"8px 16px", borderRadius:20,
                  fontSize:12, color:"rgba(240,244,255,0.5)", border:"1px solid rgba(255,255,255,0.08)",
                  backdropFilter:"blur(8px)", pointerEvents:"none", whiteSpace:"nowrap" }}>
                  Click anywhere on the map to drop a pin
                </div>
              )}
            </div>

            {/* Selected address + confirm */}
            <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,0.06)",
              display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                {address ? (
                  <>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                      color:"rgba(240,244,255,0.3)", marginBottom:4 }}>Selected Address</div>
                    <div style={{ fontSize:12, color:"rgba(240,244,255,0.7)", lineHeight:1.4, overflow:"hidden",
                      textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      {address}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize:12, color:"rgba(240,244,255,0.3)" }}>No location selected yet</div>
                )}
              </div>
              <button onClick={handleConfirm} disabled={!latlng}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:12,
                  fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
                  border:"none", cursor: latlng ? "pointer" : "not-allowed", flexShrink:0,
                  background: latlng ? "linear-gradient(135deg,#7B61FF,#B47FFF)" : "rgba(255,255,255,0.06)",
                  color: latlng ? "#030508" : "rgba(240,244,255,0.2)",
                  boxShadow: latlng ? "0 4px 16px rgba(123,97,255,0.4)" : "none",
                  transition:"all 0.2s" }}>
                <CheckCircle2 style={{ width:14, height:14 }} />
                Confirm
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
