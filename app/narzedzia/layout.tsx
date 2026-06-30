"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  const active = (href: string, exact = false) =>
    href === "#" ? false : exact ? pathname === href : pathname.startsWith(href);

  return (
    <section className="bg-gray-50 dark:bg-[#0B1120] relative z-10 pb-24 pt-6 min-h-screen">
      <div className="container">

        {/* Mobile nav */}
        <div className="lg:hidden mb-4 overflow-x-auto">
          <div className="flex gap-1.5 pb-1">
            {[
              { name: "Narzędzia", href: "/narzedzia", exact: true },
              { name: "Symulacje FDS", href: "/narzedzia/symulacje", exact: false },
              { name: "CNBOP", href: "/narzedzia/kalkulatory/cnbop", exact: false },
              { name: "Klatki PN-B", href: "/narzedzia/kalkulatory/oddymianie-klatek-pn", exact: false },
              { name: "Szybki Aᴄz", href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne", exact: false },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active(link.href, link.exact)
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.name}
              </Link>
            ))}
            {userEmail ? (
              <button
                onClick={handleLogout}
                className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap"
              >
                Wyloguj
              </button>
            ) : (
              <Link
                href="/signin"
                className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-primary text-white whitespace-nowrap"
              >
                Zaloguj się
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-52 shrink-0 sticky top-[88px] gap-5">

            {/* Top link */}
            <Link
              href="/narzedzia"
              className={`text-sm font-semibold transition-colors ${
                active("/narzedzia", true)
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Narzędzia
            </Link>

            {/* Nav */}
            <nav className="flex flex-col gap-5">

              {/* Symulacje — wyróżnione */}
              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Symulacje CFD
                </p>
                <Link
                  href="/narzedzia/symulacje"
                  className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                    active("/narzedzia/symulacje")
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                    <span>Obliczenia FDS</span>
                  </div>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/20 text-primary">
                    Nowe
                  </span>
                </Link>
              </div>

              {/* Kalkulatory */}
              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Kalkulatory
                </p>
                <div className="flex flex-col gap-0.5">
                  {[
                    {
                      name: "CNBOP W-0003:2016",
                      href: "/narzedzia/kalkulatory/cnbop",
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      ),
                    },
                    {
                      name: "Klatki schodowe PN-B",
                      href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      ),
                    },
                    {
                      name: "Szybki dobór Aᴄz",
                      href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      ),
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
                        active(item.href)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon}
                      </svg>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

            </nav>

            {/* Użytkownik */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              {userEmail ? (
                <>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mb-2" title={userEmail}>
                    {userEmail}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    Wyloguj się
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/signin" className="text-[11px] font-medium text-primary hover:underline">
                    Zaloguj się
                  </Link>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <Link href="/signup" className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors">
                    Zarejestruj się
                  </Link>
                </div>
              )}
            </div>

            {/* Kontakt */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1.5">
              <a
                href="mailto:biuro@fp-solutions.pl"
                className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
              >
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                biuro@fp-solutions.pl
              </a>
              <a
                href="tel:+48790782993"
                className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors"
              >
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +48 790 782 993
              </a>
            </div>

          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            {children}
          </main>

        </div>
      </div>
    </section>
  );
}
