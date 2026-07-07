import Link from "next/link";

const steps = [
  {
    n: "1",
    title: "Wgraj plik .fds",
    desc: "Parser analizuje model lokalnie w przeglądarce i pokazuje wycenę przed wysłaniem — bez przesyłania danych.",
  },
  {
    n: "2",
    title: "Potwierdź i zapłać",
    desc: "System dobiera optymalny serwer i uruchamia obliczenia. Śledzisz postęp na żywo — log co 5 sekund.",
  },
  {
    n: "3",
    title: "Pobierz wyniki",
    desc: "Po zakończeniu dostajesz e-mail z linkiem do SMV, CSV i logów. Pliki dostępne przez 60 dni.",
  },
];

const features = [
  {
    icon: "⚡",
    title: "Dedykowany VM per zlecenie",
    desc: "Każda symulacja dostaje własny serwer — brak kolejki, brak dzielenia zasobów.",
  },
  {
    icon: "🌍",
    title: "Dostępny globalnie",
    desc: "Interfejs w języku polskim i angielskim. Serwery w Europie — niskie opóźnienia dla PL, DE, UK, AE.",
  },
  {
    icon: "💳",
    title: "Płatność od zużycia",
    desc: "Naliczanie za faktyczny czas CPU + storage. Stripe, BLIK, Przelewy24. Faktury w panelu.",
  },
  {
    icon: "📦",
    title: "Wyniki przez 60 dni",
    desc: "Pliki SMV, slice files, CSV z DEVC i logi — przechowywane 60 dni, pobierane przez bezpieczny link.",
  },
];

const CloudSpotlight = () => {
  return (
    <section className="relative overflow-hidden border-y border-slate-800/60 bg-[#0B1120] py-20">
      {/* background glow */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(220,53,69,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="container relative">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">

          {/* Left: how it works */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                CFD Cloud
              </span>
            </div>

            <h2 className="mb-4 text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.12] tracking-tight text-white text-wrap-balance">
              Obliczenia FDS{" "}
              <span className="text-primary">bez własnej infrastruktury</span>
            </h2>

            <p className="mb-8 text-[15px] leading-relaxed text-slate-400">
              Wgraj plik .fds — system dobiera serwer, uruchamia obliczenia i
              zwraca wyniki. Płacisz tylko za faktyczne zużycie CPU i storage.
            </p>

            <div className="mb-10 space-y-5">
              {steps.map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-mono text-[12px] font-bold text-primary">
                    {n}
                  </div>
                  <div className="pt-0.5">
                    <p className="mb-1 text-[14px] font-semibold text-white">
                      {title}
                    </p>
                    <p className="text-[13px] leading-relaxed text-slate-400">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/symulacje"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[14px] font-extrabold text-white transition-colors hover:bg-primary/90"
            >
              Uruchom pierwszą symulację →
            </Link>
          </div>

          {/* Right: feature cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-primary/12 bg-primary/[0.04] p-5 transition-colors hover:border-primary/25"
              >
                <div className="mb-3 text-[22px] leading-none">{icon}</div>
                <h3 className="mb-1.5 text-[14px] font-bold text-white">
                  {title}
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-400">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CloudSpotlight;
