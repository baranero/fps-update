const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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
};

module.exports = withNextIntl(nextConfig);
