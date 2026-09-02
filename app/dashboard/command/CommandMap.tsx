"use client";

// =============================================================
// RAKSHANET — Command Map Component (Google Maps)
// Tactical view for the Command Center. Plots the active incident
// and all generated responders around it.
// =============================================================

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

export interface CommandResponder {
  id: string;
  name: string;
  type: string;
  status: "Available" | "Dispatched" | "Arrived";
  lat: number;
  lng: number;
  color: string;
  distanceKm: number;
  etaMins: number;
}

interface CommandMapProps {
  incidentLat: number;
  incidentLng: number;
  responders: CommandResponder[];
}

export default function CommandMap({ incidentLat, incidentLng, responders }: CommandMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(0,229,255,0.18)", background: "#060A12" }}>
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultZoom={15}
            defaultCenter={{ lat: incidentLat, lng: incidentLng }}
            mapId="rakshanet_command_map"
            disableDefaultUI={true}
            gestureHandling="greedy"
          >
            {/* The Victim / Active Incident */}
            <AdvancedMarker position={{ lat: incidentLat, lng: incidentLng }} zIndex={100}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "#FF2D55",
                border: "4px solid #fff",
                boxShadow: `0 0 0 0 #FF2D5599, 0 4px 12px rgba(0,0,0,0.6)`,
                animation: "raksha-pulse-live 1.2s infinite",
                position: "relative"
              }} />
              <style>{`
                @keyframes raksha-pulse-live {
                  0%   { box-shadow: 0 0 0 0 #FF2D5599, 0 2px 8px rgba(0,0,0,0.5); }
                  60%  { box-shadow: 0 0 0 30px #FF2D5500, 0 2px 8px rgba(0,0,0,0.5); }
                  100% { box-shadow: 0 0 0 0 #FF2D5500, 0 2px 8px rgba(0,0,0,0.5); }
                }
              `}</style>
            </AdvancedMarker>

            {/* The Responders */}
            {responders.map(r => (
              <AdvancedMarker key={r.id} position={{ lat: r.lat, lng: r.lng }} zIndex={50}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    padding: "4px 8px", background: "rgba(6,10,18,0.9)", border: `1px solid ${r.color}50`, 
                    borderRadius: 6, marginBottom: 4, fontSize: 10, fontWeight: 700, color: "#fff",
                    backdropFilter: "blur(8px)", display: "flex", gap: 6, alignItems: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
                  }}>
                    <span style={{ color: r.color }}>{r.name}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{r.etaMins}m</span>
                  </div>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: r.color,
                    border: "2px solid #fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
                  }} />
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          <span>Google Maps API Key Required</span>
        </div>
      )}
    </div>
  );
}
