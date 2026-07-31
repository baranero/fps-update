"use client";

import { ThemeProvider } from "next-themes";
import { SITE_MODE } from "@/lib/cloud";

// Motyw domyślny: CIEMNY (enableSystem=false, więc ustawienie systemu nie
// nadpisuje). Osobny storageKey per projekt — w produkcji domeny i tak mają
// własny localStorage, ale w dev oba serwisy siedzą na localhost i bez tego
// wybór zrobiony na fp-solutions.pl przeciekał na FDSRun.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      enableSystem={false}
      defaultTheme="dark"
      storageKey={SITE_MODE === "cloud" ? "fdsrun-theme" : "fps-theme"}
    >
      {children}
    </ThemeProvider>
  );
}