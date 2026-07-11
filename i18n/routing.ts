import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pl", "en"],
  defaultLocale: "pl",
  // pl bez prefiksu (/), en z prefiksem (/en/...)
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
