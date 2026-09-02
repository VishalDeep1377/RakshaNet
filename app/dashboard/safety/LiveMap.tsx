"use client";

// =============================================================
// RAKSHANET — LiveMap Component (Google Maps)
// Google Maps interactive map showing the user's
// real GPS position with accuracy circle, route history,
// and smart auto-panning controls.
// Loaded client-side only via dynamic() in safety/page.tsx
// =============================================================

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Navigation } from "lucide-react";

interface LiveMapProps {
  lat: number;
  lng: number;
  accuracy: number; // metres
  isLive: boolean;  // whether SOS is active (adds pulse ring)
  history: { lat: number; lng: number }[]; // breadcrumb trail
}

function MapController({ lat, lng, history, accuracy, isAutoPanning, setIsAutoPanning }: any) {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !maps) return;

    // Create polyline and circle once
    if (!polylineRef.current) {
      polylineRef.current = new maps.Polyline({
        map,
        strokeColor: "#00E5FF",
        strokeWeight: 4,
        strokeOpacity: 0.65,
        geodesic: true,
      });
    }

    if (!circleRef.current) {
      circleRef.current = new maps.Circle({
        map,
        fillColor: "#00E5FF",
        fillOpacity: 0.08,
        strokeColor: "#00E5FF",
        strokeWeight: 1.5,
      });
    }

    // Update history path
    const path = history.map((h: any) => ({ lat: h.lat, lng: h.lng }));
    if (path.length === 0) path.push({ lat, lng });
    polylineRef.current.setPath(path);

    // Update accuracy circle
    circleRef.current.setCenter({ lat, lng });
    circleRef.current.setRadius(Math.min(Math.max(accuracy, 10), 500));

    if (isAutoPanning) {
      map.panTo({ lat, lng });
    }

    // Detect drag to disable auto-panning
    const listener = map.addListener("dragstart", () => {
      setIsAutoPanning(false);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, maps, lat, lng, history, accuracy, isAutoPanning, setIsAutoPanning]);

  return null;
}

export default function LiveMap({ lat, lng, accuracy, isLive, history }: LiveMapProps) {
  const [isAutoPanning, setIsAutoPanning] = useState(true);
  
  // NOTE: If testing locally without an env file, you can paste the key here temporarily.
  // Otherwise it looks for NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const color = isLive ? "#FFBA08" : "#FF2D55";

  return (
    <div style={{ position: "relative", width: "100%", height: 280, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,229,255,0.18)" }}>
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultZoom={16}
            defaultCenter={{ lat, lng }}
            mapId="rakshanet_safety_map" // Required for AdvancedMarker
            disableDefaultUI={true}
            gestureHandling="greedy"
          >
            <MapController
              lat={lat}
              lng={lng}
              history={history}
              accuracy={accuracy}
              isAutoPanning={isAutoPanning}
              setIsAutoPanning={setIsAutoPanning}
            />

            <AdvancedMarker position={{ lat, lng }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: color,
                border: "3px solid #fff",
                boxShadow: `0 0 0 0 ${color}99, 0 2px 8px rgba(0,0,0,0.5)`,
                animation: isLive ? "raksha-pulse-live 1.2s infinite" : "raksha-pulse 1.8s infinite",
                position: "relative"
              }} />
              <style>{`
                @keyframes raksha-pulse {
                  0%   { box-shadow: 0 0 0 0 ${color}99, 0 2px 8px rgba(0,0,0,0.5); }
                  60%  { box-shadow: 0 0 0 20px ${color}00, 0 2px 8px rgba(0,0,0,0.5); }
                  100% { box-shadow: 0 0 0 0 ${color}00, 0 2px 8px rgba(0,0,0,0.5); }
                }
                @keyframes raksha-pulse-live {
                  0%   { box-shadow: 0 0 0 0 ${color}99, 0 2px 8px rgba(0,0,0,0.5); }
                  60%  { box-shadow: 0 0 0 24px ${color}00, 0 2px 8px rgba(0,0,0,0.5); }
                  100% { box-shadow: 0 0 0 0 ${color}00, 0 2px 8px rgba(0,0,0,0.5); }
                }
              `}</style>
            </AdvancedMarker>
          </Map>
        </APIProvider>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060A12", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          <span style={{ marginBottom: 8 }}>Google Maps API Key Required</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local</span>
        </div>
      )}

      {/* Floating Recenter Button overlay */}
      {!isAutoPanning && apiKey && (
        <button
          onClick={() => setIsAutoPanning(true)}
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 100,
            backgroundColor: "rgba(0, 229, 255, 0.15)",
            border: "1px solid rgba(0, 229, 255, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#00E5FF",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
          }}
        >
          <Navigation style={{ width: 14, height: 14 }} />
          Recenter
        </button>
      )}
    </div>
  );
}
