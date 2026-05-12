"use client"; // Ważne dla obsługi zdarzeń formularza

import { FaPhone } from "react-icons/fa6";
import { IoIosMail } from "react-icons/io";

const Contact = () => {
  return (
    <section id="contact" className="overflow-hidden py-16 md:py-20 lg:py-28">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4 lg:w-7/12 xl:w-8/12">
            <div
              className="wow fadeInUp mb-12 rounded-sm bg-white px-8 py-11 shadow-three dark:bg-gray-dark sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]"
              data-wow-delay=".15s"
            >
              <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                Potrzebujesz więcej informacji? Napisz!
              </h2>
              <p className="mb-12 text-base font-medium text-body-color">
                Odpowiem najszybciej jak to możliwe.
              </p>

              {/* TUTAJ: Zmień adres URL po założeniu konta na Formspree */}
              <form action="https://formspree.io/f/xwvyywbd" method="POST">
                <div className="-mx-4 flex flex-wrap">
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label htmlFor="name" className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Twoje imię
                      </label>
                      <input
                        type="text"
                        name="name" // Niezbędne dla Formspree
                        id="name"
                        required
                        placeholder="Wpisz swoje imię"
                        className="w-full rounded-sm border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4 md:w-1/2">
                    <div className="mb-8">
                      <label htmlFor="email" className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Twój email
                      </label>
                      <input
                        type="email"
                        name="email" // Niezbędne dla Formspree
                        id="email"
                        required
                        placeholder="Wpisz swój email"
                        className="w-full rounded-sm border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none"
                      />
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <div className="mb-8">
                      <label htmlFor="message" className="mb-3 block text-sm font-medium text-dark dark:text-white">
                        Treść wiadomości
                      </label>
                      <textarea
                        name="message" // Niezbędne dla Formspree
                        id="message"
                        required
                        rows={5}
                        placeholder="Wpisz treść wiadomości"
                        className="w-full resize-none rounded-sm border border-stroke bg-[#f8f8f8] px-6 py-3 text-base text-body-color outline-none focus:border-primary dark:border-transparent dark:bg-[#2C303B] dark:text-body-color-dark dark:shadow-two dark:focus:border-primary dark:focus:shadow-none"
                      ></textarea>
                    </div>
                  </div>
                  <div className="w-full px-4">
                    <button 
                      type="submit" 
                      className="rounded-sm bg-primary px-9 py-4 text-base font-medium text-white shadow-submit duration-300 hover:bg-primary/90 dark:shadow-submit-dark"
                    >
                      Wyślij wiadomość
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Dane kontaktowe (Prawy pasek) */}
          <div className="w-full px-4 lg:w-5/12 xl:w-4/12">
            <div
              className="wow fadeInUp mb-12 rounded-sm bg-white px-8 py-11 shadow-three dark:bg-gray-dark sm:p-[55px] lg:mb-5 lg:px-8 xl:p-[55px]"
              data-wow-delay=".15s"
            >
              <h2 className="mb-3 text-2xl font-bold text-black dark:text-white sm:text-3xl lg:text-2xl xl:text-3xl">
                Skontaktuj się
              </h2>
              <p className="mb-12 text-base font-medium text-body-color">
                Wybierz tradycyjną formę kontaktu.
              </p>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 text-lg font-medium text-body-color transition-colors hover:text-primary">
                  <FaPhone className="text-primary" size={25} />
                  <a href="tel:+48790782993">+48 790 782 993</a>
                </div>
                <div className="flex items-center gap-4 text-lg font-medium text-body-color transition-colors hover:text-primary">
                  <IoIosMail className="text-primary" size={25} />
                  <a href="mailto:biuro@fp-solutions.pl">biuro@fp-solutions.pl</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;