"use client";

import { useEffect, useRef, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import LiveCharts from "./LiveCharts";
import ConsoleChart from "./ConsoleChart";
import ConsoleReadings from "./ConsoleReadings";
import { Pager, Plate, Section, Spec, SpecGrid, Tabs } from "@/components/Cloud/Section";
import {
  Console, ConsoleHead, ConsoleLog, ConsoleMetric, ConsoleNote, ConsolePane, ConsoleProgress, ConsoleRow,
} from "@/components/Cloud/Console";
import SliceView from "./SliceView";
import {
  Btn, BtnLink, Notice, Shell, Skeleton,
} from "@/components/Cloud/ui";
import { type FdsDevc } from "@/lib/fds/parser";
import type { FdsSliceJson } from "@/lib/fds/slice";
import { explainFdsErrors, diagnoseFailure, type FdsErrorInfo } from "@/lib/fds/errors";
// Czysta logika karty zlecenia mieszka w osobnych modułach — tu zostaje widok.
import {
  consoleLogEntries, extractErrorLines, hasFatalFdsError, parseFdsProgress, parseFdsStats,
} from "@/lib/fds/jobLog";
import {
  elapsed, fileIcon, fileTypeKey, formatCells, formatDt, formatDuration, formatSize,
  packageLabel, remainingSec, splitDuration, totalSize,
} from "@/lib/fds/jobFormat";
import {
  GB, PACKAGE_SIZE_OPTIONS, DEFAULT_PACKAGE_BYTES, splitIntoPackages,
} from "@/lib/fds/download-limits";
import { fetchResult, proxyResultUrl, resultHref } from "@/lib/fds/result-fetch";
import { EMPTY_INVOICE, grossAmount, vatTreatment, type InvoiceData } from "@/lib/invoice";
import { loadInvoiceData } from "@/lib/invoiceClient";
import { createClient } from "@/lib/supabase/client";
import { saveFilePicker, streamZipToFile, type WritableFileHandle } from "@/lib/fds/zip-client";

interface JobData {
  caseId: string;
  status: "pending" | "dispatched" | "running" | "done" | "failed" | "cancelled";
  fileName: string;
  totalCells: number;
  meshCount: number | null;
  mpiProcs: number | null;
  tEnd: number;
  complexity: string;
  vcpuHours: number;
  wallHours: number;
  price: number;
  serverLabel: string | null;
  serverCores: number | null;
  dispatchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  fdsLog: string | null;
  fdsExitCode: number | null;
  devcCsv: string | null;
  hrrCsv: string | null;
  sliceJson: FdsSliceJson | null;
  devcSetpoints: FdsDevc[] | null;
  lastProgressAt: string | null;
  stopRequested: boolean;
  results: Array<{ name: string; url: string; size: number | null; createdAt: string | null }> | null;
  paymentStatus: "paid" | "pending" | null;
}

// Karty z wyjaśnieniem błędów FDS (co oznacza + jak naprawić) — treść jest już
// zlokalizowana przez explainFdsErrors(log, locale).
function FdsErrorCards({ errors }: { errors: FdsErrorInfo[] }) {
  const t = useTranslations("symDetail");
  if (!errors.length) return null;
  return (
    <div className="space-y-2">
      {errors.map((e, i) => (
        <div key={i} className="rounded-panel border border-primary/40 bg-panel/70 p-3">
          <p className="text-fr-body font-semibold text-accent">
            {e.code && (
              <span className="font-mono text-fr-sm mr-1.5 rounded-chip bg-primary/15 px-1.5 py-0.5 align-middle">
                {t("errorCode")} {e.code}
              </span>
            )}
            {e.title}
          </p>
          <p className="mt-2 font-mono text-fr-sm text-muted">{e.explanation}</p>
          <p className="text-fr-sm text-muted mt-1">
            <span className="font-semibold text-muted">{t("failed.howToFix")}</span> {e.hint}
          </p>
        </div>
      ))}
    </div>
  );
}

// Wyłącznie klasy kolorów/tła statusu — etykiety i opisy pochodzą z tłumaczeń.
// Statusy w palecie serwisu zamiast czterech kolorów Tailwinda: neutralny dla
// stanów spoczynkowych, „signal" (stal) dla pracy i sukcesu, „warn" dla
// liczenia w toku, „primary" dla błędu. Dzięki temu strona zlecenia nie
// wprowadza kolorów, których nie ma nigdzie indziej w serwisie.
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  pending:    { color: "text-muted",  bg: "bg-panel-deep",     border: "border-hairline",     dot: "bg-muted animate-pulse" },
  dispatched: { color: "text-signal", bg: "bg-signal/[0.07]",  border: "border-signal/30",    dot: "bg-signal animate-pulse" },
  running:    { color: "text-warn",   bg: "bg-warn/[0.07]",    border: "border-warn/30",      dot: "bg-warn animate-pulse" },
  done:       { color: "text-signal", bg: "bg-signal/[0.07]",  border: "border-signal/30",    dot: "bg-signal" },
  failed:     { color: "text-accent",bg: "bg-primary/[0.07]", border: "border-primary/40",   dot: "bg-primary" },
  cancelled:  { color: "text-muted",  bg: "bg-panel-deep",     border: "border-hairline",     dot: "bg-muted" },
};

// Zapis plików wprost do folderu wskazanego przez użytkownika (File System Access
// API — Chrome/Edge). Typy nie ma w lib.dom tej wersji TS, więc minimalny kontrakt.
interface DirHandle {
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{
    createWritable(): Promise<WritableStream<Uint8Array>>;
  }>;
}
function directoryPicker(): ((opts?: Record<string, unknown>) => Promise<DirHandle>) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { showDirectoryPicker?: (opts?: Record<string, unknown>) => Promise<DirHandle> };
  return typeof w.showDirectoryPicker === "function" ? w.showDirectoryPicker.bind(window) : null;
}


