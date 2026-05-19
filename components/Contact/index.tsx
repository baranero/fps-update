"use client";

import { FaPhone } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-base text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-primary";
const labelClass = "mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300";

const Contact = () => {
  return (
    <section id="contact" className="overflow-hidden py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          {/* Form */}
          <div className="w-full px-4 lg:w-7/12 xl:w-8/12">
            <div
              className="wow fadeInUp mb-12 rounded-2xl border border-slate-100 bg-white px-8 py-11 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]"
              data-wow-delay=".15s"
            >
              <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                Potrzebujesz więcej informacji? Napisz!
              </h2>
              <p className="mb-12 text-base text-slate-600 dark:text-slate-400">
                Odpowiem najszybciej jak to możliwe.
              </p>

              <form action="https://formspree.io/f/xwvyywbd" method="POST">
                <div className="-mx-4 flex flex-wrap">
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label htmlFor="name" className={labelClass}>Twoje imię</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        placeholder="Wpisz swoje imię"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label htmlFor="email" className={labelClass}>Twój email</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        placeholder="Wpisz swój email"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-8">
                      <label htmlFor="message" className={labelClass}>Treść wiadomości</label>
                      <textarea
                        name="message"
                        id="message"
                        required
                        rows={5}
                        placeholder="Wpisz treść wiadomości"
                        className={inputClass + " resize-none"}
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-9 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-primary/90"
                    >
                      Wyślij wiadomość
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Contact info */}
          <div className="w-full px-4 lg:w-5/12 xl:w-4/12">
            <div
              className="wow fadeInUp rounded-2xl border border-slate-100 bg-white px-8 py-11 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:p-[55px] lg:px-8 xl:p-[55px]"
              data-wow-delay=".2s"
            >
              <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                Skontaktuj się
              </h2>
              <p className="mb-10 text-base text-slate-600 dark:text-slate-400">
                Wybierz tradycyjną formę kontaktu.
              </p>
              <div className="flex flex-col gap-6">
                <a
                  href="tel:+48790782993"
                  className="flex items-center gap-4 text-base font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                >
                  <FaPhone className="shrink-0 text-primary" size={20} />
                  +48 790 782 993
                </a>
                <a
                  href="mailto:biuro@fp-solutions.pl"
                  className="flex items-center gap-4 text-base font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                >
                  <IoIosMail className="shrink-0 text-primary" size={20} />
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
