import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SITE_MODE, isCloudPath, legacyTarget } from "./lib/cloud";

const intlMiddleware = createIntlMiddleware(routing);

// Jedno repo, DWA projekty Vercel rozróżniane przez build-time SITE_MODE:
//   • marketing (fp-solutions.pl) — witryna usług ppoż. + kalkulatory,
//   • cloud     (fdsrun.com)      — serwis chmurowy FDSRun (konto, symulacje).
// Middleware przekierowuje 301 treść „obcą" danemu projektowi, żeby te same
// strony nie indeksowały się dwa razy. Dev/preview (SITE_MODE=null) → bez reguł.
const MARKETING_HOST = "fp-solutions.pl";
const CLOUD_HOST = "fdsrun.com";

// Dokumenty prawne: po polsku mieszkają na witrynie usługowej, po angielsku
// (kurtuazyjne tłumaczenie dla klienta chmury) — na fdsrun.com/en/*.
const LEGAL_PATHS = ["/regulamin", "/polityka-prywatnosci", "/polityka-cookies"];

export async function middleware(request: NextRequest) {
  // 1. next-intl: ustalenie języka + ewentualny rewrite/redirect segmentu [locale]
  const response = intlMiddleware(request);

  // 2. Ścieżka bez prefiksu języka (np. /en/narzedzia → /narzedzia)
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  let locale: string = routing.defaultLocale;
  let rest = pathname;
  if (routing.locales.includes(segments[1] as (typeof routing.locales)[number])) {
    locale = segments[1];
    rest = "/" + segments.slice(2).join("/");
  }
  if (rest === "") rest = "/";
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  // 2a. Stare adresy konta pod /narzedzia/* — 301 na ich dzisiejsze miejsce
  //     w chmurze. Mapa mieszka w jednym pliku (lib/cloud.ts → legacyTarget),
  //     a nie w sześciu komponentach klienckich robiących `router.replace`.
  //     Strony pod tymi adresami zostają jako zapas (lib/legacyRedirect.ts),
  //     ale w normalnym biegu żądanie kończy się tutaj.
  const legacy = legacyTarget(rest);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}${legacy}`;
    if (SITE_MODE === "marketing") {
      url.protocol = "https";
      url.host = CLOUD_HOST;
      url.port = "";
    }
    return NextResponse.redirect(url, 301);
  }

  // 3. Rozdział projektów wg SITE_MODE (build-time). Dev/preview → bez reguł.
  const redirectToHost = (host: string, pathnameOverride?: string) => {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = host;
    url.port = "";
    if (pathnameOverride !== undefined) url.pathname = pathnameOverride;
    return NextResponse.redirect(url, 301);
  };

  if (SITE_MODE === "cloud") {
    // Ten projekt = chmura (fdsrun.com). Root „/" JEST landingiem.
    if (rest === "/chmura") {
      return redirectToHost(CLOUD_HOST, prefix || "/"); // /chmura → czysty root
    }
    // Dokumenty prawne po angielsku serwuje chmura (/en/regulamin itd.), bo
    // fp-solutions.pl jest wyłącznie polska i nie ma dokąd tam odesłać klienta
    // EN. Polska wersja zostaje na witrynie usługowej — jeden dokument, jeden
    // adres kanoniczny w danym języku.
    const isEnglishLegal = locale === "en" && LEGAL_PATHS.includes(rest);
    if (rest !== "/" && !isCloudPath(rest) && !isEnglishLegal) {
      // Bez prefiksu języka: witryna usługowa nie ma wersji EN, więc /en/cfd
      // musi wylądować na /cfd, a nie na nieistniejącym fp-solutions.pl/en/cfd.
      return redirectToHost(MARKETING_HOST, rest);
    }
    // else: „/" (landing), ścieżka chmury lub prawne EN → serwuj (auth niżej).
  } else if (SITE_MODE === "marketing") {
    // Ten projekt = usługi (fp-solutions.pl). Treść chmury → fdsrun.com.
    if (isCloudPath(rest)) {
      return redirectToHost(CLOUD_HOST, rest === "/chmura" ? prefix || "/" : undefined);
    }
    // Witryna usługowa jest polska — adresy /en/* nie mają tu wersji językowej
    // i renderowałyby polską treść pod angielskim URL-em (duplikat dla robota).
    if (locale === "en") {
      return redirectToHost(MARKETING_HOST, rest);
    }
    // else: ścieżka usługowa → serwuj.
  }

  // Publiczny „zakątek dla projektanta" i witryna produktu (chmura CFD):
  //  • kalkulatory + strona narzędzi liczą bez logowania (magnes na leady, SEO),
  //  • landing chmury i kreator pokazują ofertę anonimowi — bramka jest dopiero
  //    na akcji „Uruchom" i stoi po stronie serwera (`currentAccess()`
  //    w /api/symulacje/submit), nie na wejściu na stronę.
  //
  // Cała przestrzeń /narzedzia jest publiczna: zostały tam wyłącznie kalkulatory,
  // a stare adresy konta odchodzą 301 wyżej (punkt 2a).
  // Właściwe strony konta (/symulacje/profil, /raporty, /admin) chroni reguła niżej.
  const isCloudPublic = rest === "/symulacje" || rest === "/symulacje/nowa";

  // Za loginem zostaje konto i akcje na nim: profil, raporty, admin, historia,
  // rozliczenia, statystyki oraz szczegół zlecenia (/symulacje/<caseId>).
  const isProtected = rest.startsWith("/symulacje") && !isCloudPublic;
  const isAuthPage = rest === "/signin" || rest === "/signup";

  // 4. Supabase odpytujemy tylko tam, gdzie sesja decyduje o dostępie —
  //    nie na każdej publicznej podstronie (oszczędza round-trip do Supabase).
  if (!isProtected && !isAuthPage) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Ochrona tras narzędzi i chmury
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/signin`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Zalogowany na stronie logowania/rejestracji → pulpit chmury
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/symulacje`;
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Pomijamy API, zasoby Next i pliki statyczne
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
