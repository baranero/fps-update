"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
  {
    items: [
      {
        name: "Panel główny",
        href: "/narzedzia",
        exact: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Kalkulatory",
    items: [
      {
        name: "Wszystkie narzędzia",
        href: "/narzedzia/kalkulatory",
        exact: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        ),
      },
      {
        name: "CNBOP W-0003:2016",
        href: "/narzedzia/kalkulatory/cnbop",
        exact: false,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        badge: "Wizard",
      },
      {
        name: "Klatki schodowe PN-B",
        href: "/narzedzia/kalkulatory/oddymianie-klatek-pn",
        exact: false,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        name: "Oddymianie — szybki",
        href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne",
        exact: false,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Wkrótce",
    soon: true,
    items: [
      {
        name: "Gęstość obc. ogniowego",
        href: "#",
        exact: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
        ),
      },
      {
        name: "Sprzęt gaśniczy",
        href: "#",
        exact: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: "Wentylacja pożarowa",
        href: "#",
        exact: true,
        icon: (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        ),
      },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (href === "#") return false;
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <section className="bg-slate-50 dark:bg-[#0B1120] relative z-10 pb-24 pt-6 min-h-screen">
      <div className="container">

        {/* Mobile nav */}
        <div className="lg:hidden mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {[
              { name: "Panel", href: "/narzedzia", exact: true },
              { name: "Kalkulatory", href: "/narzedzia/kalkulatory", exact: false },
              { name: "CNBOP", href: "/narzedzia/kalkulatory/cnbop", exact: false },
              { name: "Klatki PN-B", href: "/narzedzia/kalkulatory/oddymianie-klatek-pn", exact: false },
              { name: "Szybki", href: "/narzedzia/kalkulatory/oddymianie-grawitacyjne", exact: false },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive(link.href, link.exact)
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 sticky top-[88px] gap-3">

            {/* Brand */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] px-5 py-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">FP Tools</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Panel projektanta PPOŻ</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-3 flex flex-col gap-0.5">
              {navGroups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? "mt-2" : ""}>
                  {group.label && (
                    <p className={`px-3 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-widest ${
                      group.soon ? "text-slate-300 dark:text-slate-700" : "text-slate-400 dark:text-slate-500"
                    }`}>
                      {group.label}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const active = isActive(item.href, item.exact);
                    const disabled = item.href === "#";
                    return (
                      <Link
                        key={item.href + item.name}
                        href={item.href}
                        aria-disabled={disabled}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                          disabled
                            ? "pointer-events-none text-slate-300 dark:text-slate-700"
                            : active
                            ? "bg-primary text-white font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {item.icon}
                        <span className="truncate">{item.name}</span>
                        {"badge" in item && item.badge && !disabled && (
                          <span className={`ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {disabled && (
                          <span className="ml-auto shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 dark:text-slate-700">
                            wkrótce
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  {gi < navGroups.length - 1 && group.label && (
                    <div className="mt-2 border-t border-slate-100 dark:border-slate-800" />
                  )}
                </div>
              ))}
            </nav>

            {/* CTA */}
            <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-4">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">Symulacja CFD</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                Potrzebujesz weryfikacji skuteczności systemu lub optymalizacji projektu?
              </p>
              <div className="flex flex-col gap-1.5 mb-3">
                <a
                  href="tel:+48790782993"
                  className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
                >
                  <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +48 790 782 993
                </a>
                <a
                  href="mailto:biuro@fp-solutions.pl"
                  className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
                >
                  <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  biuro@fp-solutions.pl
                </a>
              </div>
              <a
                href="mailto:biuro@fp-solutions.pl"
                className="block w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold text-center py-2 transition-colors"
              >
                Zapytaj o wycenę
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
