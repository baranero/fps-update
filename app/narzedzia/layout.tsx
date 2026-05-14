"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CalculatorIcon = () => (
  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);
const ReportIcon = () => (
  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);
const EquipmentIcon = () => (
  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

const appLinks = [
  { name: "Panel Główny", href: "/narzedzia", icon: ReportIcon, exact: true },
  { name: "Kalkulatory PPOŻ", href: "/narzedzia/kalkulatory", icon: CalculatorIcon, exact: false },
  { name: "Baza Osprzętu", href: "/narzedzia/osprzet", icon: EquipmentIcon, exact: false },
  { name: "Moje Raporty", href: "/narzedzia/raporty", icon: ReportIcon, exact: false },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="bg-gray-light pb-[120px] pt-[150px] dark:bg-bg-color-dark min-h-screen">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          
          {/* Panel boczny (Sidebar) dopasowany do stylów strony */}
          <div className="w-full px-4 lg:w-3/12">
            <div className="mb-10 rounded-md bg-white p-6 shadow-two dark:bg-dark sm:p-8">
              <h3 className="mb-6 border-b border-body-color border-opacity-10 pb-4 text-xl font-bold text-black dark:border-white dark:border-opacity-10 dark:text-white">
                Narzędzia
              </h3>
              <nav className="flex flex-col space-y-2">
                {appLinks.map((link) => {
                  // Sprawdzanie aktywnego linku
                  const isActive = link.exact 
                    ? pathname === link.href 
                    : pathname.startsWith(link.href) && link.href !== "/narzedzia";
                  const Icon = link.icon;
                  
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-body-color hover:bg-primary hover:bg-opacity-10 hover:text-primary dark:text-body-color-dark dark:hover:bg-primary dark:hover:bg-opacity-10 dark:hover:text-white"
                      }`}
                    >
                      <Icon />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Główny obszar zawartości */}
          <div className="w-full px-4 lg:w-9/12">
            {children}
          </div>

        </div>
      </div>
    </section>
  );
}