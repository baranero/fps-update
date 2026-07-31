"use client";

import { useEffect, useState } from "react";

// Wspólny motyw wykresów chmury. Recharts przyjmuje wyłącznie konkretne
// kolory (nie klasy), więc wartości tokenów powierzchni trzymamy tu w jednym
// miejscu — używa ich zarówno pełny panel `LiveCharts`, jak i kompaktowy
// wykres w konsoli zlecenia.

// Paleta serii — ZWALIDOWANA skryptem `dataviz` (pasmo luminancji, próg
// chromy, rozdzielczość przy daltonizmie na WSZYSTKICH parach, kontrast).
// Motyw ciemny ma własny krok fioletu: #6D28D9 nie wyrabia 3:1 na #070708.
// Pięć slotów to maksimum, przy którym układ przechodzi kontrolę wszystkich
// par — szósta i dalsze serie dostają kodowanie złożone (neutralny kolor
// + wzór kreskowania), zamiast cyklicznie powtarzać hue.
export const SERIES_LIGHT = ["#DC3545", "#0284A8", "#B8860B", "#15803D", "#6D28D9"];
export const SERIES_DARK = ["#DC3545", "#0284A8", "#B8860B", "#15803D", "#8B5CF6"];
export const OVERFLOW_DASH = ["6 3", "2 3", "8 3 2 3", "4 2"];

export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Odpowiedniki tokenów --fr-muted / --fr-hairline / --fr-panel.
export function chartTheme(dark: boolean) {
  return {
    ramp: dark ? SERIES_DARK : SERIES_LIGHT,
    axis: dark ? "#9A9DA3" : "#5C636E",
    grid: dark ? "#232426" : "#E0E3E9",
    tooltip: {
      backgroundColor: dark ? "#101112" : "#FFFFFF",
      border: `1px solid ${dark ? "#232426" : "#E0E3E9"}`,
      borderRadius: 8,
      fontSize: 12,
    },
  };
}

export function fmtT(t: number): string {
  return t >= 100 ? `${Math.round(t)}` : t.toFixed(1);
}

export function fmtVal(v: number | string | Array<number | string>): string {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}
