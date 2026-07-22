"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SymulacjeLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("cfdNav");
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setReady(true);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  const active = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const tabs: { name: string; href: string; exact: boolean; cta?: boolean; icon: React.ReactNode }[] = [
    {
      name: t("dashboard"),
      href: "/symulacje",
      exact: true,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      ),
    },
    {
      name: t("new"),
      href: "/symulacje/nowa",
      exact: false,
      cta: true,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      ),
    },
    {
      name: t("history"),
      href: "/symulacje/historia",
      exact: false,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      name: t("billing"),
      href: "/symulacje/rozliczenia",
      exact: false,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      ),
    },
    {
      name: t("stats"),
      href: "/symulacje/statystyki",
      exact: false,
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
    },
  ];

  // Pasek roboczy tylko dla zalogowanych — anonimowy gość widzi czysty landing.
  const showBar = ready && !!userEmail;

  // Do czasu wdrożenia płatności uruchamianie symulacji ma wyłącznie admin —
  // obcym chowamy wejście „Nowa symulacja" (CTA), reszta zakładek jest tylko do odczytu.
  const isAdminUser = userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const visibleTabs = tabs.filter((tab) => !tab.cta || isAdminUser);

  return (
    <>
      {showBar && (
        <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1120]">
          <div className="container">
            <div className="flex items-center justify-between gap-4 py-2.5">

              {/* Marka + zakładki */}
              <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
                <Link href="/symulacje" className="hidden shrink-0 items-center gap-1.5 pr-1 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{t("brand")}</span>
                </Link>
                <nav className="flex items-center gap-1">
                  {visibleTabs.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        active(tab.href, tab.exact)
                          ? "bg-primary text-white"
                          : tab.cta
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {tab.icon}
                      </svg>
                      <span className="whitespace-nowrap">{tab.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Cross-link do Narzędzi + konto */}
              <div className="hidden shrink-0 items-center gap-3 md:flex">
                <Link
                  href="/narzedzia"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t("toTools")}
                </Link>
                <span className="text-slate-200 dark:text-slate-700">·</span>
                <Link
                  href="/narzedzia/profil"
                  className="max-w-[180px] truncate text-xs font-medium text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                  title={userEmail ?? undefined}
                >
                  {userEmail}
                </Link>
                <span className="text-slate-200 dark:text-slate-700">·</span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                >
                  {t("signOut")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
