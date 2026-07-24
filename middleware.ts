import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

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

  // 3. Supabase odpytujemy tylko tam, gdzie sesja decyduje o dostępie —
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

  // Zalogowany na stronie logowania/rejestracji → panel
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/narzedzia`;
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Pomijamy API, zasoby Next i pliki statyczne
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
