const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Nagłówki bezpieczeństwa dla KAŻDEJ odpowiedzi. Bez nich przeglądarka
// zgaduje typ treści, pozwala osadzić serwis w cudzej ramce (clickjacking)
// i po pierwszej wizycie wraca po HTTP. CSP ogranicza się do tego, co nie
// może zepsuć działającej strony: zakaz ramek, obcych <base> i wtyczek.
// Pełna polityka skryptów wymaga nonce'ów w Next i osobnego wdrożenia.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // `domains` zniknęło w Next 15 — cała lista dozwolonych źródeł opisana
    // teraz wzorcami. localhost zostaje na potrzeby pracy lokalnej.
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // W Next 15 opcja wyszła z `experimental` pod własną nazwą. Trzyma klienty
  // Supabase poza bundlem serwerowym — pakują własne natywne zależności.
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

module.exports = withNextIntl(nextConfig);
