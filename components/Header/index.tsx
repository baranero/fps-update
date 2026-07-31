"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import ThemeToggler from "./ThemeToggler";
import menuData from "./menuData";
import { createClient } from "@/lib/supabase/client";
import { cloudHomePath, cloudUrl, resolveIsCloud } from "@/lib/cloud";

const Header = () => {
  const t = useTranslations("nav");
  const tc = useTranslations("cfdNav");
  const tcn = useTranslations("cloudNav");
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openIndex, setOpenIndex] = useState(-1);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  // Marka wg projektu (SITE_MODE) w produkcji; po ścieżce w dev.
  const isCloud = resolveIsCloud(pathname);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY >= 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Zamknij menu konta po kliknięciu poza nim
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Zamknij menu przy zmianie strony
  useEffect(() => {
    setAccountOpen(false);
    setNavbarOpen(false);
  }, [pathname]);

  const handleSubmenu = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setAccountOpen(false);
    setNavbarOpen(false);
    router.push(cloudHomePath());
    router.refresh();
  }

  const regularItems = menuData.filter((m) => !m.highlight);
  const highlightItem = menuData.find((m) => m.highlight);

  return (
    <header
      className={
        // FDSRun: stała, cienka belka na tokenach powierzchni (wzór Stitch).
        // Usługi: dotychczasowe zachowanie z cieniem po przewinięciu.
        isCloud
          ? "sticky left-0 top-0 z-40 flex w-full items-center border-b border-hairline bg-canvas/95 backdrop-blur-md transition-colors duration-300"
          : `sticky top-0 left-0 z-40 flex w-full items-center transition-all duration-300 ${
              scrolled
                ? "bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm"
                : "bg-white dark:bg-[#0B1120] border-b border-transparent"
            }`
      }
    >
      <div className="container">
        <div className="relative -mx-4 flex items-center justify-between">
          {/* Logo — marka zależna od sekcji (chmura = FDSRun, usługi = FP Solutions) */}
          <div className="w-max px-4 xl:mr-16 xl:whitespace-nowrap">
            {isCloud ? (
              <Link href={cloudHomePath()} className="header-logo flex items-center gap-2.5 py-4 lg:py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-tile border border-primary/30 bg-primary/10 text-primary">
                  <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.547 3.75 3.75 0 013.255 3.719z" />
                  </svg>
                </span>
                <span className="font-heading text-fr-h4 font-bold tracking-tight text-ink">
                  FDS<span className="text-primary">Run</span>
                </span>
              </Link>
            ) : (
              <Link href="/" className="header-logo block w-full py-4 lg:py-3">
                <div className="flex flex-col items-center">
                  <Image
                    src="/images/logo/logo.webp"
                    alt="Fire Protection Solutions Logo"
                    width={50}
                    height={30}
                  />
                  <p className="hidden pt-1.5 text-center text-sm font-bold text-slate-900 dark:text-white sm:block">
                    Fire Protection <span className="text-primary">Solutions</span>
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Nav + actions */}
          <div className="flex w-full items-center justify-between px-4">
            <div>
              {/* Hamburger */}
              <button
                onClick={() => setNavbarOpen(!navbarOpen)}
                aria-label="Menu"
                className="absolute right-4 top-1/2 block -translate-y-1/2 rounded-panel px-3 py-[6px] ring-primary focus:ring-2 lg:hidden"
              >
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] transition-all duration-300 ${
                    isCloud ? "bg-ink" : "bg-slate-800 dark:bg-white"
                  } ${navbarOpen ? "top-[7px] rotate-45" : ""}`}
                />
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] transition-all duration-300 ${
                    isCloud ? "bg-ink" : "bg-slate-800 dark:bg-white"
                  } ${navbarOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] transition-all duration-300 ${
                    isCloud ? "bg-ink" : "bg-slate-800 dark:bg-white"
                  } ${navbarOpen ? "top-[-8px] -rotate-45" : ""}`}
                />
              </button>

              {/* Nav menu */}
              <nav
                className={`navbar absolute right-0 z-30 w-[260px] px-6 py-4 shadow-xl duration-300 lg:visible lg:static lg:w-auto lg:border-none lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none dark:lg:bg-transparent ${
                  isCloud
                    ? "rounded-panel border border-hairline bg-panel"
                    : "rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111827]"
                } ${navbarOpen ? "top-full opacity-100 visible" : "top-[120%] opacity-0 invisible"}`}
              >
                <ul className="block lg:flex lg:items-center lg:space-x-6 xl:space-x-10">
                  {/* Menu konsultingu tylko na usługach — na chmurze nagłówek jest slim (FDSRun) */}
                  {!isCloud && regularItems.map((menuItem, index) => (
                    <li key={index} className="group relative">
                      {menuItem.path ? (
                        <Link
                          href={menuItem.path}
                          onClick={() => setNavbarOpen(false)}
                          className={`flex py-2 text-sm font-medium lg:inline-flex lg:px-0 lg:py-5 ${
                            pathname === menuItem.path
                              ? "text-primary"
                              : "text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-white"
                          }`}
                        >
                          {t(menuItem.key ?? "")}
                        </Link>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSubmenu(index)}
                            className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-white lg:inline-flex lg:w-auto lg:px-0 lg:py-5"
                          >
                            {t(menuItem.key ?? "")}
                            <span className="pl-2">
                              <svg width="16" height="16" viewBox="0 0 25 24" className="fill-current">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M6.29289 8.8427C6.68342 8.45217 7.31658 8.45217 7.70711 8.8427L12 13.1356L16.2929 8.8427C16.6834 8.45217 17.3166 8.45217 17.7071 8.8427C18.0976 9.23322 18.0976 9.86639 17.7071 10.2569L12 15.964L6.29289 10.2569C5.90237 9.86639 5.90237 9.23322 6.29289 8.8427Z"
                                />
                              </svg>
                            </span>
                          </button>
                          <div
                            className={`submenu relative left-0 top-full rounded-xl bg-white transition-[top] duration-300 dark:bg-[#111827] lg:invisible lg:absolute lg:top-[110%] lg:block lg:w-[260px] lg:border lg:border-slate-100 lg:p-4 lg:opacity-0 lg:shadow-xl lg:dark:border-slate-800 lg:group-hover:visible lg:group-hover:top-full lg:group-hover:opacity-100 ${
                              openIndex === index ? "block" : "hidden"
                            }`}
                          >
                            {menuItem.submenu?.map((submenuItem, subIndex) => (
                              <Link
                                href={submenuItem.path ?? "/"}
                                key={subIndex}
                                onClick={() => setNavbarOpen(false)}
                                className="block rounded-lg py-2.5 text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white lg:px-3"
                              >
                                {t(submenuItem.key ?? "")}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </li>
                  ))}

                  {/* Nawigacja chmury (FDSRun) — Funkcje / Cennik */}
                  {isCloud && (["/funkcje", "/cennik"] as const).map((href) => (
                    <li key={href} className="group relative">
                      <Link
                        href={href}
                        onClick={() => setNavbarOpen(false)}
                        className={`flex py-2 text-fr-body transition-colors lg:inline-flex lg:px-0 lg:py-6 ${
                          pathname === href
                            ? "font-semibold text-primary lg:border-b-2 lg:border-primary"
                            : "text-muted hover:text-ink"
                        }`}
                      >
                        {href === "/funkcje" ? tcn("features") : tcn("pricing")}
                      </Link>
                    </li>
                  ))}

                  {/* CFD Cloud — CTA (widoczne w menu tylko na mobile) */}
                  {!isCloud && highlightItem && (
                    <li className="group relative lg:hidden">
                      <a
                        href={cloudUrl()}
                        onClick={() => setNavbarOpen(false)}
                        className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        {t(highlightItem.key ?? "")}
                        <span>↗</span>
                      </a>
                    </li>
                  )}

                  {/* Konto — mobile — tylko w chmurze; witryna usług nie ma logowania */}
                  {isCloud && (
                  <li className="mt-3 border-t border-hairline pt-3 lg:hidden">
                    {userEmail ? (
                      <div className="space-y-1">
                        <p className="truncate px-1 pb-1 font-mono text-fr-micro text-faint">
                          {userEmail}
                        </p>
                        <Link
                          href="/symulacje"
                          onClick={() => setNavbarOpen(false)}
                          className="block rounded-tile px-1 py-2 text-fr-body text-muted transition-colors hover:text-ink"
                        >
                          {tc("dashboard")}
                        </Link>
                        <Link
                          href="/symulacje/profil"
                          onClick={() => setNavbarOpen(false)}
                          className="block rounded-tile px-1 py-2 text-fr-body text-muted transition-colors hover:text-ink"
                        >
                          {t("account.myProfile")}
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full rounded-tile px-1 py-2 text-left text-fr-body text-muted transition-colors hover:text-ink"
                        >
                          {t("account.signOut")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Link
                          href="/signin"
                          onClick={() => setNavbarOpen(false)}
                          className="rounded-tile px-1 py-2 text-fr-body text-muted transition-colors hover:text-ink"
                        >
                          {t("account.signIn")}
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setNavbarOpen(false)}
                          className="rounded-panel bg-primary px-4 py-2 text-center text-fr-body font-bold text-white transition-opacity hover:opacity-90"
                        >
                          {t("account.signUp")}
                        </Link>
                      </div>
                    )}
                  </li>
                  )}
                </ul>
              </nav>
            </div>

            {/* Right side: CTA + language + theme + account */}
            <div className="flex items-center justify-end gap-3 pr-16 lg:pr-0">
              {/* CFD Cloud — CTA (desktop, usługi) */}
              {!isCloud && highlightItem && (
                <a
                  href={cloudUrl()}
                  className="hidden items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 lg:inline-flex"
                >
                  {t(highlightItem.key ?? "")}
                  <span>↗</span>
                </a>
              )}

              {/* Uruchom symulację — CTA (desktop, chmura) */}
              {isCloud && (
                <>
                  {/* „Zaloguj" jako osobny przycisk tylko dla niezalogowanych —
                      zalogowany ma te akcje w menu konta po prawej. */}
                  {!userEmail && (
                    <Link
                      href="/signin"
                      className="hidden rounded-panel border border-hairline px-4 py-2 text-fr-body text-muted transition-colors hover:text-ink lg:inline-flex"
                    >
                      {t("account.signIn")}
                    </Link>
                  )}
                  <Link
                    href="/symulacje/nowa"
                    className="hidden rounded-panel bg-primary px-4 py-2 text-fr-body font-bold text-white transition-opacity hover:opacity-90 lg:inline-flex"
                  >
                    {tcn("run")}
                  </Link>
                </>
              )}

              <ThemeToggler />

              {/* Konto — desktop — tylko w chmurze; witryna usług nie ma logowania */}
              {isCloud && (
              <div className="relative hidden lg:block" ref={accountRef}>
                {userEmail ? (
                  <>
                    <button
                      onClick={() => setAccountOpen((o) => !o)}
                      aria-label={t("account.menu")}
                      aria-expanded={accountOpen}
                      title={userEmail}
                      className="flex h-9 w-9 items-center justify-center rounded-tile bg-primary font-heading text-fr-body font-bold uppercase text-white transition-opacity hover:opacity-90"
                    >
                      {userEmail[0]}
                    </button>

                    {accountOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-panel border border-hairline bg-panel p-2 shadow-fr-float">
                        <p className="truncate px-3 pb-2 pt-1 font-mono text-fr-micro text-faint">{userEmail}</p>
                        <Link
                          href="/symulacje"
                          onClick={() => setAccountOpen(false)}
                          className="block rounded-tile px-3 py-2 text-fr-body text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                        >
                          {tc("dashboard")}
                        </Link>
                        <Link
                          href="/symulacje/profil"
                          onClick={() => setAccountOpen(false)}
                          className="block rounded-tile px-3 py-2 text-fr-body text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                        >
                          {t("account.myProfile")}
                        </Link>
                        <div className="my-1 border-t border-hairline-soft" />
                        <button
                          onClick={handleLogout}
                          className="block w-full rounded-tile px-3 py-2 text-left text-fr-body text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                        >
                          {t("account.signOut")}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setAccountOpen((o) => !o)}
                      aria-label={t("account.menu")}
                      aria-expanded={accountOpen}
                      className="flex h-9 w-9 items-center justify-center rounded-tile border border-hairline text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>

                    {accountOpen && (
                      <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-panel border border-hairline bg-panel p-2 shadow-fr-float">
                        <Link
                          href="/signin"
                          onClick={() => setAccountOpen(false)}
                          className="block rounded-tile px-3 py-2 text-fr-body text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                        >
                          {t("account.signIn")}
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setAccountOpen(false)}
                          className="block rounded-tile px-3 py-2 text-fr-body font-semibold text-primary transition-colors hover:bg-primary/10"
                        >
                          {t("account.signUp")}
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
