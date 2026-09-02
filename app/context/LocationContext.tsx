"use client";

// =============================================================
// RAKSHANET — Global Location Context
// Single GPS watcher for the entire app. Reverse-geocodes via
// Nominatim (free, no API key). Feeds live distress engine in
// background so ChatWidget always has fresh context.
// =============================================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  calculateDistressScore,
  type DistressResult,
  type SafeLocationInput,
  type HomeLocationInput,
  type WorkLocationInput,
} from "@/lib/distress/engine";
import {
  addLocationToHistory,
  getLocationHistory,
  type LocationPoint,
} from "@/lib/location/history";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────
export type PermissionState = "prompt" | "granted" | "denied" | "unavailable";

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy: number; // metres
  address: string;
  timestamp: number;
}

export interface LocationContextValue {
  // Current GPS position
  location: LiveLocation | null;
  permissionState: PermissionState;
  locationHistory: LocationPoint[];

  // Background distress result (always fresh)
  distressResult: DistressResult | null;

  // Request permission + start watcher
  requestPermission: () => void;

  // Simulator for testing live tracking on desktop
  simulateMovement: () => void;
}

// ── Context ───────────────────────────────────────────────────
const LocationContext = createContext<LocationContextValue>({
  location: null,
  permissionState: "prompt",
  locationHistory: [],
  distressResult: null,
  requestPermission: () => {},
  simulateMovement: () => {},
});

export function useLocation() {
  return useContext(LocationContext);
}

