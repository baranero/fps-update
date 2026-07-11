"use client";

import { useTranslations } from "next-intl";
import { FaPhone } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-800 outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-primary";
const labelClass = "mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300";

const Contact = () => {
  const t = useTranslations("contact");

  return (
    <section id="contact" className="py-16 md:py-20 lg:py-24">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          {/* Formularz */}
          <div className="w-full px-4 lg:w-7/12 xl:w-8/12">
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#111827] sm:p-10 lg:mb-0">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t("formTitle")}
              </h2>
              <p className="mb-8 mt-2 text-[15px] text-slate-600 dark:text-slate-400">
                {t("formDesc")}
              </p>

              <form action="https://formspree.io/f/xwvyywbd" method="POST">
                <div className="-mx-4 flex flex-wrap">
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-6">
                      <label htmlFor="name" className={labelClass}>{t("nameLabel")}</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        placeholder={t("namePlaceholder")}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-6">
                      <label htmlFor="email" className={labelClass}>{t("emailLabel")}</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        placeholder={t("emailPlaceholder")}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-6">
                      <label htmlFor="message" className={labelClass}>{t("messageLabel")}</label>
                      <textarea
                        name="message"
                        id="message"
                        required
                        rows={5}
                        placeholder={t("messagePlaceholder")}
                        className={inputClass + " resize-none"}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C0201A] dark:hover:bg-[#FF817B]"
                    >
                      {t("submit")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Dane kontaktowe */}
          <div className="w-full px-4 lg:w-5/12 xl:w-4/12">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#111827] sm:p-10">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {t("infoTitle")}
              </h2>
              <p className="mb-8 mt-2 text-[15px] text-slate-600 dark:text-slate-400">
                {t("infoDesc")}
              </p>
              <div className="flex flex-col gap-5">
                <a
                  href="tel:+48790782993"
                  className="flex items-center gap-3.5 text-[15px] font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-300 dark:hover:text-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FaPhone size={16} />
                  </span>
                  +48 790 782 993
                </a>
                <a
                  href="mailto:biuro@fp-solutions.pl"
                  className="flex items-center gap-3.5 text-[15px] font-medium text-slate-700 transition-colors hover:text-primary dark:text-slate-300 dark:hover:text-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <IoIosMail size={18} />
                  </span>
                  biuro@fp-solutions.pl
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
