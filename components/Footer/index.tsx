"use client";
import Image from "next/image";
import Link from "next/link";
import { FaPhone } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";

const contactItems = [
  {
    Icon: FaPhone,
    label: "+48 790 782 993",
    href: "tel:+48790782993",
  },
  {
    Icon: IoIosMail,
    label: "biuro@fp-solutions.pl",
    href: "mailto:biuro@fp-solutions.pl",
  },
];

const navigationLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" },
];

const offerLinks = [
  { href: "/ibp", label: "Instrukcja Bezpieczeństwa Pożarowego" },
  { href: "/cfd", label: "Symulacje CFD" },
  { href: "/operat", label: "Operat przeciwpożarowy" },
  { href: "/audyt", label: "Audyt przeciwpożarowy" },
  { href: "/scenariusz", label: "Scenariusz rozwoju pożaru" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="wow fadeInUp relative z-10 bg-white pt-16 dark:bg-gray-dark md:pt-20 lg:pt-24"
      data-wow-delay=".1s"
    >
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4 md:w-1/2 lg:w-4/12 xl:w-5/12">
            <div className="mb-12 max-w-[360px] lg:mb-16">
              <Link href="/" className="mb-6 inline-block">
                <div className="flex flex-col items-center w-max">
                  <Image
                    src="/images/logo/logo.webp"
                    alt="Fire Protection Solutions logo"
                    width={50}
                    height={30}
                    className="dark:hidden"
                  />
                  <p className="w-full pl-0 font-bold dark:hidden">
                    Fire Protection <span className="text-primary">Solutions</span>
                  </p>
                  <Image
                    src="/images/logo/logo.webp"
                    alt="Fire Protection Solutions logo"
                    width={50}
                    height={30}
                    className="hidden dark:block"
                  />
                  <p className="hidden w-full pl-0 font-bold dark:block">
                    Fire Protection <span className="text-primary">Solutions</span>
                  </p>
                </div>
              </Link>
              <p className="mb-9 text-base leading-relaxed text-body-color dark:text-body-color-dark">
                Kompleksowe usługi w zakresie ochrony przeciwpożarowej obejmujące projektowanie systemów,
                opracowywanie dokumenatcji oraz symulacje CFD.
              </p>
              <div className="w-full">
                <div className="wow fadeInUp mb-12 rounded-sm py-11" data-wow-delay=".15s">
                  <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                    Skontaktuj się
                  </h2>
                  <p className="mb-12 text-base font-medium text-body-color">
                    Wybierz tradycyjną formę kontaktu.
                  </p>
                  <div className="mx-[-12px] flex flex-wrap">
                    {contactItems.map(({ Icon, label, href }) => (
                      <div key={label} className="w-full p-3 flex gap-4 items-center text-lg font-medium text-body-color">
                        <Icon className="text-primary" size={25} />
                        <a href={href}>{label}</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full px-4 sm:w-1/2 md:w-1/2 lg:w-2/12 xl:w-2/12">
            <div className="mb-12 lg:mb-16">
              <h2 className="mb-10 text-xl font-bold text-black dark:text-white">
                Przydatne linki
              </h2>
              <ul>
                {navigationLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="w-full px-4 sm:w-1/2 md:w-1/2 lg:w-4/12 xl:w-4/12">
            <div className="mb-12 lg:mb-16">
              <h2 className="mb-10 text-xl font-bold text-black dark:text-white">
                Oferta
              </h2>
              <ul>
                {offerLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="mb-4 inline-block text-base text-body-color duration-300 hover:text-primary dark:text-body-color-dark dark:hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#DC3545] to-transparent dark:via-[#DC3545]"></div>

        <div className="py-8 flex flex-col-reverse items-center justify-between gap-6 md:flex-row">
          <p className="text-center text-base text-body-color dark:text-white">
            ©{year} Fire Protection Solutions Jakub Baran
          </p>

          <ul className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            <li>
              <Link
                href="/polityka-prywatnosci"
                className="text-base text-body-color duration-300 hover:text-primary dark:text-white dark:hover:text-primary"
              >
                Polityka prywatności
              </Link>
            </li>
            <li>
              <Link
                href="/polityka-cookies"
                className="text-base text-body-color duration-300 hover:text-primary dark:text-white dark:hover:text-primary"
              >
                Polityka cookies
              </Link>
            </li>
            <li>
              <Link
                href="/regulamin"
                className="text-base text-body-color duration-300 hover:text-primary dark:text-white dark:hover:text-primary"
              >
                Regulamin
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ...existing decorative SVG markup... */}
    </footer>
  );
};

export default Footer;