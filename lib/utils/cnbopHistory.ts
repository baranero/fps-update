import {
  Step1Data, Step2aData, Step2Data, Step4Data, CFDConditions, AeHelperState,
} from "@/lib/calculations/cnbop";

const KEY = "cnbop-history";
const MAX = 8;

export interface HistoryEntry {
  id: string;
  date: string;
  label: string;
  step1Data: Step1Data;
  step2aData: Step2aData;
  step2Data: Step2Data;
  step4Data: Step4Data;
  cfDCond: CFDConditions;
  aeHelper: AeHelperState;
}

export type HistorySnapshot = Omit<HistoryEntry, "id" | "date">;

export function saveHistory(snapshot: HistorySnapshot): void {
  try {
    const existing = loadHistory();
    const entry: HistoryEntry = {
      ...snapshot,
      id: Date.now().toString(),
      date: new Date().toLocaleString("pl-PL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
    };
    const updated = [entry, ...existing].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY); } catch {}
}

export function buildShareUrl(snapshot: HistorySnapshot): string {
  const json = JSON.stringify(snapshot);
  const encoded = btoa(encodeURIComponent(json));
  return `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(encoded)}`;
}

export function parseShareParam(s: string): HistorySnapshot | null {
  try {
    const json = decodeURIComponent(atob(s));
    return JSON.parse(json) as HistorySnapshot;
  } catch {
    return null;
  }
}
