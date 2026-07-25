"use client";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FaPhone } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";
import { isCloudPath } from "@/lib/cloud";

const contactItems = [
  { Icon: FaPhone, label: "+48 790 782 993", href: "tel:+48790782993" },
  { Icon: IoIosMail, label: "biuro@fp-solutions.pl", href: "mailto:biuro@fp-solutions.pl" },
];

const Footer = () => {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const navigationLinks = [
    { href: "/blog", label: tn("blog") },
    { href: "/o-mnie", label: tn("about") },
    { href: "/kontakt", label: tn("contact") },
  ];

  const offerLinks = [
    { href: "/ibp", label: tn("ibp") },
    { href: "/cfd", label: tn("cfd") },
    { href: "/operat", label: tn("operat") },
    { href: "/audyt", label: tn("audit") },
    { href: "/scenariusz", label: tn("scenario") },
  ];

  const legalLinks = [
    { href: "/polityka-prywatnosci", label: t("privacy") },
    { href: "/polityka-cookies", label: t("cookies") },
    { href: "/regulamin", label: t("terms") },
  ];

  // Stopka chmury (FDSRun) — slim, bez sekcji konsultingu. Marka rozpoznawana po
  // ścieżce (landing żyje pod /chmura). Linki prawne prowadzą do fp-solutions.pl (301).
  if (isCloudPath(pathname)) {
    return (
      <footer className="relative z-10 border-t border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-5 py-8 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A5.002 5.002 0 007.1 7.1 4 4 0 003 11m9 0v6m0-6l-2.5 2.5M12 11l2.5 2.5" />
                </svg>
              </span>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                FDS<span className="text-primary">Run</span>
              </span>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:biuro@fp-solutions.pl"
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  biuro@fp-solutions.pl
                </a>
              </li>
            </ul>
            <p className="text-sm text-slate-500 dark:text-slate-500">&copy;{year} FDSRun</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 bg-slate-100 pt-16 dark:bg-slate-950 md:pt-20 lg:pt-24">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          {/* Brand + contact */}
          <div className="w-full px-4 md:w-1/2 lg:w-4/12 xl:w-5/12">
            <div className="mb-12 max-w-[360px] lg:mb-16">
              <Link href="/" className="mb-8 inline-block">
                <div className="flex flex-col items-center">
                  <Image
                    src="/images/logo/logo.webp"
                    alt="Fire Protection Solutions logo"
                    width={50}
                    height={30}
                  />
                  <p className="w-full pt-2 font-bold text-slate-900 dark:text-white">
                    Fire Protection <span className="text-primary">Solutions</span>
                  </p>
                </div>
              </Link>

              <p className="mb-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t("tagline")}
              </p>

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                  {t("contact")}
                </h3>
                {contactItems.map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="mb-3 flex items-center gap-3 text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                  >
                    <Icon className="shrink-0 text-primary" size={16} />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="w-full px-4 sm:w-1/2 md:w-1/2 lg:w-2/12 xl:w-2/12">
            <div className="mb-12 lg:mb-16">
              <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                {t("pages")}
              </h3>
              <ul className="space-y-3">
                {navigationLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Offer */}
          <div className="w-full px-4 sm:w-1/2 md:w-1/2 lg:w-4/12 xl:w-4/12">
            <div className="mb-12 lg:mb-16">
              <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                {t("offer")}
              </h3>
              <ul className="space-y-3">
                {offerLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

        {/* Bottom bar */}
        <div className="flex flex-col-reverse items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            &copy;{year} {t("rights")}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {legalLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
