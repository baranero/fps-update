import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Dwie domeny na jednym projekcie:
//   • MARKETING_HOST (fp-solutions.pl) — witryna usług konsultingowych,
//   • CLOUD_HOST     (fdsrun.com)      — serwis chmurowy FDSRun (konto, symulacje).
// Routing po hoście kieruje treść tam, gdzie jej miejsce, i przekierowuje 301
// treści „obce" domenie, żeby te same strony nie indeksowały się dwa razy.
// Uwaga: reguły działają WYŁĄCZNIE na tych dwóch hostach — podglądy *.vercel.app
// i localhost przechodzą bez zmian, więc dev i preview są nietknięte.
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

  // 3. Routing po hoście (tylko na realnych domenach produkcyjnych)
  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const isCloudHost = hostname === CLOUD_HOST || hostname === `www.${CLOUD_HOST}`;
  const isMarketingHost = hostname === MARKETING_HOST || hostname === `www.${MARKETING_HOST}`;

  const redirectToHost = (host: string, pathnameOverride?: string) => {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = host;
    url.port = "";
    if (pathnameOverride !== undefined) url.pathname = pathnameOverride;
    return NextResponse.redirect(url, 301);
  };

  if (isCloudHost) {
    // Root chmury → landing FDSRun pod /chmura (301, nie rewrite): dzięki temu
    // ścieżka w pasku to /chmura, więc nagłówek rozpoznaje markę po ścieżce
    // (bez migotania) — patrz components/Header.
    if (rest === "/") {
      return redirectToHost(CLOUD_HOST, `${prefix}/chmura`);
    }
    // Treść usługowa na domenie chmury → 301 na fp-solutions.pl (bez duplikatów).
    if (!isCloudPath(rest)) {
      return redirectToHost(MARKETING_HOST);
    }
    // else: ścieżka chmury (w tym /chmura) na domenie chmury → serwuj (auth niżej).
  } else if (isMarketingHost) {
    // Treść chmury na domenie usług → 301 na fdsrun.com (ścieżka w ścieżkę).
    if (isCloudPath(rest)) {
      return redirectToHost(CLOUD_HOST);
    }
    // else: ścieżka usługowa na domenie usług → serwuj.
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
