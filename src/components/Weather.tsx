import { CloudSun } from "lucide-react";
import { useWeather } from "../hooks/useWeather";

export default function Weather() {
  const { weather, status, loadWeather } = useWeather();
  if (status === "ready" && weather)
    return (
      <span className="weather-result">
        <CloudSun size={18} />
        <span>
          {weather.city && (
            <span className="weather-city">{weather.city} · </span>
          )}
          {weather.temperature > 0 ? "+" : ""}
          {weather.temperature}°
        </span>
      </span>
    );
  return (
    <button
      className="weather-button"
      onClick={() => void loadWeather()}
      title={
        status === "error"
          ? "Погода недоступна. Нажмите, чтобы повторить загрузку"
          : undefined
      }
      aria-label={
        status === "error" ? "Повторить загрузку погоды" : "Загрузка погоды"
      }
      disabled={status === "loading"}
    >
      <CloudSun size={18} />
      <span>
        {status === "loading" ? "Загрузка погоды…" : "Погода недоступна ↻"}
      </span>
    </button>
  );
}