// ── Nominatim reverse geocoder (free, no key) ─────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    // Build a concise address: suburb/neighbourhood + city
    const { suburb, neighbourhood, city, town, village, road, state } =
      data.address ?? {};
    const area = suburb ?? neighbourhood ?? road ?? "";
    const place = city ?? town ?? village ?? state ?? "";
    if (area && place) return `${area}, ${place}`;
    if (area) return area;
    if (place) return place;
    return data.display_name?.split(",").slice(0, 2).join(",").trim() ??
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ── Provider ──────────────────────────────────────────────────
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("prompt");
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [distressResult, setDistressResult] = useState<DistressResult | null>(null);

  // Profile data (loaded once from Supabase)
  const profileRef = useRef<{
    safeLocations: SafeLocationInput[];
    homeLocation: HomeLocationInput | null;
    workLocations: WorkLocationInput[];
    totalIncidents: number;
    recentIncidents: number;
  }>({
    safeLocations: [],
    homeLocation: null,
    workLocations: [],
    totalIncidents: 0,
    recentIncidents: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── Load profile once ──────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profile }, { data: sl }, { data: allInc }, { data: recentInc }] =
          await Promise.all([
            supabase.from("profiles").select("home_location,work_locations").eq("id", user.id).single(),
            supabase.from("safe_locations").select("*").eq("user_id", user.id),
            supabase.from("incidents").select("id").eq("user_id", user.id),
            supabase.from("incidents").select("id").eq("user_id", user.id)
              .gte("started_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          ]);

        profileRef.current = {
          safeLocations: (sl ?? []) as SafeLocationInput[],
          homeLocation: profile?.home_location as HomeLocationInput | null ?? null,
          workLocations: (Array.isArray(profile?.work_locations) ? profile.work_locations : []) as WorkLocationInput[],
          totalIncidents: (allInc ?? []).length,
          recentIncidents: (recentInc ?? []).length,
        };
      } catch {
        /* no-op — engine runs with empty profile */
      }
    };
    loadProfile();
  }, []);

  // ── Run distress engine whenever location updates ──────────
  const runEngine = useCallback(
    (lat: number, lng: number, history: LocationPoint[]) => {
      const p = profileRef.current;
      const result = calculateDistressScore({
        userLat: lat,
        userLng: lng,
        safeLocations: p.safeLocations,
        homeLocation: p.homeLocation,
        workLocations: p.workLocations,
        regularRoutes: [],
        locationHistory: history,
        totalIncidents: p.totalIncidents,
        recentIncidents: p.recentIncidents,
        lastActiveAt: new Date(),
        hourOfDay: new Date().getHours(),
        manualTrigger: false,
        userReportedUnsafe: false,
      });
      setDistressResult(result);
    },
    []
  );

  // ── GPS position handler ───────────────────────────────────
  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setPermissionState("granted");

      // Update history in localStorage
      const newHistory = addLocationToHistory(latitude, longitude, accuracy);
      setLocationHistory(newHistory);

      // Run engine immediately with new point
      runEngine(latitude, longitude, newHistory);

      // Update location state (keep address from last geocode if available)
      setLocation((prev) => ({
        lat: latitude,
        lng: longitude,
        accuracy,
        address: prev?.address ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        timestamp: Date.now(),
      }));

      // Throttle reverse geocoding: only if moved > 100m or first point
      const last = lastGeocodedRef.current;
      const needsGeocode =
        !last ||
        Math.abs(latitude - last.lat) > 0.001 ||
        Math.abs(longitude - last.lng) > 0.001;

      if (needsGeocode) {
        lastGeocodedRef.current = { lat: latitude, lng: longitude };
        if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = setTimeout(async () => {
          const address = await reverseGeocode(latitude, longitude);
          setLocation((prev) =>
            prev ? { ...prev, address } : null
          );
        }, 500);
      }
    },
    [runEngine]
  );

  // ── GPS error handler ─────────────────────────────────────
  const handleError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionState("denied");
    }
    // Run engine with null GPS
    const p = profileRef.current;
    const history = getLocationHistory();
    setLocationHistory(history);
    const result = calculateDistressScore({
      userLat: null,
      userLng: null,
      safeLocations: p.safeLocations,
      homeLocation: p.homeLocation,
      workLocations: p.workLocations,
      regularRoutes: [],
      locationHistory: history,
      totalIncidents: p.totalIncidents,
      recentIncidents: p.recentIncidents,
      lastActiveAt: new Date(),
      hourOfDay: new Date().getHours(),
      manualTrigger: false,
      userReportedUnsafe: false,
    });
    setDistressResult(result);
  }, []);

  // ── Start GPS watcher ──────────────────────────────────────
  const startWatcher = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPermissionState("unavailable");
      return;
    }
    if (watchIdRef.current !== null) return; // already watching

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 }
    );
  }, [handlePosition, handleError]);

  // ── Request permission explicitly ──────────────────────────
  const requestPermission = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePosition(pos);
        startWatcher();
        if (pos.coords.accuracy > 1000) {
          alert(
            "GPS Sync Complete.\n\nHowever, your device reported an accuracy of ±" + 
            Math.round(pos.coords.accuracy) + 
            "m.\n\nSince desktop computers usually lack dedicated GPS hardware, they guess your location based on your internet provider's IP address. To get pinpoint ±5m accuracy, please open this app on a mobile phone!"
          );
        }
      },
      (err) => {
        handleError(err);
        alert("Failed to fetch GPS: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 }
    );
  }, [handlePosition, handleError, startWatcher]);

  // ── Simulator for testing on Desktop ───────────────────────
  const simulateMovement = useCallback(() => {
    if (!location) {
      alert("Please wait for initial GPS lock before simulating.");
      return;
    }
    
    let currentLat = location.lat;
    let currentLng = location.lng;
    
    // Simulate walking down a street (approx 2 meters per tick)
    const latStep = -0.00002;
    const lngStep = 0.00002;
    
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      if (ticks > 50) {
        clearInterval(interval);
        return;
      }
      
      currentLat += latStep + (Math.random() * 0.000005);
      currentLng += lngStep + (Math.random() * 0.000005);
      
      const mockPos = {
        coords: {
          latitude: currentLat,
          longitude: currentLng,
          accuracy: 5 + Math.random() * 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: 1.5,
          toJSON() { return this; },
        },
        timestamp: Date.now()
      } as GeolocationPosition;
      
      handlePosition(mockPos);
    }, 1500); // tick every 1.5s
  }, [location, handlePosition]);

  // ── Auto-start on mount ────────────────────────────────────
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermissionState("unavailable");
      return;
    }
    // Load cached history immediately
    setLocationHistory(getLocationHistory());

    // Check current permission state without prompting
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          setPermissionState("granted");
          startWatcher();
        } else if (result.state === "denied") {
          setPermissionState("denied");
        } else {
          setPermissionState("prompt");
          // Auto-start watcher — browser will show native permission prompt
          startWatcher();
        }
        result.onchange = () => {
          if (result.state === "granted") {
            setPermissionState("granted");
            startWatcher();
          } else if (result.state === "denied") {
            setPermissionState("denied");
          }
        };
      })
      .catch(() => {
        // permissions API not supported — just start watching
        startWatcher();
      });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        permissionState,
        locationHistory,
        distressResult,
        requestPermission,
        simulateMovement,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
