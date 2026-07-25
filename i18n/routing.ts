import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Wyłącznie polski — profesjonalne oprogramowanie ppoż. na rynek PL nie ma
  // wersji angielskiej. next-intl zostaje jako warstwa tłumaczeń (messages/pl.json).
  locales: ["pl"],
  defaultLocale: "pl",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