export default function JobStatusPage(props: { params: Promise<{ caseId: string }> }) {
  const params = use(props.params);
  const { caseId } = params;
  const t = useTranslations("symDetail");
  const locale = useLocale();
  const numLocale = locale === "en" ? "en-GB" : "pl-PL";
  const errLocale = locale === "en" ? "en" : "pl";
  const cur = locale === "en" ? "PLN" : "zł";
  const money = (n: number, dec = false) =>
    `${n.toLocaleString(numLocale, dec ? { minimumFractionDigits: 2 } : undefined)} ${cur}`;
  const mins = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

  const router = useRouter();
  const searchParams = useSearchParams();
  const platnosc = searchParams.get("platnosc");
  const [job, setJob] = useState<JobData | null>(null);
  const [error, setError] = useState<"not_found" | "connection" | null>(null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dlMsg, setDlMsg] = useState<string | null>(null);
  // Trwa seria pobrań plik po pliku — blokujemy przyciski, żeby nie zlecić jej dwa razy.
  const [seqRunning, setSeqRunning] = useState(false);
  // Ostrzeżenie, które ma przetrwać kolejne komunikaty postępu (np. nieudany zapis do folderu).
  const [dlWarn, setDlWarn] = useState<string | null>(null);
  // Podział wyników na paczki — ratunek, gdy jedno duże pobranie się urywa.
  const [pkgTarget, setPkgTarget] = useState<number>(DEFAULT_PACKAGE_BYTES);
  const [pkgOpen, setPkgOpen] = useState(false);
  // Wsparcie przeglądarki ustalamy po hydratacji — serwer nie wie, w czym
  // strona się otworzy. `canZipLocally` decyduje, czy paczkę da się złożyć na
  // miejscu; bez tego pakowanie musiałoby pójść przez funkcję serwerową.
  const [canPickFolder, setCanPickFolder] = useState(false);
  const [canZipLocally, setCanZipLocally] = useState(false);
  const [logMode, setLogMode] = useState<"basic" | "advanced">("basic");
  const termRef = useRef<HTMLDivElement>(null);
  const termScrolledUpRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [paying, setPaying] = useState(false);
  // Stawka VAT zależy od tego, kim jest nabywca (odwrotne obciążenie w UE,
  // poza zakresem poza UE) — na sztywno doliczane 23% było błędem dla obu.
  const [invoice, setInvoice] = useState<InvoiceData>(EMPTY_INVOICE);
  const [filePage, setFilePage] = useState(1);
  const [finalCsv, setFinalCsv] = useState<{ devc: string | null; hrr: string | null }>({ devc: null, hrr: null });
  // Wyniki częściowe — migawka plików z magazynu dostępna W TRAKCIE obliczeń.
  const [partial, setPartial] = useState<Array<{ name: string; url: string; size: number | null; createdAt: string | null }>>([]);
  const [partialLoading, setPartialLoading] = useState(false);
  // Kiedy ostatnio pobrano listę plików częściowych (null = jeszcze nigdy).
  const [partialAt, setPartialAt] = useState<Date | null>(null);
  // Do jakiego czasu symulacji sięga migawka (manifest zapisany przez maszynę liczącą).
  const [snapshot, setSnapshot] = useState<{ t: number; at: string | null } | null>(null);

  useEffect(() => {
    setCanPickFolder(directoryPicker() !== null);
    setCanZipLocally(saveFilePicker() !== null);
  }, []);

  const loadPartial = async () => {
    setPartialLoading(true);
    try {
      const res = await fetch(`/api/symulacje/${caseId}/results`);
      const d = await res.json();
      if (Array.isArray(d.results)) {
        setPartial(d.results);
        setSnapshot(d.snapshot ?? null);
        // Bez automatycznego odświeżania użytkownik musi wiedzieć, jak świeża
        // jest ta lista — inaczej nie odróżni „nic nie przybyło" od „patrzysz
        // na stan sprzed godziny".
        setPartialAt(new Date());
      }
    } catch {
      /* brak listy — pokażemy pusty stan */
    } finally {
      setPartialLoading(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/symulacje/${caseId}/stop`, { method: "POST" });
      if (res.ok) setJob((j) => (j ? { ...j, stopRequested: true } : j));
    } finally {
      setStopping(false);
      setConfirmCancel(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/symulacje/${caseId}`, { method: "DELETE" });
      if (res.ok) router.push("/symulacje/historia");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/platnosci/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    loadInvoiceData(createClient()).then((res) => { if (res.ok) setInvoice(res.data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (platnosc === "sukces") {
      fetch(`/api/platnosci/verify?caseId=${caseId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.payment_status === "paid") setJob((j) => (j ? { ...j, paymentStatus: "paid" } : j));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platnosc]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/symulacje/${caseId}`);
      if (res.status === 404) { setError("not_found"); return; }
      if (res.status === 500) { setError("connection"); return; }
      if (!res.ok) { setError("connection"); return; }
      const data: JobData = await res.json();
      setJob(data);
      if (["done", "failed", "cancelled"].includes(data.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      setError("connection");
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(() => {
      setTick((n) => n + 1);
      fetchStatus();
    }, 3_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Lista wyników częściowych powstaje WYŁĄCZNIE na żądanie (przycisk
  // „Synchronizuj"). Wcześniej odpytywaliśmy magazyn co 60 s przez cały czas
  // trwania obliczeń, choć plików przybywa co ~2 minuty i prawie nikt na tę
  // listę nie patrzy — każde wywołanie to pełny LIST po katalogu z setkami
  // plików. Kto chce zobaczyć, co już jest, klika i dostaje aktualny stan.

  useEffect(() => {
    if (logMode === "advanced" && termRef.current && !termScrolledUpRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.fdsLog, logMode]);

  // „Obliczenia się skończyły” ≠ „skończyły się sukcesem”. Pliki wynikowe trafiają
  // do magazynu także po błędzie FDS (migawki + finalny upload z maszyny liczącej),
  // więc wszystko, co czyta wyniki Z MAGAZYNU, ma działać również dla "failed".
  const finished = job?.status === "done" || job?.status === "failed";

  useEffect(() => {
    if (!finished || !job?.results?.length) return;
    const devcF = job.results.find((f) => f.name.toLowerCase().endsWith("_devc.csv"));
    const hrrF = job.results.find((f) => f.name.toLowerCase().endsWith("_hrr.csv"));
    if (!devcF && !hrrF) return;
    let cancelled = false;
    // Pełne CSV czytamy wprost z magazynu; proxy tylko awaryjnie (bez CORS).
    const load = async (f?: { name: string; url?: string }) => {
      if (!f) return null;
      try {
        return await (await fetchResult(f.url, proxyResultUrl(caseId, f.name))).text();
      } catch { return null; }
    };
    (async () => {
      const [devc, hrr] = await Promise.all([load(devcF), load(hrrF)]);
      if (!cancelled) setFinalCsv({ devc, hrr });
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.results]);

  const allFiles = job?.results ?? [];
  // Lista wyników potrafi mieć setki pozycji (slice per mesh per wielkość),
  // więc renderujemy ją stronami. Zaznaczenie i pobieranie działają nadal na
  // PEŁNYM zbiorze — stronicowanie dotyczy tylko tego, co widać.
  const FILES_PER_PAGE = 20;
  const filePages = Math.max(1, Math.ceil(allFiles.length / FILES_PER_PAGE));
  const filePageSafe = Math.min(filePage, filePages);
  const fileFrom = (filePageSafe - 1) * FILES_PER_PAGE;
  const visibleFiles = allFiles.slice(fileFrom, fileFrom + FILES_PER_PAGE);
  const allSelected = allFiles.length > 0 && allFiles.every((f) => selected.has(f.name));
  const someSelected = allFiles.some((f) => selected.has(f.name));
  // Rozmiary paczek — ile użytkownik faktycznie ściągnie klikając „pobierz”.
  const allSize = totalSize(allFiles);
  const selectedSize = totalSize(allFiles.filter((f) => selected.has(f.name)));
  const partialSize = totalSize(partial);

  const toggleFile = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allFiles.map((f) => f.name)));

  // Podpisany adres pliku z listy wyników — stąd bierze go podgląd przekroju
  // i zapis do folderu, żeby czytać wprost z magazynu.
  const fileUrlByName = (name: string) => job?.results?.find((f) => f.name === name)?.url;

  // Pobranie pojedynczego pliku. Preferuj BEZPOŚREDNI podpisany URL (magazyn wymusza
  // pobranie przez ResponseContentDisposition) — przeglądarka strumieniuje wprost na
  // dysk, bez obciążania serwera i bez limitów funkcji. Gdy adresu brakuje, kotwica
  // idzie na nasz route, a ten i tak oddaje przekierowanie do magazynu.
  const downloadFile = (f: { name: string; url?: string }) => {
    const a = document.createElement("a");
    a.href = f.url ?? resultHref(caseId, f.name);
    a.download = f.name;
    a.rel = "noopener";
    a.click();
  };

  // Klasyczna seria pobrań — każdy plik osobno, wprost z magazynu. Trafiają luzem
  // do folderu pobierania: przeglądarka nie pozwala kotwicy wskazać podkatalogu.
  const clickEach = async (files: Array<{ name: string; url?: string }>) => {
    for (let i = 0; i < files.length; i++) {
      setDlMsg(t("results.downloadingSeq", { i: i + 1, n: files.length }));
      downloadFile(files[i]);
      // Odstęp między kliknięciami — bez niego przeglądarka blokuje serię pobrań.
      await new Promise((r) => setTimeout(r, 700));
    }
    setDlMsg(t("results.downloadedSeq", { n: files.length }));
    setTimeout(() => setDlMsg(null), 10000);
  };

  // Zapis plików do podkatalogu o nazwie symulacji we wskazanym folderze.
  // Bajty lecą wprost z magazynu do dysku (fetch → strumień na plik), z pominięciem
  // naszego serwera. Bez CORS pojedynczy plik schodzi na proxy zamiast wywracać
  // cały zapis — użytkownik dostaje komplet, my płacimy tylko za wyjątki.
  const saveToFolder = async (files: Array<{ name: string; url?: string }>, dir: DirHandle) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setDlMsg(t("results.savingToFolder", { i: i + 1, n: files.length, name: caseId }));
      const resp = await fetchResult(f.url, proxyResultUrl(caseId, f.name));
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status} (${f.name})`);
      const handle = await dir.getFileHandle(f.name, { create: true });
      await resp.body.pipeTo(await handle.createWritable());
    }
    setDlMsg(t("results.savedToFolder", { n: files.length, name: caseId }));
    setTimeout(() => setDlMsg(null), 10000);
  };

  // Pobranie wielu plików bez pakowania. Gdy przeglądarka to potrafi, pytamy
  // o folder i zapisujemy do podkatalogu <caseId>; inaczej klasyczna seria pobrań.
  const downloadEach = async (files: Array<{ name: string; url?: string }>) => {
    setSeqRunning(true);
    setDlWarn(null);
    try {
      const pick = directoryPicker();
      if (pick) {
        let dir: DirHandle | null = null;
        try {
          const root = await pick({ mode: "readwrite", id: "fdsrun-results" });
          dir = await root.getDirectoryHandle(caseId, { create: true });
        } catch {
          // Anulowany wybór folderu = rezygnacja z pobierania, nie powód do fallbacku.
          setDlMsg(null);
          return;
        }
        try {
          await saveToFolder(files, dir);
          return;
        } catch (err) {
          // Najczęściej CORS magazynu albo brak miejsca — kończymy klasycznie.
          console.error("saveToFolder:", err);
          setDlWarn(t("results.folderFailed"));
        }
      }
      await clickEach(files);
    } finally {
      setSeqRunning(false);
    }
  };

  // Paczka ZIP pakowana strumieniowo po stronie serwera: magazyn → funkcja →
  // przeglądarka. Musi zmieścić się w maxDuration funkcji, stąd limit na paczkę
  // i możliwość podzielenia wyników na mniejsze (route pilnuje tego samego progu).
  const packageHref = (names: string[], opts?: { probe?: boolean; part?: number; parts?: number }) => {
    const q = new URLSearchParams();
    if (names.length) q.set("files", names.join(","));
    if (opts?.probe) q.set("probe", "1");
    if (opts?.part && opts?.parts && opts.parts > 1) {
      q.set("part", String(opts.part));
      q.set("parts", String(opts.parts));
    }
    const s = q.toString();
    return `/api/symulacje/${caseId}/download-zip${s ? `?${s}` : ""}`;
  };

  // Paczka ZIP. Domyślnie pakowana W PRZEGLĄDARCE: pliki lecą wprost z magazynu,
  // archiwum powstaje po drodze i idzie strumieniem na dysk, więc nie przechodzi
  // przez nasze funkcje ani przez ich limit czasu. Serwerowe pakowanie zostaje
  // dla przeglądarek bez zapisu strumieniowego (dziś: innych niż Chrome/Edge).
  const downloadPackage = async (
    files: Array<{ name: string; url?: string; size: number | null }>,
    part?: number,
    parts?: number
  ) => {
    const zipName = part && parts && parts > 1 ? `${caseId}_cz${part}z${parts}.zip` : `${caseId}.zip`;
    setDlWarn(null);

    // Okno „zapisz jako" musi otworzyć się w geście użytkownika — stąd przed
    // pierwszym `await` w tej funkcji.
    const picker = saveFilePicker();
    if (picker) {
      let handle: WritableFileHandle | null = null;
      try {
        handle = await picker({
          suggestedName: zipName,
          types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
        });
      } catch {
        // Anulowany wybór pliku = rezygnacja, nie powód do pakowania na serwerze.
        setDlMsg(null);
        return;
      }
      setSeqRunning(true);
      try {
        await streamZipToFile({
          caseId,
          files,
          handle,
          onProgress: (i, n) => setDlMsg(t("results.zippingLocal", { i, n })),
        });
        setDlMsg(t("results.zippedLocal", { name: zipName }));
        setTimeout(() => setDlMsg(null), 10000);
        return;
      } catch (err) {
        console.error("zip w przeglądarce:", err);
        setDlWarn(t("results.zipLocalFailed"));
        // Schodzimy na paczkę z serwera — działa, tylko przez nasz origin.
      } finally {
        setSeqRunning(false);
      }
    }

    // ── Zejście awaryjne: paczka składana przez funkcję serwerową ────────────
    // Najpierw pytamy route, czy paczkę da się spakować (?probe=1). Kotwica nie widzi
    // kodu odpowiedzi — bez tego JSON z błędem wylądowałby na dysku jako „.zip”.
    setDlMsg(t("results.preparingZip"));
    const names = files.map((f) => f.name);
    let ok = false;
    try {
      ok = (await fetch(packageHref(names, { probe: true }))).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setDlWarn(t("results.zipUnavailable"));
      await downloadEach(files);
      return;
    }
    const a = document.createElement("a");
    a.href = packageHref(names, { part, parts });
    // Nazwę pliku i tak narzuca Content-Disposition; atrybut jest zabezpieczeniem
    // przed nawigacją do treści błędu, gdyby route wywrócił się po przejściu probe.
    a.download = part && parts && parts > 1 ? `${caseId}_cz${part}z${parts}.zip` : `${caseId}.zip`;
    a.click();
    setTimeout(() => setDlMsg(null), 5000);
  };

  // Podział na paczki mieszczące się w wybranym rozmiarze — lista pod przyciskami.
  const packages = splitIntoPackages(allFiles, pkgTarget);

  const downloadPart = (files: typeof allFiles, part: number, parts: number) => {
    // Pojedynczy plik (także większy od limitu paczki) leci wprost z magazynu —
    // pakowanie nic by nie dało, a przeszłoby przez funkcję.
    if (files.length === 1) { downloadFile(files[0]); return; }
    void downloadPackage(files, part, parts);
  };

  // Pobranie zestawu plików — jedno archiwum ze wszystkim.
  //
  // Paczkę składa przeglądarka, a pliki lecą wprost z magazynu, więc nic nas to
  // nie kosztuje i nie ma powodu, żeby użytkownik dostawał kilkaset osobnych
  // pobrań. Tam, gdzie zapisu strumieniowego nie ma, pakowanie musiałoby pójść
  // przez funkcję serwerową — wtedy lepiej oddać pliki wprost z magazynu, bez
  // paczki, niż zapłacić za wygodę podwójnym transferem.
  const downloadMany = (files: Array<{ name: string; url?: string; size: number | null }>) => {
    if (files.length === 0) return;
    if (files.length === 1) { downloadFile(files[0]); return; }
    // saveFilePicker() musi zostać wywołany w geście użytkownika — stąd bez await.
    if (saveFilePicker()) { void downloadPackage(files); return; }
    void downloadEach(files);
  };

  // ── Stany brzegowe ──────────────────────────────────────────────────────────
  if (error === "not_found") return (
    <Shell width="xl">
      <div className="py-16 text-center">
        <p className="mb-6 select-none font-heading text-fr-hero leading-none text-hairline">404</p>
        <h2 className="mb-2 font-heading text-fr-h3 text-ink">{t("notFound.title")}</h2>
        <p className="mb-2 text-fr-body text-muted">{t("notFound.body", { caseId })}</p>
        <p className="mb-8 text-fr-sm text-muted">{t("notFound.hint")}</p>
        <div className="flex items-center justify-center gap-3">
          <BtnLink href="/symulacje/historia">{t("notFound.history")}</BtnLink>
          <BtnLink href="/symulacje/nowa" variant="secondary">{t("notFound.newJob")}</BtnLink>
        </div>
      </div>
    </Shell>
  );

  if (error === "connection") return (
    <Shell width="xl">
      <Notice tone="primary" title={t("conn.title")} actions={<BtnLink href="/symulacje" variant="secondary" size="sm">{t("conn.back")}</BtnLink>}>
        <p>{t("conn.body")}</p>
      </Notice>
    </Shell>
  );

  if (!job) return (
    <Shell width="xl">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </Shell>
  );

  const fatalErr = hasFatalFdsError(job.fdsLog);
  const isRunning = job.status === "running";
  const effectiveFailed = job.status === "failed" || (isRunning && fatalErr);
  const displayStatus = effectiveFailed ? "failed" : job.status;

  const cfg = STATUS_STYLE[displayStatus];
  const statusLabel = t(`status.${displayStatus}.label`);
  const statusDesc = t(`status.${displayStatus}.desc`);
  const isActive = (job.status === "running" || job.status === "dispatched") && !fatalErr;
  const canCancel = ["pending", "dispatched", "running"].includes(job.status);
  const isTerminal = ["done", "failed", "cancelled"].includes(job.status);

  // Wspólny styl kart sekcji — spójna otoczka w całej stronie
  const cardCls = "rounded-card border border-hairline bg-panel";

  // ── Dane konsoli zlecenia ──────────────────────────────────────────────
  // Strona główna obiecuje konkretny pulpit; tu podajemy go z prawdziwymi
  // danymi, tym samym komponentem `Console`.
  const cStats = job.fdsLog ? parseFdsStats(job.fdsLog) : null;
  const cProg  = job.fdsLog ? parseFdsProgress(job.fdsLog, job.tEnd) : null;
  const cElapsedSec = job.startedAt
    ? ((job.status === "done" && job.completedAt ? new Date(job.completedAt) : new Date()).getTime()
        - new Date(job.startedAt).getTime()) / 1000
    : null;

  // Jeden model postępu dla całej strony: konsola u góry i sekcja „Postęp
  // obliczeń" niżej muszą pokazywać ten sam procent i ten sam pozostały czas —
  // dwie osobne arytmetyki rozjechałyby się przy pierwszej zmianie.
  //
  // Zanim FDS zapisze pierwszy krok, postęp da się tylko oszacować z czasu
  // pracy względem wyceny. Taki szacunek nie dobija do 100%, żeby pasek nie
  // twierdził, że jest po wszystkim, kiedy solver dopiero się rozkręca.
  const cWallEstPct = job.status !== "done" && !cProg && cElapsedSec !== null && job.wallHours > 0
    ? Math.min(90, (cElapsedSec / (job.wallHours * 3600)) * 100)
    : null;
  const cPct = job.status === "done" ? 100 : (cProg?.pct ?? cWallEstPct);
  const cIsEstimate = job.status !== "done" && !cProg && cWallEstPct !== null;
  const cRemSec = job.status === "done" ? null : remainingSec(cPct, cElapsedSec);
  const cEta = cRemSec !== null
    ? new Date(Date.now() + cRemSec * 1000).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" })
    : null;
  const clock = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" }) : "—";

  // Etapy zlecenia — te same, które wcześniej stały w osobnym bloku osi.
  const cStages = ([
    { key: "pending",    label: t("timeline.accepted"),     time: null as string | null },
    { key: "dispatched", label: t("timeline.serverUp"),     time: job.dispatchedAt },
    { key: "running",    label: t("timeline.fds"),          time: job.startedAt },
    { key: "done",       label: t("timeline.resultsReady"), time: job.completedAt },
  ]).map((st) => {
    const order = ["pending", "dispatched", "running", "done", "failed"];
    const si = order.indexOf(st.key);
    const ci = order.indexOf(job.status);
    const done = si < ci || (st.key === "done" && job.status === "done");
    const active = st.key === job.status;
    return {
      ...st,
      state: (job.status === "failed" && si === ci ? "warn" : done ? "ok" : active ? "warn" : "idle") as "ok" | "warn" | "idle",
      display: st.time
        ? new Date(st.time).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" })
        : done ? "OK" : active ? "…" : "—",
    };
  });

  const cLog = consoleLogEntries(job.fdsLog);

  return (
    <Shell width="xl">
      <div className="space-y-8" suppressHydrationWarning>

          {/* Nagłówek — kicker w mono nad nazwą pliku, identyfikator i maszyna
              jako odczyt techniczny, status po prawej. Układ jak na pozostałych
              stronach chmury. */}
          <div>
            <Link
              href="/symulacje"
              className="inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-muted transition-colors hover:text-accent"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {t("back")}
            </Link>

            <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
              <div className="min-w-0">
                <span className="mb-2 block font-mono text-fr-label uppercase text-muted">
                  FDSRUN // ZLECENIE
                </span>
                <h1 className="truncate font-heading text-fr-h2 text-ink">{job.fileName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-fr-sm text-muted">
                  <span className="text-ink">{job.caseId}</span>
                  {job.serverLabel && (
                    <span className="inline-flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {job.serverLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex shrink-0 items-center gap-2 rounded-chip border px-3 py-1.5 font-mono text-fr-label uppercase ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {statusLabel}
              </div>
            </div>
          </div>

          {/* ── Konsola zlecenia ──────────────────────────────────────────
              Ten sam komponent, którym strona główna pokazuje, jak wygląda
              praca z FDSRun — tu wypełniony realnymi danymi zlecenia. */}
          <Console
            className="h-[460px] md:h-[560px]"
            title={`${t("console.chart")} // ${cStats?.chid ?? job.fileName.replace(/\.fds$/i, "")}`}
            meta={statusLabel}
            left={
              <>
                <ConsoleHead label={t("console.caseId")} value={job.caseId} live={isRunning} />
                {/* Szyna odpowiada na trzy pytania czekającego, w tej kolejności:
                    ile już zrobione, kiedy odbiorę, ile zapłacę. Parametry
                    solvera (krok, komórki, siatki) schodzą do stopki — są
                    dowodem, że model liczy się tak, jak zamówiono, ale nikt na
                    ich podstawie niczego nie decyduje. */}
                <div className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
                  <ConsoleProgress
                    label={t("console.progress")}
                    pct={cPct}
                    done={job.status === "done"}
                    sub={
                      job.status === "done"
                        ? t("console.simAt", { cur: String(job.tEnd), end: String(job.tEnd) })
                        : cProg
                        ? t("console.simAt", { cur: cProg.currentTime.toFixed(0), end: String(job.tEnd) })
                        : cIsEstimate
                        ? t("console.pctEstimate")
                        : t("console.beforeStart")
                    }
                  />
                  {isTerminal ? (
                    <ConsoleMetric
                      label={t("console.totalTime")}
                      value={elapsed(job.dispatchedAt, job.completedAt)}
                      sub={job.completedAt ? t("console.finishedAt", { time: clock(job.completedAt) }) : undefined}
                    />
                  ) : (
                    <ConsoleMetric
                      label={t("console.remaining")}
                      value={cRemSec !== null ? `${cIsEstimate ? "~" : ""}${splitDuration(cRemSec).value}` : "—"}
                      unit={cRemSec !== null ? splitDuration(cRemSec).unit : undefined}
                      sub={
                        cEta
                          ? t("console.etaAt", { time: cEta })
                          : job.wallHours > 0
                          ? t("console.estWall", { v: mins(job.wallHours) })
                          : undefined
                      }
                    />
                  )}
                  <ConsoleMetric
                    label={t("console.cost")}
                    value={money(job.price)}
                    tone="text-accent"
                    sub={t("console.costNote")}
                  />
                </div>
                <ConsoleNote>
                  {[
                    t("console.cellsNote", { v: formatCells(job.totalCells, t("tiles.thousands")) }),
                    job.meshCount ? t("console.meshesNote", { n: job.meshCount }) : null,
                    cStats?.stepSize != null ? t("console.stepNote", { v: formatDt(cStats.stepSize) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </ConsoleNote>
              </>
            }
            right={
              <>
                <ConsoleReadings
                  devcCsv={finalCsv.devc ?? job.devcCsv}
                  hrrCsv={finalCsv.hrr ?? job.hrrCsv}
                  setpoints={job.devcSetpoints}
                  fallbackTitle={t("timeline.title")}
                  fallback={
                    <div className="flex flex-col gap-4">
                      {cStages.map((st) => (
                        <ConsoleRow key={st.key} label={st.label} value={st.display} state={st.state} />
                      ))}
                    </div>
                  }
                />
                <ConsolePane title={t("console.log")} badge={isRunning ? t("console.live") : undefined} deep>
                  {cLog.length ? (
                    <ConsoleLog entries={cLog} />
                  ) : (
                    <p className="font-mono text-fr-sm text-muted">{t("console.noLog")}</p>
                  )}
                </ConsolePane>
              </>
            }
          >
            <ConsoleChart devcCsv={finalCsv.devc ?? job.devcCsv} hrrCsv={finalCsv.hrr ?? job.hrrCsv} />
          </Console>

          {/* Karta statusu */}
          <div className={`rounded-card border p-5 md:p-6 ${cfg.bg} ${cfg.border}`}>
            <p className={`font-heading text-fr-h4 ${cfg.color}`}>{statusDesc}</p>
            {isActive && job.dispatchedAt && (
              <p className="mt-2 font-mono text-fr-sm text-muted">
                {t("card.sinceAccepted")} <span className="font-bold text-ink">{elapsed(job.dispatchedAt)}</span>
                {job.status === "running" && job.startedAt && (
                  <span className="ml-3">· {t("card.fdsSince")} <span className="font-bold text-ink">{elapsed(job.startedAt)}</span></span>
                )}
                {/* Gdy obliczenia przekroczyły wycenę, pokazywanie jej dalej jako
                    obowiązującej wprowadza w błąd — zlecenie liczące 31 h przy
                    wycenie 18 h wygląda wtedy, jakby coś było zepsute. Prognoza
                    z realnego tempa jest wiarygodna, a wycena zostaje obok,
                    wyraźnie opisana jako wycena. */}
                {cRemSec !== null && cElapsedSec !== null ? (
                  <span className="ml-3">
                    · {t("card.predicted")}{" "}
                    <span className="font-bold text-ink">{formatDuration(cElapsedSec + cRemSec)}</span>
                    {job.wallHours > 0 && (
                      <span className="ml-1.5 text-faint">{t("card.vsQuote", { v: mins(job.wallHours) })}</span>
                    )}
                  </span>
                ) : job.wallHours > 0 ? (
                  <span className="ml-2 text-muted">/ {t("card.estimated")} {mins(job.wallHours)}</span>
                ) : null}
              </p>
            )}
            {job.status === "done" && job.completedAt && job.dispatchedAt && (
              <p className="mt-2 font-mono text-fr-sm text-muted">
                {t("card.totalTime")}{" "}
                <span className="font-bold text-ink">{elapsed(job.dispatchedAt, job.completedAt)}</span>
              </p>
            )}
            {job.serverLabel && (
              <p className="mt-2 font-mono text-fr-sm text-muted">
                {t("card.machine")} <span className="font-bold text-ink">{job.serverLabel}</span>
                <span className="ml-1 text-faint">{t("card.machineNote")}</span>
              </p>
            )}
          </div>

          {/* Akcje */}
          {(canCancel || isTerminal) && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {isRunning && !fatalErr && (
                  job.stopRequested ? (
                    <span className="flex items-center gap-1.5 rounded-panel border border-warn/40 bg-warn/[0.07] px-4 py-2 text-fr-body font-semibold text-warn">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      {t("actions.stopping")}
                    </span>
                  ) : confirmCancel ? (
                    <div className="flex items-center gap-2 rounded-panel border border-warn/40 bg-warn/[0.07] px-3 py-2 flex-wrap">
                      <span className="text-fr-body font-semibold text-ink">{t("actions.confirmStopQ")}</span>
                      <Btn onClick={handleStop} disabled={stopping} variant="warn" size="sm">
                        {stopping ? t("actions.stopping") : t("actions.yesStop")}
                      </Btn>
                      <Btn onClick={() => setConfirmCancel(false)} disabled={stopping} variant="ghost" size="sm">
                        {t("actions.no")}
                      </Btn>
                    </div>
                  ) : (
                    <Btn onClick={() => { setConfirmCancel(true); setConfirmDelete(false); }} variant="warn">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2z" /></svg>
                      {t("actions.stop")}
                    </Btn>
                  )
                )}

                {confirmDelete ? (
                  <div className="flex flex-col gap-2 rounded-panel border border-primary/50 bg-primary/[0.07] px-4 py-3 w-full">
                    <p className="text-fr-body font-semibold text-ink">
                      {canCancel ? t("actions.confirmDeleteActive") : t("actions.confirmDelete")}
                    </p>
                    <p className="text-fr-sm text-muted">
                      {canCancel ? t("actions.deleteActiveBody") : t("actions.deleteBody")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Btn onClick={handleDelete} disabled={deleting} size="sm">
                        {deleting ? t("actions.deleting") : canCancel ? t("actions.yesStopDelete") : t("actions.yesDelete")}
                      </Btn>
                      <Btn onClick={() => setConfirmDelete(false)} disabled={deleting} variant="ghost" size="sm">
                        {t("actions.cancel")}
                      </Btn>
                    </div>
                  </div>
                ) : (
                  <Btn onClick={() => { setConfirmDelete(true); setConfirmCancel(false); }} variant="danger">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {canCancel ? t("actions.stopAndDelete") : t("actions.deleteJob")}
                  </Btn>
                )}
              </div>

              {!confirmDelete && !confirmCancel && !job.stopRequested && (
                <ul className="text-fr-sm leading-relaxed text-muted space-y-1">
                  {isRunning && !fatalErr && (
                    <li>
                      <span className="font-semibold text-warn">{t("actions.annStopBold")}</span> — {t("actions.annStop")}
                    </li>
                  )}
                  <li>
                    <span className="font-semibold text-accent">{canCancel ? t("actions.stopAndDelete") : t("actions.deleteJob")}</span> — {t("actions.annDelete")}
                    {canCancel && ` ${t("actions.annDeleteActive")}`}
                  </li>
                </ul>
              )}

              {isRunning && job.stopRequested && (
                <div className="rounded-panel border border-warn/30 bg-warn/[0.07] p-4 flex items-start gap-3">
                  <svg className="h-5 w-5 text-warn shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <p className="text-fr-body font-semibold text-ink">{t("actions.softStopTitle")}</p>
                    <p className="text-fr-sm text-muted mt-1">{t("actions.softStopBody")}</p>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ── 01 · Plik wejściowy i wycena ───────────────────────────── */}
          <Section
            index="01"
            kicker={t("sec.inputKicker")}
            title={t("sec.inputTitle")}
            hint={t("sec.inputHint")}
          >
            <Plate className="p-6 md:p-8" dots>
              <SpecGrid>
                <Spec label={t("tiles.file")} value={<span className="font-mono text-fr-h4">{job.fileName}</span>} hint={cStats?.chid ? `CHID: ${cStats.chid}` : undefined} />
                <Spec label={t("tiles.cells")} value={formatCells(job.totalCells, t("tiles.thousands"))} hint={job.meshCount ? t("sec.meshes", { n: job.meshCount }) : undefined} />
                <Spec label={t("tiles.simTime")} value={String(job.tEnd)} unit="s" hint={t("sec.simTimeHint")} />
                <Spec label={t("tiles.netPrice")} value={money(job.price)} tone="text-accent" hint={t("sec.priceHint")} />
              </SpecGrid>
            </Plate>
          </Section>

          {/* ── 02 · Dobrana maszyna ───────────────────────────────────── */}
          <Section
            index="02"
            kicker={t("sec.machineKicker")}
            title={t("sec.machineTitle")}
            hint={t("sec.machineHint")}
          >
            <Plate className="p-6 md:p-8">
              <SpecGrid>
                <Spec label={t("tiles.machine")} value={job.serverLabel ?? "—"} hint={t("sec.provider")} />
                <Spec
                  label={t("sec.cores")}
                  value={job.serverCores ?? "—"}
                  unit="vCPU"
                  hint={
                    job.mpiProcs && job.meshCount && job.meshCount > job.mpiProcs
                      ? t("sec.coresSplitHint", {
                          procs: job.mpiProcs,
                          meshes: Math.ceil(job.meshCount / job.mpiProcs),
                        })
                      : job.meshCount
                      ? t("sec.coresHint", { n: job.meshCount })
                      : undefined
                  }
                />
                <Spec label={t("tiles.vcpuHours")} value={job.vcpuHours.toFixed(1)} unit="h" hint={t("sec.vcpuHint")} />
                <Spec label={t("sec.estWall")} value={job.wallHours > 0 ? mins(job.wallHours) : "—"} hint={t("sec.estWallHint")} />
              </SpecGrid>
            </Plate>
          </Section>

          {/* Postęp i logi */}
          {(job.status === "running" || job.status === "done" || job.status === "failed") && (() => {
            // Postęp, procent i prognoza pochodzą z modelu policzonego raz, na
            // potrzeby konsoli u góry strony — tutaj są tylko inaczej podane.
            // Dwie kopie tej arytmetyki potrafiłyby pokazać dwa różne „zostało”.
            const isDone      = job.status === "done";
            const stats       = cStats;
            const fdsProgress = cProg;
            const elapsedSec  = cElapsedSec;
            const displayPct  = cPct;
            const isEstimate  = cIsEstimate;
            const remainingStr = cRemSec === null
              ? "—"
              : `${isEstimate ? "~" : ""}${formatDuration(cRemSec)}`;

            const logTail = job.fdsLog
              ? job.fdsLog.split("\n").filter((l) => l.trim() && !/^\[?\d{2}:\d{2}:\d{2}\]?/.test(l)).slice(-6).join("\n")
                || job.fdsLog.split("\n").filter(Boolean).slice(-6).join("\n")
              : null;

            return (
              <Section
                index="03"
                kicker={t("sec.progressKicker")}
                title={t("progress.title")}
                hint={t("sec.progressHint")}
                actions={
                  <>
                    {job.status === "running" && (
                      <span className="font-mono text-fr-label uppercase text-muted">{t("progress.refresh")}</span>
                    )}
                    {(["basic", "advanced"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setLogMode(mode)}
                        className={`rounded-chip border px-3 py-1.5 font-mono text-fr-label uppercase transition-colors ${
                          logMode === mode
                            ? "border-primary/40 bg-primary/10 text-accent"
                            : "border-hairline text-muted hover:text-ink"
                        }`}
                      >
                        {mode === "basic" ? t("progress.basic") : t("progress.advanced")}
                      </button>
                    ))}
                  </>
                }
              >
              <Plate>

                {logMode === "basic" ? (
                  <div className="space-y-5 p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: t("progress.duration"), value: elapsedSec != null ? (elapsedSec < 60 ? `${Math.round(elapsedSec)} s` : elapsedSec < 3600 ? `${Math.floor(elapsedSec / 60)} min` : `${(elapsedSec / 3600).toFixed(1)} h`) : "—" },
                        { label: t("progress.simProgress"), value: isDone ? `${job.tEnd} / ${job.tEnd} s` : fdsProgress ? `${fdsProgress.currentTime.toFixed(2)} / ${job.tEnd} s` : job.status === "running" ? t("progress.fdsInit") : "—" },
                        { label: isEstimate ? t("progress.doneEst") : t("progress.doneLabel"), value: displayPct != null ? `${displayPct.toFixed(1)}%` : "—" },
                        { label: t("progress.remaining"), value: isDone ? t("progress.finished") : remainingStr },
                      ].map((item) => (
                        <div key={item.label} className="rounded-panel border border-hairline-soft bg-canvas px-4 py-3">
                          <p className="mb-1.5 font-mono text-fr-label uppercase text-muted">{item.label}</p>
                          <p className="fr-num font-heading text-fr-h4 text-ink">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {displayPct != null && (
                      <div>
                        <div className="h-3 w-full rounded-full bg-panel-deep overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-signal" : fdsProgress ? "bg-primary" : "bg-muted"}`} style={{ width: `${displayPct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-fr-sm font-mono text-muted">
                          <span>0 s</span>
                          <span className="text-faint italic">{isEstimate ? t("progress.estProgress") : ""}</span>
                          <span>{job.tEnd} s</span>
                        </div>
                      </div>
                    )}

                    {stats && (stats.version || stats.currentStep != null || job.meshCount != null) && (() => {
                      const estimatedTotalSec = !isDone && fdsProgress && elapsedSec && fdsProgress.pct > 2 ? elapsedSec / (fdsProgress.pct / 100) : null;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: t("progress.fdsVersion"), value: stats.version ?? "—" },
                            { label: t("progress.chid"), value: stats.chid ?? "—" },
                            { label: t("progress.timestep"), value: stats.currentStep != null ? `#${stats.currentStep}` : "—" },
                            { label: t("progress.dtStep"), value: formatDt(stats.stepSize) },
                            { label: t("progress.predTime"), value: isDone ? t("progress.finished") : estimatedTotalSec ? formatDuration(estimatedTotalSec) : "—" },
                            { label: t("progress.mpiMeshes"), value: (stats.meshCount ?? job.meshCount) != null ? String(stats.meshCount ?? job.meshCount) : "—" },
                            { label: t("progress.cells"), value: (stats.totalCells ?? job.totalCells) != null ? (stats.totalCells ?? job.totalCells)!.toLocaleString(numLocale) : "—" },
                            { label: t("progress.fdsStart"), value: stats.startTime ?? "—" },
                          ].map((item) => (
                            <div key={item.label} className="rounded-panel border border-hairline-soft bg-canvas px-3 py-2.5">
                              <p className="mb-1 font-mono text-fr-label uppercase text-muted">{item.label}</p>
                              <p className="truncate font-mono text-fr-sm font-semibold text-ink">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {logTail && (
                      <div>
                        <p className="mb-2 font-mono text-fr-label uppercase text-muted">{t("progress.lastEvents")}</p>
                        <div className="rounded-panel bg-well p-3"><pre className="text-fr-sm font-mono text-signal leading-relaxed whitespace-pre-wrap">{logTail}</pre></div>
                      </div>
                    )}

                    {!job.fdsLog && job.status === "running" && (
                      <p className="text-fr-sm text-muted text-center py-2">{t("progress.waitingFirst")}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    <div ref={termRef} className="rounded-panel bg-well p-3 text-fr-sm font-mono text-signal leading-relaxed whitespace-pre-wrap break-all" style={{ height: "480px", overflowY: "scroll" }}
                      onScroll={(e) => { const el = e.currentTarget; termScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 60; }}>
                      {job.fdsLog ?? t("progress.waitingData")}
                    </div>
                  </div>
                )}
              </Plate>
              </Section>
            );
          })()}

          {/* ── 04 · Wykresy i podgląd ─────────────────────────────────── */}
          {(job.status === "running" || job.status === "done" || job.status === "failed") && (
            <Section
              index="04"
              kicker={t("sec.chartsKicker")}
              title={t("sec.chartsTitle")}
              hint={t("sec.chartsHint")}
            >
              <div className="space-y-4">
                <SliceView slice={job.sliceJson} running={isRunning && !fatalErr} caseId={job.caseId} finished={finished} fileUrl={fileUrlByName} />
                <LiveCharts devcCsv={finalCsv.devc ?? job.devcCsv} hrrCsv={finalCsv.hrr ?? job.hrrCsv} setpoints={job.devcSetpoints} running={isRunning && !fatalErr} />
              </div>
            </Section>
          )}
          {/* Wyniki częściowe — pobieranie W TRAKCIE obliczeń, bez zatrzymywania */}
          {(job.status === "running" || job.status === "dispatched") && (() => {
            const snapPct = snapshot && job.tEnd > 0
              ? Math.max(0, Math.min(100, (snapshot.t / job.tEnd) * 100))
              : null;
            return (
              <div className={cardCls}>
                <div className="px-5 pt-4 pb-3 border-b border-hairline-soft">
                  <span className="font-mono text-fr-micro uppercase text-faint">{t("partial.title")}</span>
                  <p className="mt-0.5 text-fr-sm text-muted">{t("partial.lead")}</p>
                </div>

                <div className="space-y-5 p-6">
                  {/* Akcje */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Btn onClick={() => downloadMany(partial)} disabled={partial.length === 0 || seqRunning}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {t("partial.downloadAll")}
                      {partialSize ? <span className="font-semibold text-white/75">({partialSize.label})</span> : null}
                    </Btn>
                    <Btn onClick={loadPartial} disabled={partialLoading} variant="secondary" size="sm">
                      <svg className={`h-3.5 w-3.5 ${partialLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {partialLoading ? t("partial.syncing") : t("partial.sync")}
                    </Btn>
                    {partialAt && (
                      <span className="font-mono text-fr-sm text-faint">
                        {t("partial.syncedAt", {
                          time: partialAt.toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" }),
                        })}
                      </span>
                    )}
                  </div>

                  {/* Zakres: do jakiego czasu symulacji sięgają te wyniki */}
                  {partial.length === 0 ? (
                    <p className="py-2 text-fr-sm text-muted">
                      {partialLoading
                        ? t("partial.loading")
                        : partialAt
                        ? t("partial.empty")
                        : t("partial.notSynced")}
                    </p>
                  ) : (
                    <div className="rounded-panel border border-hairline-soft bg-canvas px-4 py-3">
                      {snapshot ? (
                        <>
                          <p className="text-fr-sm font-semibold text-ink">
                            {t("partial.coverage", {
                              t: snapshot.t.toFixed(1),
                              tEnd: job.tEnd,
                              pct: snapPct != null ? snapPct.toFixed(0) : "—",
                            })}
                          </p>
                          {snapPct != null && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${snapPct}%` }} />
                            </div>
                          )}
                          <p className="mt-1.5 text-fr-sm text-muted">
                            {snapshot.at
                              ? `${t("partial.snapAt", { time: new Date(snapshot.at).toLocaleTimeString(numLocale, { hour: "2-digit", minute: "2-digit" }) })} · `
                              : ""}
                            {t("partial.filesCount", { n: partial.length })}
                          </p>
                        </>
                      ) : (
                        <p className="text-fr-sm text-muted">{t("partial.coverageUnknown")}</p>
                      )}
                    </div>
                  )}

                  {/* Lista plików — zwijana, do pobrania pojedynczo */}
                  {partial.length > 0 && (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-fr-sm font-semibold text-muted transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                        <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {t("partial.showFiles", { n: partial.length })}
                      </summary>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full border-collapse text-fr-body">
                          <thead>
                            <tr className="border-b border-hairline-soft">
                              <th className="pb-2 text-left text-fr-sm font-semibold uppercase tracking-wider text-muted">{t("results.thFile")}</th>
                              <th className="hidden pb-2 pl-4 text-left text-fr-sm font-semibold uppercase tracking-wider text-muted sm:table-cell">{t("results.thType")}</th>
                              <th className="pb-2 pl-4 text-right text-fr-sm font-semibold uppercase tracking-wider text-muted">{t("results.thSize")}</th>
                              <th className="w-24 pb-2 pl-4" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline-soft">
                            {partial.map((f) => (
                              <tr key={f.name}>
                                <td className="min-w-0 max-w-[220px] py-2.5 align-middle">
                                  <div className="flex items-center gap-2">
                                    <span className="shrink-0 text-fr-body leading-none">{fileIcon(f.name)}</span>
                                    <span className="truncate font-mono text-ink">{f.name}</span>
                                  </div>
                                </td>
                                <td className="hidden whitespace-nowrap py-2.5 pl-4 align-middle text-fr-sm text-muted sm:table-cell">{t(`fileType.${fileTypeKey(f.name)}`)}</td>
                                <td className="whitespace-nowrap py-2.5 pl-4 text-right align-middle font-mono text-fr-sm text-muted">{formatSize(f.size)}</td>
                                <td className="py-2.5 pl-4 text-right align-middle">
                                  <Btn onClick={() => downloadFile(f)} variant="secondary" size="sm">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    {t("results.download")}
                                  </Btn>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}

                  {dlMsg && <p className="text-fr-sm text-muted">{dlMsg}</p>}
                  {dlWarn && <p className="text-fr-sm text-warn">{dlWarn}</p>}
                  <p className="text-fr-sm leading-relaxed text-faint">{t("partial.note")}</p>
                </div>
              </div>
            );
          })()}

          {/* Gotowe, ale w logu FDS są błędy */}
          {job.status === "done" && (() => {
            const explained = explainFdsErrors(job.fdsLog, errLocale);
            if (explained.length === 0) return null;
            return (
              <div className="rounded-card border border-warn/40 bg-warn/[0.07] p-5 flex items-start gap-4">
                <svg className="h-5 w-5 text-warn shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" /></svg>
                <div className="min-w-0 w-full">
                  <p className="text-fr-body font-semibold text-ink">{t("warn.title")}</p>
                  <p className="text-fr-sm text-muted mt-1">{t("warn.body")}</p>
                  <div className="mt-3"><FdsErrorCards errors={explained} /></div>
                </div>
              </div>
            );
          })()}

          {/* ── 05 · Wyniki ────────────────────────────────────────────── */}
          {/* Także po błędzie — pliki policzone do momentu przerwania czekają w magazynie. */}
          {finished && job.results && job.results.length > 0 && (
            <Section
              index="05"
              kicker={t("sec.resultsKicker")}
              title={`${t("results.title")} (${job.results.length}${allSize ? ` · ${allSize.label}` : ""})`}
              hint={job.status === "failed" ? t("sec.resultsHintFailed") : t("sec.resultsHint")}
            >
            <div className={`rounded-card border bg-panel p-6 ${job.status === "failed" ? "border-warn/30" : "border-signal/30"}`}>
              {job.status === "failed" && (
                <div className="mb-4 rounded-panel border border-warn/40 bg-warn/[0.07] px-4 py-3">
                  <p className="text-fr-body font-semibold text-warn">{t("results.partialTitle")}</p>
                  <p className="mt-1 text-fr-sm leading-relaxed text-muted">{t("results.partialBody")}</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 mb-4">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="h-4 w-4 cursor-pointer rounded-chip border-hairline text-accent" />
                  <span className="font-mono text-fr-label uppercase text-muted">{t("results.selectAll")}</span>
                </label>
                <div className="flex items-center gap-2">
                  <Btn onClick={() => downloadMany(allFiles.filter((f) => selected.has(f.name)))} disabled={!someSelected || seqRunning} variant="secondary" size="sm">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t("results.downloadSelected")}
                    {someSelected && selectedSize ? <span className="font-normal text-muted">({selectedSize.label})</span> : null}
                  </Btn>
                  <Btn onClick={() => downloadMany(allFiles)} disabled={seqRunning} size="sm">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t("results.zipAll")}
                    {allSize ? <span className="font-normal text-white/75">({allSize.label})</span> : null}
                  </Btn>
                </div>
              </div>

              {/* Co się stanie po kliknięciu — zależy od tego, czy przeglądarka
                  umie złożyć paczkę na miejscu. */}
              <p className="mb-4 text-fr-sm leading-relaxed text-muted">
                {canZipLocally
                  ? t("results.zipHint", { name: caseId })
                  : canPickFolder
                  ? t("results.perFileFolder", { name: caseId })
                  : t("results.perFileLoose")}
              </p>

              {dlMsg && <p className="mb-1.5 text-fr-sm text-muted">{dlMsg}</p>}
              {dlWarn && <p className="mb-1.5 text-fr-sm text-warn">{dlWarn}</p>}

              {/* Archiwum ZIP — jedyna ścieżka, która przechodzi przez nasz serwer,
                  więc schowana pod rozwijanym panelem i podzielona na paczki. */}
              <details
                open={pkgOpen}
                onToggle={(e) => setPkgOpen((e.target as HTMLDetailsElement).open)}
                className="group mb-4 rounded-panel border border-hairline-soft bg-canvas px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-fr-sm font-semibold text-muted transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                  <svg className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {t("results.splitTitle")}
                </summary>

                <p className="mt-2 text-fr-sm leading-relaxed text-muted">
                  {t("results.splitLead", { name: caseId })}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-fr-sm font-semibold text-muted">{t("results.splitSize")}</span>
                  {PACKAGE_SIZE_OPTIONS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setPkgTarget(b)}
                      className={`rounded-panel border px-2.5 py-1 text-fr-sm font-semibold transition-colors ${
                        b === pkgTarget
                          ? "border-primary bg-primary text-white"
                          : "border-hairline text-muted hover:bg-panel"
                      }`}
                    >
                      {packageLabel(b)}
                    </button>
                  ))}
                </div>

                <ul className="mt-3 space-y-1.5">
                  {packages.map((part, i) => {
                    const partSize = totalSize(part);
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-panel bg-panel px-3 py-2">
                        <span className="min-w-0 text-fr-sm text-muted">
                          <span className="font-semibold">{t("results.partLabel", { i: i + 1, n: packages.length })}</span>
                          <span className="ml-1.5 text-muted">
                            {t("results.partMeta", { files: part.length, size: partSize?.label ?? "—" })}
                          </span>
                        </span>
                        <Btn
                          onClick={() => downloadPart(part, i + 1, packages.length)}
                          disabled={seqRunning}
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                        >
                          {t("results.download")}
                        </Btn>
                      </li>
                    );
                  })}
                </ul>

              </details>

              <div className="overflow-x-auto">
                <table className="w-full text-fr-body border-collapse">
                  <thead>
                    <tr className="border-b border-hairline-soft">
                      <th className="pb-2 pr-3 w-8" />
                      <th className="pb-2 text-left text-fr-sm font-semibold uppercase tracking-wider text-muted">{t("results.thFile")}</th>
                      <th className="pb-2 text-left text-fr-sm font-semibold uppercase tracking-wider text-muted pl-4 hidden sm:table-cell">{t("results.thType")}</th>
                      <th className="pb-2 text-left text-fr-sm font-semibold uppercase tracking-wider text-muted pl-4 hidden sm:table-cell">{t("results.thCreated")}</th>
                      <th className="pb-2 text-right text-fr-sm font-semibold uppercase tracking-wider text-muted pl-4">{t("results.thSize")}</th>
                      <th className="pb-2 pl-4 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-soft">
                    {visibleFiles.map((f) => (
                      <tr key={f.name} className="group">
                        <td className="py-2.5 pr-3 align-middle">
                          <input type="checkbox" checked={selected.has(f.name)} onChange={() => toggleFile(f.name)} className="h-4 w-4 rounded border-hairline text-accent cursor-pointer" />
                        </td>
                        <td className="py-2.5 align-middle min-w-0 max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-fr-body leading-none">{fileIcon(f.name)}</span>
                            <span className="font-mono text-ink truncate">{f.name}</span>
                          </div>
                          <p className="text-fr-sm text-muted mt-0.5 sm:hidden pl-6">{t(`fileType.${fileTypeKey(f.name)}`)}</p>
                        </td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-fr-sm text-muted hidden sm:table-cell">{t(`fileType.${fileTypeKey(f.name)}`)}</td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-fr-sm font-mono text-muted hidden sm:table-cell">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString(numLocale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-2.5 pl-4 align-middle whitespace-nowrap text-fr-sm font-mono text-muted text-right">{formatSize(f.size)}</td>
                        <td className="py-2.5 pl-4 align-middle text-right">
                          <Btn onClick={() => downloadFile(f)} variant="secondary" size="sm">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {t("results.download")}
                          </Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager
                page={filePageSafe}
                pages={filePages}
                total={allFiles.length}
                from={fileFrom + 1}
                to={Math.min(fileFrom + FILES_PER_PAGE, allFiles.length)}
                onPage={setFilePage}
                labelRange={t("results.range", {
                  from: fileFrom + 1,
                  to: Math.min(fileFrom + FILES_PER_PAGE, allFiles.length),
                  total: allFiles.length,
                })}
                labelPrev={t("results.prev")}
                labelNext={t("results.next")}
              />
            </div>
            </Section>
          )}

          {/* Błąd, a magazyn pusty — powiedz to wprost. Bez tego strona kończy się
              samym komunikatem o błędzie i nie wiadomo, czy pliki są, czy ich nie ma. */}
          {job.status === "failed" && (!job.results || job.results.length === 0) && (
            <div className="rounded-card border border-hairline bg-panel p-5">
              <p className="text-fr-body font-semibold text-ink">{t("results.noneTitle")}</p>
              <p className="mt-1 text-fr-sm leading-relaxed text-muted">{t("results.noneBody")}</p>
            </div>
          )}

          {/* Płatność */}
          {job.status === "done" && (
            <div className={`rounded-card border p-5 ${job.paymentStatus === "paid" ? "border-signal/30 bg-signal/[0.07]" : "border-warn/30 bg-warn/[0.07]"}`}>
              {platnosc === "sukces" && job.paymentStatus !== "paid" && (
                <p className="text-fr-sm text-warn mb-3">{t("payment.verifying")}</p>
              )}
              {platnosc === "anulowano" && (
                <p className="text-fr-sm text-accent mb-3">{t("payment.cancelledMsg")}</p>
              )}

              {job.paymentStatus === "paid" ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/15 shrink-0">
                    <svg className="h-5 w-5 text-signal" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-fr-body font-semibold text-signal">{t("payment.done")}</p>
                    <p className="mt-1 text-fr-sm text-muted">
                      {t("payment.amount")}{" "}
                      <span className="font-semibold">{money(grossAmount(job.price, invoice), true)}</span>{" "}
                      {t("payment.gross")}
                      <span className="ml-1 text-faint">
                        ({money(job.price, true)} {t("payment.net")})
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-fr-body font-semibold text-warn">{t("payment.awaiting")}</p>
                    <p className="text-fr-sm text-warn/80 mt-0.5">
                      {t("payment.toPay")}{" "}
                      <span className="font-bold">{money(grossAmount(job.price, invoice), true)}</span>{" "}
                      {t("payment.gross")}
                      <span className="ml-1 text-warn/70">
                        ({money(job.price, true)} {t("payment.net")}
                        {vatTreatment(invoice).treatment === "standard"
                          ? ` + VAT ${Math.round(vatTreatment(invoice).rate * 100)}%`
                          : ` · ${t(`payment.vat.${vatTreatment(invoice).treatment}`)}`})
                      </span>
                    </p>
                    <p className="text-fr-sm text-warn/70 mt-1">{t("payment.note")}</p>
                  </div>
                  <Btn onClick={handlePay} disabled={paying} className="shrink-0">
                    {paying ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    )}
                    {paying ? t("payment.redirecting") : t("payment.pay", { amount: money(grossAmount(job.price, invoice), true) })}
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* Anulowano */}
          {job.status === "cancelled" && (
            <div className="rounded-card border border-hairline bg-panel-deep/40 p-5 flex items-start gap-4">
              <svg className="h-5 w-5 text-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-mono text-fr-micro uppercase text-faint">{t("cancelled.title")}</p>
                <p className="text-fr-sm text-muted mt-1">{t("cancelled.body")}</p>
              </div>
            </div>
          )}

          {/* Błąd */}
          {effectiveFailed && (() => {
            const stillRunning = job.status !== "failed";
            const errLines = extractErrorLines(job.fdsLog);
            // Przyczyna przerwania — rozróżnia błąd FDS od ubicia przez nasz
            // nadzorca czasu. Wcześniej każdy „failed” dostawał treść o odrzuconym
            // pliku wejściowym, nawet gdy FDS liczył bez jednego błędu.
            const diag = diagnoseFailure(
              {
                log: job.fdsLog,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                wallHours: job.wallHours,
                tEnd: job.tEnd,
                lastProgressAt: job.lastProgressAt,
              },
              errLocale
            );
            const explained = diag.errors;
            return (
              <div className="rounded-card border border-primary/40 bg-primary/[0.07] p-5 flex items-start gap-4">
                <svg className="h-5 w-5 text-accent shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="min-w-0 w-full">
                  <p className="text-fr-body font-semibold text-accent">
                    {t(`failed.kind.${diag.kind}.title`)}
                  </p>
                  <p className="text-fr-sm text-muted mt-1">
                    {diag.kind === "watchdog" && diag.stall
                      ? t("failed.kind.watchdog.bodyStall", {
                          stalled: diag.stall.stalledH.toFixed(1),
                          at: diag.progress ? diag.progress.t.toFixed(1) : "—",
                        })
                      : diag.kind === "watchdog" && diag.timing
                      ? t("failed.kind.watchdog.body", {
                          elapsed: diag.timing.elapsedH.toFixed(1),
                          limit: diag.timing.limitH.toFixed(1),
                          estimated: diag.timing.estimatedH.toFixed(1),
                        })
                      : t(`failed.kind.${diag.kind}.body`)}
                    {stillRunning && ` ${t("failed.serverFinishing")}`}
                    {job.fdsExitCode != null && <> {" "}{t("failed.exitCode", { code: job.fdsExitCode })}</>}
                  </p>

                  {/* Dokąd doszły obliczenia — bez tego „przerwane” nie mówi,
                      czy zginęła cała symulacja, czy zabrakło ostatnich sekund. */}
                  {diag.progress && (
                    <div className="mt-3 rounded-panel border border-hairline-soft bg-canvas px-4 py-3">
                      <p className="text-fr-sm font-semibold text-ink">
                        {t("failed.reached", {
                          t: diag.progress.t.toFixed(1),
                          tEnd: diag.progress.tEnd,
                          pct: diag.progress.pct.toFixed(1),
                        })}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${diag.progress.pct}%` }} />
                      </div>
                      {job.results && job.results.length > 0 && (
                        <p className="mt-1.5 text-fr-sm text-muted">{t("failed.reachedNote")}</p>
                      )}
                    </div>
                  )}

                  {explained.length > 0 && (
                    <div className="mt-3">
                      <p className="text-fr-sm font-semibold text-accent mb-2">{t("failed.whatMeans")}</p>
                      <FdsErrorCards errors={explained} />
                    </div>
                  )}

                  {errLines.length > 0 && (
                    <details className="mt-3" open={explained.length === 0}>
                      <summary className="text-fr-sm font-medium text-muted cursor-pointer select-none">{t("failed.rawConsole")}</summary>
                      <div className="mt-2 rounded-panel bg-well p-3 max-h-56 overflow-auto"><pre className="text-fr-sm font-mono text-accent leading-relaxed whitespace-pre-wrap break-all">{errLines.join("\n")}</pre></div>
                    </details>
                  )}

                  <p className="text-fr-sm text-muted mt-3">
                    {t("failed.noCharge")}{" "}
                    <a href="mailto:biuro@fp-solutions.pl" className="underline">biuro@fp-solutions.pl</a>
                  </p>
                </div>
              </div>
            );
          })()}

      </div>
    </Shell>
  );
}
