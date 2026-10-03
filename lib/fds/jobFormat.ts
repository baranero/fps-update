// ─── Liczby i czasy na karcie zlecenia ───────────────────────────────────────
//
// Wydzielone ze strony zlecenia razem z lib/fds/jobLog.ts. Czyste funkcje
// formatujące: żadnego React, żadnego DOM, żadnego env — dzięki temu mają
// testy, a karta zlecenia i przyszłe widoki (raport, e-mail) liczą tak samo.
//
// Jednostki zostają po angielsku/międzynarodowo (s, min, h, KB, MB, GB) —
// są takie same w obu wersjach językowych serwisu. Jedyny wyjątek to skrót
// tysięcy, który podajemy z zewnątrz (`thousands`), bo PL i EN różnią się.

import { GB } from "@/lib/fds/download-limits";

/** Liczba komórek skrócona do odczytu: „2,10 M", „840 tys.". */
export function formatCells(n: number, thousands: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} ${thousands}`;
  return String(n);
}

/**
 * Czas trwania między dwoma znacznikami.
 *
 * `to` jest opcjonalne: dla zlecenia W TOKU liczymy do teraz, dla zakończonego
 * — do znacznika zakończenia. Bez tego czas ukończonej symulacji rósł
 * w nieskończoność przy każdym renderze.
 */
export function elapsed(from: string | null, to?: string | null, now: number = Date.now()): string {
  if (!from) return "—";
  const end = to ? new Date(to).getTime() : now;
  const s = Math.max(0, Math.floor((end - new Date(from).getTime()) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
}

export function fileIcon(name: string): string {
  if (name.endsWith(".smv")) return "📊";
  if (name.endsWith(".csv")) return "📄";
  if (name.endsWith(".log")) return "📋";
  return "📁";
}

/** Klucz tłumaczenia opisu typu pliku wynikowego. */
export function fileTypeKey(name: string): string {
  if (name.endsWith(".smv"))  return "smv";
  if (name.endsWith(".csv"))  return "csv";
  if (name.endsWith(".log"))  return "log";
  if (name.endsWith(".s3d"))  return "s3d";
  if (name.endsWith(".q"))    return "q";
  if (name.endsWith(".sf"))   return "sf";
  if (name.endsWith(".bf"))   return "bf";
  if (name.endsWith(".prt5")) return "prt5";
  if (name.endsWith(".fds"))  return "fds";
  return "other";
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Łączny rozmiar paczki wyników.
 *
 * Magazyn potrafi nie podać rozmiaru części plików — wtedy suma jest niepełna
 * i oznaczamy ją tyldą („co najmniej tyle"), zamiast zaniżać liczbę bez słowa.
 */
export function totalSize(
  files: Array<{ size: number | null }>
): { bytes: number; label: string; partial: boolean } | null {
  if (files.length === 0) return null;
  const known = files.filter((f) => f.size !== null);
  if (known.length === 0) return null;
  const bytes = known.reduce((sum, f) => sum + (f.size as number), 0);
  const partial = known.length < files.length;
  return { bytes, label: `${partial ? "~" : ""}${formatSize(bytes)}`, partial };
}

/** Etykieta rozmiaru paczki w wyborze — okrągła („2 GB"), nie „2,00 GB". */
export function packageLabel(bytes: number): string {
  return bytes >= GB ? `${bytes / GB} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Krok czasowy solvera — sekundy przy dużych wartościach, milisekundy przy małych. */
export function formatDt(s: number | null): string {
  if (s === null) return "—";
  if (s >= 1)    return `${s.toFixed(3)} s`;
  if (s >= 0.01) return `${(s * 1000).toFixed(1)} ms`;
  return `${(s * 1000).toFixed(2)} ms`;
}

export function formatDuration(sec: number): string {
  if (sec < 60)   return `${Math.round(sec)} s`;
  if (sec < 3600) return `${Math.ceil(sec / 60)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

/**
 * Ile jeszcze zostało: tempo dotychczasowej pracy przeniesione na resztę.
 *
 * Poniżej 1% tempo jest jeszcze przypadkowe (rozruch maszyny, alokacja
 * pamięci), więc wtedy nie zgadujemy — lepiej „—" niż prognoza z sufitu.
 */
export function remainingSec(pct: number | null, elapsedSec: number | null): number | null {
  if (pct === null || elapsedSec === null || pct <= 1) return null;
  return Math.max(0, Math.round((elapsedSec / pct) * (100 - pct)));
}

/** Czas rozbity na liczbę i jednostkę — szyna konsoli składa je osobno. */
export function splitDuration(sec: number): { value: string; unit: string } {
  if (sec < 60)   return { value: String(Math.round(sec)), unit: "s" };
  if (sec < 3600) return { value: String(Math.ceil(sec / 60)), unit: "min" };
  return { value: (sec / 3600).toFixed(1), unit: "h" };
}
