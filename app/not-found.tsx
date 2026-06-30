import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        <p className="text-8xl font-black text-slate-100 dark:text-slate-800 select-none leading-none mb-6">
          404
        </p>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Strona nie istnieje
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Adres, który wpisałeś, nie istnieje lub został przeniesiony.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Strona główna
          </Link>
          <Link
            href="/narzedzia"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Panel narzędzi
          </Link>
        </div>

      </div>
    </section>
  );
}
