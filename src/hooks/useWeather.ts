import { useCallback, useEffect, useRef, useState } from "react";

interface Location {
  latitude: number;
  longitude: number;
  city: string;
  timestamp: number;
}
interface Weather {
  temperature: number;
  city: string;
  location: Location;
  timestamp: number;
}
type WeatherStatus = "loading" | "ready" | "error";
const CACHE_KEY = "dayline-weather-v1";
const fresh = (timestamp: unknown, ttl: number) =>
  typeof timestamp === "number" &&
  timestamp <= Date.now() &&
  Date.now() - timestamp < ttl;
function readCache(): Weather | null {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (
      !value ||
      typeof value.city !== "string" ||
      !Number.isFinite(value.temperature) ||
      !Number.isFinite(value.timestamp) ||
      !value.location ||
      !Number.isFinite(value.location.latitude) ||
      !Number.isFinite(value.location.longitude) ||
      typeof value.location.city !== "string" ||
      !Number.isFinite(value.location.timestamp)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<WeatherStatus>("loading");
  const active = useRef<AbortController | null>(null);
  const loadWeather = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    const signal = controller.signal;
    setStatus("loading");
    try {
      const cached = readCache();
      if (cached && fresh(cached.timestamp, 30 * 60 * 1000)) {
        setWeather(cached);
        setStatus("ready");
        return;
      }
      let location = cached?.location;
      if (!location || !fresh(location.timestamp, 24 * 60 * 60 * 1000)) {
        const response = await fetch("https://get.geojs.io/v1/ip/geo.json", {
          signal,
        });
        if (!response.ok) throw new Error("Location request failed");
        const data = await response.json();
        const latitude = Number.parseFloat(data.latitude),
          longitude = Number.parseFloat(data.longitude);
        if (
          !Number.isFinite(latitude) ||
          Math.abs(latitude) > 90 ||
          !Number.isFinite(longitude) ||
          Math.abs(longitude) > 180
        )
          throw new Error("Invalid location");
        location = {
          latitude,
          longitude,
          city: typeof data.city === "string" ? data.city : "",
          timestamp: Date.now(),
        };
      }
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: "temperature_2m",
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { signal },
      );
      if (!response.ok) throw new Error("Weather request failed");
      const data = await response.json();
      if (!Number.isFinite(data.current?.temperature_2m))
        throw new Error("Invalid weather");
      const result = {
        temperature: Math.round(data.current.temperature_2m),
        city: location.city,
        location,
        timestamp: Date.now(),
      };
      if (active.current !== controller || signal.aborted) return;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch {
        /* optional cache */
      }
      setWeather(result);
      setStatus("ready");
    } catch {
      if (active.current === controller) setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  }, []);
  useEffect(() => {
    void loadWeather();
    return () => {
      const controller = active.current;
      active.current = null;
      controller?.abort();
    };
  }, [loadWeather]);
  return { weather, status, loadWeather };
}
