"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

// App Router renderuje kolejną stronę na serwerze ZANIM zmieni adres w pasku.
// Przy wolniejszym łączu klik w odnośnik przez sekundę czy dwie nie daje więc
// żadnego znaku życia — nie wiadomo, czy się w ogóle trafiło, czy coś stanęło.
// Ten komponent domyka pętlę zwrotną trzema sygnałami naraz:
//   1. pasek postępu przy górnej krawędzi okna (start przy kliknięciu,
//      koniec przy faktycznej zmianie adresu),
//   2. kursor „progress" na całym dokumencie,
//   3. wygaszenie odnośnika, w który kliknięto — widać nie tylko ŻE coś się
//      dzieje, ale i DOKĄD się idzie.
//
// Świadomie nie korzystamy z `useLinkStatus` (Next 15.3+), bo ten hook wymaga
// Reacta 19, a projekt stoi na 18.2. Nasłuch na `click` w dokumencie łapie
// każdy odnośnik — i `next/link`, i lokalizowany `Link` z next-intl.

const REVEAL_MS = 140;    // próg, poniżej którego pasek się nie pokazuje (patrz `start`)
const TRICKLE_MS = 240;   // co ile dokładamy postępu
const CEILING = 92;       // pasek nigdy nie dobija sam do końca — koniec = zmiana adresu
const DONE_MS = 260;      // ile trzyma 100%, zanim zacznie znikać
const FADE_MS = 260;      // po zniknięciu wolno wyzerować szerokość
const SAFETY_MS = 8000;   // awaryjne sprzątanie, gdy nawigacja nigdy nie dojdzie do skutku

function NavigationProgressInner() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Zmiana adresu = koniec nawigacji. Liczy się też sam query string, bo
  // filtry w historii czy panelu zmieniają wyłącznie jego.
  const url = `${pathname}?${searchParams}`;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  // Stan trzymamy równolegle w ref, bo czytają go nasłuchy zdarzeń
  // zarejestrowane raz przy montowaniu (domknięcie nie widziałoby stanu).
  const busy = useRef(false);
  const reveal = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const tail = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLink = useRef<HTMLElement | null>(null);

  const clearTimers = useCallback(() => {
    if (reveal.current) clearTimeout(reveal.current);
    if (trickle.current) clearInterval(trickle.current);
    if (tail.current) clearTimeout(tail.current);
    if (safety.current) clearTimeout(safety.current);
    reveal.current = null;
    trickle.current = null;
    tail.current = null;
    safety.current = null;
  }, []);

  const stop = useCallback(() => {
    if (!busy.current) return;
    busy.current = false;
    clearTimers();
    document.documentElement.removeAttribute("data-nav-busy");
    pendingLink.current?.removeAttribute("data-nav-pending");
    pendingLink.current = null;
    setProgress(100);
    // Najpierw wygaszamy pasek, a dopiero po zniknięciu zerujemy szerokość —
    // inaczej widać, jak się zwija z powrotem do lewej krawędzi.
    tail.current = setTimeout(() => {
      setVisible(false);
      tail.current = setTimeout(() => setProgress(0), FADE_MS);
    }, DONE_MS);
  }, [clearTimers]);

  const start = useCallback(
    (link: HTMLElement | null) => {
      clearTimers();
      pendingLink.current?.removeAttribute("data-nav-pending");
      busy.current = true;
      pendingLink.current = link;
      // Kursor od razu — to on odpowiada na pytanie „czy w ogóle trafiłem".
      document.documentElement.setAttribute("data-nav-busy", "");
      // Pasek dopiero po progu: strona wczytana z wyprzedzeniem (prefetch)
      // potrafi wejść w 50 ms, a pasek pokazany na tak krótko tylko mruga.
      reveal.current = setTimeout(() => {
        link?.setAttribute("data-nav-pending", "");
        setVisible(true);
        setProgress(8);
        // Postęp jest z natury nieznany — pasek pełznie asymptotycznie do
        // sufitu, żeby ruch nie ustał nawet przy długim oczekiwaniu.
        trickle.current = setInterval(() => {
          setProgress((p) => (p >= CEILING ? p : p + (CEILING - p) * 0.12));
        }, TRICKLE_MS);
      }, REVEAL_MS);
      safety.current = setTimeout(stop, SAFETY_MS);
    },
    [clearTimers, stop],
  );

  // Zmiana adresu — nawigacja doszła do skutku. Przy montowaniu `busy` jest
  // fałszem, więc `stop()` nie robi nic.
  useEffect(() => {
    stop();
  }, [url, stop]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Środkowy/prawy przycisk i modyfikatory otwierają kartę obok — bieżąca
      // strona zostaje na miejscu, więc pasek byłby kłamstwem.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!link.getAttribute("href")) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download") || link.dataset.noProgress !== undefined) return;

      let next: URL;
      try {
        next = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      // Inne origin (także mailto:/tel:) — przeglądarka pokazuje własny
      // wskaźnik ładowania, nie dublujemy go.
      if (next.origin !== window.location.origin) return;
      // Sama kotwica #hash albo ponowny klik w bieżący adres — nic się nie ładuje.
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;

      start(link);
    }

    // Wstecz/dalej też potrafi chwilę mielić, a tam nie ma w co kliknąć.
    const onPopState = () => start(null);

    // Faza przechwytywania, nie bąbelkowania — z dwóch powodów: `next/link`
    // sam woła `preventDefault()` (przejmuje nawigację), a część menu robi
    // `stopPropagation()`, więc do dokumentu klik by nie doszedł.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
      document.documentElement.removeAttribute("data-nav-busy");
    };
  }, [start, clearTimers]);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      >
        <div
          className="h-full rounded-r-full bg-[rgb(var(--fr-ring))]"
          style={{
            width: `${progress}%`,
            transition: "width 220ms ease-out",
            boxShadow: "0 0 10px rgb(var(--fr-ring) / 0.65)",
          }}
        />
      </div>
      {/* Czytnik ekranu nie zobaczy paska — dostaje komunikat tekstowy. */}
      <span role="status" aria-live="polite" className="sr-only">
        {visible ? t("loading") : ""}
      </span>
    </>
  );
}

// `useSearchParams` bez granicy Suspense wypchnęłoby CAŁĄ witrynę do renderu
// po stronie klienta (statyczne strony marketingowe przestałyby się
// prerenderować). Granica zamyka ten koszt w samym pasku.
export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
