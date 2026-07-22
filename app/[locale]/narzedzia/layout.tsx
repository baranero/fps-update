"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("tools");
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
    <section className="bg-slate-50 dark:bg-[#0B1120] relative z-10 pb-24 pt-6 min-h-screen">
      <div className="container">

        {/* Mobile nav */}
        <div className="lg:hidden mb-4 overflow-x-auto">
          <div className="flex gap-1.5 pb-1">
            {[
              { name: t("mobile.tools"), href: "/narzedzia", exact: true },
              { name: t("mobile.cnbop"), href: "/narzedzia/kalkulatory/cnbop", exact: false },
              { name: t("mobile.pn"), href: "/narzedzia/kalkulatory/oddymianie-klatek-pn", exact: false },
              { name: t("mobile.quick"), href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne", exact: false },
              { name: t("mobile.reports"), href: "/narzedzia/raporty", exact: false },
              { name: t("cfdCloud"), href: "/symulacje", exact: false },
              ...(userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL
                ? [{ name: t("mobile.admin"), href: "/narzedzia/admin", exact: false }]
                : []),
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
                {t("signOut")}
              </button>
            ) : (
              <Link
                href="/signin"
                className="shrink-0 rounded px-3 py-1.5 text-xs font-medium bg-primary text-white whitespace-nowrap"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-52 shrink-0 sticky top-[88px] gap-5">

            {/* Użytkownik — góra */}
            {userEmail ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-3">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-white uppercase leading-none">
                    {userEmail[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{userEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Link
                      href="/narzedzia/profil"
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      {t("profile")}
                    </Link>
                    <span className="text-slate-200 dark:text-slate-700">·</span>
                    <button
                      onClick={handleLogout}
                      className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                    >
                      {t("signOut")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E232E] px-3 py-2.5">
                <Link href="/signin" className="text-xs font-semibold text-primary hover:underline">
                  {t("signIn")}
                </Link>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <Link href="/signup" className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors">
                  {t("signUp")}
                </Link>
              </div>
            )}

            {/* Top link */}
            <Link
              href="/narzedzia"
              className={`text-sm font-semibold transition-colors ${
                active("/narzedzia", true)
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {t("title")}
            </Link>

            {/* Przejście do obszaru symulacji (CFD Cloud) */}
            <Link
              href="/symulacje"
              className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5.002 5.002 0 007.1 7.1 4 4 0 003 11m9 0v6m0-6l-2.5 2.5M12 11l2.5 2.5" />
              </svg>
              <span className="truncate">{t("cfdCloud")}</span>
            </Link>

            {/* Nav */}
            <nav className="flex flex-col gap-5">

              {/* Kalkulatory */}
              <div>
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("sections.calculators")}
                </p>
                <div className="flex flex-col gap-0.5">
                  {[
                    {
                      name: t("calc.cnbop"),
                      href: "/narzedzia/kalkulatory/cnbop",
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      ),
                    },
                    {
                      name: t("calc.pn"),
                      href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
                      icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      ),
                    },
                    {
                      name: t("calc.quick"),
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

              {/* Admin */}
              {userEmail && userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary/60">
                    {t("sections.admin")}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href="/narzedzia/admin"
                      className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
                        active("/narzedzia/admin")
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{t("adminPanel")}</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Konto */}
              {userEmail && (
                <div>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("sections.account")}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href="/narzedzia/raporty"
                      className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors ${
                        active("/narzedzia/raporty")
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate">{t("reportsHistory")}</span>
                    </Link>
                  </div>
                </div>
              )}

            </nav>

            {/* Kontakt */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-1.5">
              <a
                href="mailto:biuro@fp-solutions.pl"
                className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                biuro@fp-solutions.pl
              </a>
              <a
                href="tel:+48790782993"
                className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
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
