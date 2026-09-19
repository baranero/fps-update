import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy obejmują warstwę czystej logiki: cennik, planer maszyn, przydział MPI,
// obliczenia CNBOP i limit żądań. To moduły izomorficzne — bez dostępu do bazy,
// sieci i env — więc nie wymagają ani środowiska przeglądarki, ani atrap.
//
// Alias "@/" ustawiamy wprost zamiast wtyczką czytającą tsconfig: ta jest
// ESM-only i nie ładuje się w konfiguracji wczytywanej przez require.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "out/**"],
  },
});
