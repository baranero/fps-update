/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },

    screens: {
      xs: "450px",
      // => @media (min-width: 450px) { ... }

      sm: "575px",
      // => @media (min-width: 576px) { ... }

      md: "768px",
      // => @media (min-width: 768px) { ... }

      lg: "992px",
      // => @media (min-width: 992px) { ... }

      xl: "1200px",
      // => @media (min-width: 1200px) { ... }

      "2xl": "1400px",
      // => @media (min-width: 1400px) { ... }
    },
    extend: {
      // Skala typografii: xs/sm/base bez zmian (chroni gęsty UI narzędzi),
      // rozmiary od lg w górę lekko zmniejszone — nagłówki i teksty
      // marketingowe były miejscami za duże. [rozmiar, line-height].
      fontSize: {
        lg: ["1.0625rem", "1.65rem"], //   18px → 17px
        xl: ["1.125rem", "1.6rem"], //     20px → 18px
        "2xl": ["1.375rem", "1.85rem"], // 24px → 22px
        "3xl": ["1.6875rem", "2.05rem"], //30px → 27px
        "4xl": ["2rem", "2.3rem"], //      36px → 32px
        "5xl": ["2.625rem", "1.08"], //    48px → 42px
        "6xl": ["3.25rem", "1.05"], //     60px → 52px

        // Skala FDSRun (wzór Stitch): ciasny tracking, responsywne nagłówki
        // przez clamp — bez osobnych breakpointów w komponentach. Prefiks `fr-`
        // trzyma ją z dala od skali witryny usługowej powyżej.
        "fr-hero": ["clamp(36px,6.2vw,76px)", { lineHeight: "1.05", letterSpacing: "-0.055em", fontWeight: "600" }],
        "fr-h1": ["clamp(28px,4.2vw,48px)", { lineHeight: "1.1", letterSpacing: "-0.05em", fontWeight: "600" }],
        "fr-h2": ["clamp(24px,3.2vw,32px)", { lineHeight: "1.2", letterSpacing: "-0.045em", fontWeight: "600" }],
        "fr-h3": ["clamp(20px,2.4vw,24px)", { lineHeight: "1.25", letterSpacing: "-0.035em", fontWeight: "600" }],
        "fr-h4": ["18px", { lineHeight: "1.4", letterSpacing: "-0.02em", fontWeight: "600" }],
        "fr-lead": ["clamp(16px,1.6vw,19px)", { lineHeight: "1.55", letterSpacing: "-0.01em" }],
        "fr-body": ["15px", { lineHeight: "1.6" }],
        "fr-sm": ["13px", { lineHeight: "1.55" }],
        "fr-data": ["13px", { lineHeight: "1", letterSpacing: "-0.01em" }],
        // Etykiety. UWAGA na rozmiar: te tokeny niosą TREŚĆ (kickery, nagłówki
        // kolumn, opisy w stopce), a nie dekorację. Wersaliki + mono + szeroki
        // tracking i tak spowalniają czytanie, więc 9 px było nie do odczytania.
        // Gęste podpisy wewnątrz makiety konsoli mają własne `text-[8px]`/`[9px]`
        // — celowo, bo tam chodzi o wrażenie przyrządu, nie o lekturę.
        "fr-label": ["12px", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "500" }],
        "fr-micro": ["11px", { lineHeight: "1.3", letterSpacing: "0.1em", fontWeight: "500" }],
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        // Nagłówki FDSRun (Manrope). Osobno od `display` (Archivo), żeby zmiana
        // kroju w chmurze nie ruszała witryny usługowej fp-solutions.pl.
        heading: ["var(--font-heading)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        current: "currentColor",
        transparent: "transparent",
        white: "#FFFFFF",
        black: "#121723",
        dark: "#1D2430",
        primary: "#DC3545",
        // Stalowy ton „przepływu/CFD" — sekundarny akcent nowego systemu
        steel: "#2E6E80",
        "steel-light": "#5FA7BC",
        yellow: "#FBB040",
        "body-color": "#788293",
        "body-color-dark": "#959CB1",
        "gray-dark": "#1E232E",
        "gray-light": "#F0F2F9",
        stroke: "#E3E8EF",
        "stroke-dark": "#353943",
        "bg-color-dark": "#171C28",
        // Semantyczne tła dark mode (elewacja) — jedno źródło zamiast
        // rozproszonych wartości hex. bg-surface / bg-surface-card / bg-surface-raised
        surface: {
          DEFAULT: "#0B1120", // tło strony (aplikacja/narzędzia)
          card: "#1E232E",    // karty, wiersze tabel
          raised: "#111827",  // nagłówek, menu, popovery
          drawer: "#141922",  // panele wysuwane
        },

        // ── System FDSRun (fdsrun.com) ──────────────────────────────────────
        // Powierzchnie i tekst sterowane zmiennymi CSS (styles/index.css), więc
        // JEDNA klasa działa w obu motywach — `bg-panel` zamiast
        // `bg-white dark:bg-[#101112]`. Akcenty (primary/signal/warn) zostają
        // markowe: czerwień FDSRun na ciemnej, technicznej bazie.
        canvas: "rgb(var(--fr-canvas) / <alpha-value>)",          // tło strony
        panel: "rgb(var(--fr-panel) / <alpha-value>)",            // karta, panel
        "panel-deep": "rgb(var(--fr-panel-deep) / <alpha-value>)", // panel zagłębiony
        well: "rgb(var(--fr-well) / <alpha-value>)",              // pole wykresu/konsoli
        hairline: "rgb(var(--fr-hairline) / <alpha-value>)",      // linia 1 px
        "hairline-soft": "rgb(var(--fr-hairline-soft) / <alpha-value>)",
        ink: "rgb(var(--fr-ink) / <alpha-value>)",                // tekst główny
        muted: "rgb(var(--fr-muted) / <alpha-value>)",            // tekst drugoplanowy
        faint: "rgb(var(--fr-faint) / <alpha-value>)",            // etykiety, metadane
        signal: "rgb(var(--fr-signal) / <alpha-value>)",          // serie danych, telemetria
        warn: "rgb(var(--fr-warn) / <alpha-value>)",              // ostrzeżenia, anomalie
        ok: "rgb(var(--fr-ok) / <alpha-value>)",                  // powodzenie, opłacone
        lime: "rgb(var(--fr-lime) / <alpha-value>)",              // panel akcentowy
        mint: "#D1EBEB",                                          // panel akcentowy (chłodny)
      },

      // Promienie FDSRun — celowo małe (wzór jest „przyrządowy", nie miękki).
      // Dodane obok domyślnej skali Tailwinda, żeby nie ruszyć fp-solutions.pl.
      borderRadius: {
        chip: "2px",
        tile: "4px",
        panel: "8px",
        card: "12px",
      },

      boxShadow: {
        signUp: "0px 5px 10px rgba(4, 10, 34, 0.2)",
        one: "0px 2px 3px rgba(7, 7, 77, 0.05)",
        two: "0px 5px 10px rgba(6, 8, 15, 0.1)",
        three: "0px 5px 15px rgba(6, 8, 15, 0.05)",
        sticky: "inset 0 -1px 0 0 rgba(0, 0, 0, 0.1)",
        "sticky-dark": "inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)",
        "feature-2": "0px 10px 40px rgba(48, 86, 211, 0.12)",
        submit: "0px 5px 20px rgba(4, 10, 34, 0.1)",
        "submit-dark": "0px 5px 20px rgba(4, 10, 34, 0.1)",
        // Cienie FDSRun — przez zmienne CSS, bo ciężki cień z ciemnego motywu
        // na białym tle wygląda jak brud. Wartości w styles/index.css.
        "fr-panel": "var(--fr-shadow-panel)",
        "fr-float": "var(--fr-shadow-float)",
        btn: "0px 1px 2px rgba(4, 10, 34, 0.15)",
        "btn-hover": "0px 1px 2px rgba(0, 0, 0, 0.15)",
        "btn-light": "0px 1px 2px rgba(0, 0, 0, 0.1)",
      },
      dropShadow: {
        three: "0px 5px 15px rgba(6, 8, 15, 0.05)",
      },
    },
  },
  plugins: [],
};
