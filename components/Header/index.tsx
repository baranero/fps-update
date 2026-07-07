"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggler from "./ThemeToggler";
import menuData from "./menuData";

const Header = () => {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openIndex, setOpenIndex] = useState(-1);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY >= 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmenu = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const regularItems = menuData.filter((m) => !m.highlight);
  const highlightItem = menuData.find((m) => m.highlight);

  return (
    <header
      className={`sticky top-0 left-0 z-40 flex w-full items-center transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm"
          : "bg-white dark:bg-[#0B1120] border-b border-transparent"
      }`}
    >
      <div className="container">
        <div className="relative -mx-4 flex items-center justify-between">
          {/* Logo */}
          <div className="w-max px-4 xl:mr-16 xl:whitespace-nowrap">
            <Link
              href="/"
              className="header-logo block w-full py-4 lg:py-3"
            >
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
          </div>

          {/* Nav + actions */}
          <div className="flex w-full items-center justify-between px-4">
            <div>
              {/* Hamburger */}
              <button
                onClick={() => setNavbarOpen(!navbarOpen)}
                aria-label="Mobile Menu"
                className="absolute right-4 top-1/2 block -translate-y-1/2 rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden"
              >
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] bg-slate-800 transition-all duration-300 dark:bg-white ${
                    navbarOpen ? "top-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] bg-slate-800 transition-all duration-300 dark:bg-white ${
                    navbarOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`relative my-1.5 block h-0.5 w-[30px] bg-slate-800 transition-all duration-300 dark:bg-white ${
                    navbarOpen ? "top-[-8px] -rotate-45" : ""
                  }`}
                />
              </button>

              {/* Nav menu */}
              <nav
                className={`navbar absolute right-0 z-30 w-[260px] rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xl duration-300 dark:border-slate-700 dark:bg-[#111827] lg:visible lg:static lg:w-auto lg:border-none lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none dark:lg:bg-transparent ${
                  navbarOpen ? "top-full opacity-100 visible" : "top-[120%] opacity-0 invisible"
                }`}
              >
                <ul className="block lg:flex lg:items-center lg:space-x-6 xl:space-x-10">
                  {regularItems.map((menuItem, index) => (
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
                          {menuItem.title}
                        </Link>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSubmenu(index)}
                            className="flex w-full cursor-pointer items-center justify-between py-2 text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-white lg:inline-flex lg:w-auto lg:px-0 lg:py-5"
                          >
                            {menuItem.title}
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
                            {menuItem.submenu.map((submenuItem, subIndex) => (
                              <Link
                                href={submenuItem.path}
                                key={subIndex}
                                onClick={() => setNavbarOpen(false)}
                                className="block rounded-lg py-2.5 text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white lg:px-3"
                              >
                                {submenuItem.title}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </li>
                  ))}

                  {/* CFD Cloud — CTA (widoczne w menu tylko na mobile) */}
                  {highlightItem?.path && (
                    <li className="group relative lg:hidden">
                      <Link
                        href={highlightItem.path}
                        onClick={() => setNavbarOpen(false)}
                        className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        {highlightItem.title}
                        <span>↗</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </nav>
            </div>

            {/* Right side: CTA + email + theme toggler */}
            <div className="flex items-center justify-end gap-4 pr-16 lg:pr-0">
              <a
                href="mailto:biuro@fp-solutions.pl"
                className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white xl:block"
              >
                biuro@fp-solutions.pl
              </a>

              {/* CFD Cloud — CTA (desktop) */}
              {highlightItem?.path && (
                <Link
                  href={highlightItem.path}
                  className="hidden items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 lg:inline-flex"
                >
                  {highlightItem.title}
                  <span>↗</span>
                </Link>
              )}

              <ThemeToggler />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
