import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SITE_MODE } from "./lib/cloud";

const intlMiddleware = createIntlMiddleware(routing);

// Jedno repo, DWA projekty Vercel rozróżniane przez build-time SITE_MODE:
//   • marketing (fp-solutions.pl) — witryna usług ppoż. + kalkulatory,
//   • cloud     (fdsrun.com)      — serwis chmurowy FDSRun (konto, symulacje).
// Middleware przekierowuje 301 treść „obcą" danemu projektowi, żeby te same
// strony nie indeksowały się dwa razy. Dev/preview (SITE_MODE=null) → bez reguł.
const MARKETING_HOST = "fp-solutions.pl";
const CLOUD_HOST = "fdsrun.com";

// Ścieżki należące do serwisu chmurowego (fdsrun.com). „rest" jest bez prefiksu
// języka. Root ("/") NIE jest tu — na chmurze obsługiwany osobno (rewrite na landing).
function isCloudPath(rest: string): boolean {
  const cloud = ["/chmura", "/symulacje", "/signin", "/signup", "/auth"];
  const account = ["/narzedzia/admin", "/narzedzia/profil", "/narzedzia/raporty"];
  return [...cloud, ...account].some((p) => rest === p || rest.startsWith(p + "/"));
}

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
    if (rest !== "/" && !isCloudPath(rest)) {
      return redirectToHost(MARKETING_HOST); // treść usług → fp-solutions.pl
    }
    // else: „/" (landing) lub ścieżka chmury → serwuj (auth niżej).
  } else if (SITE_MODE === "marketing") {
    // Ten projekt = usługi (fp-solutions.pl). Treść chmury → fdsrun.com.
    if (isCloudPath(rest)) {
      return redirectToHost(CLOUD_HOST, rest === "/chmura" ? prefix || "/" : undefined);
    }
    // else: ścieżka usługowa → serwuj.
  }

  // Publiczny „zakątek dla projektanta" i witryna produktu (chmura CFD):
  //  • kalkulatory + strona narzędzi liczą bez logowania (magnes na leady, SEO),
  //  • landing chmury i kreator pokazują ofertę anonimowi — bramka jest dopiero
  //    na akcji „Uruchom" (isSimAllowed po stronie serwera), nie na wejściu.
  const isToolsPublic =
    rest === "/narzedzia" ||
    rest === "/narzedzia/kalkulatory" ||
    rest.startsWith("/narzedzia/kalkulatory/");
  const isCloudPublic = rest === "/symulacje" || rest === "/symulacje/nowa";

  // Za loginem zostają tylko dane konta i akcje na koncie: raporty, profil, admin
  // oraz historia/rozliczenia/statystyki i szczegół zlecenia (/symulacje/<caseId>).
  const isProtected =
    (rest.startsWith("/narzedzia") && !isToolsPublic) ||
    (rest.startsWith("/symulacje") && !isCloudPublic);
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
