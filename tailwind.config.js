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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
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
