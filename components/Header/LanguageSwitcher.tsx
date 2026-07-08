"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div
      className={`flex items-center overflow-hidden rounded-lg border border-slate-200 text-[11px] font-bold dark:border-slate-700 ${className}`}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-pressed={l === locale}
          className={`px-2.5 py-1.5 uppercase transition-colors ${
            l === locale
              ? "bg-primary text-white"
              : "text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
