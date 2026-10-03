"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ACCESS_NOTE_MAX, type AccessState } from "@/lib/access";
import { useAccess } from "@/components/Cloud/AccessProvider";
import { Btn, btnCls, inputCls, labelCls } from "@/components/Cloud/ui";

// Co widzi klient, który poznał już cenę, ale nie może (jeszcze) uruchomić.
//
// Wcześniej w tym miejscu stał jeden panel „dostęp ograniczony" z adresem
// e-mail i numerem telefonu — dla WSZYSTKICH poza właścicielem. Lejek kończył
// się więc poza produktem: gość nie dowiadywał się nawet, że może założyć
// konto, a zalogowany klient nie miał jak poprosić o dostęp inaczej niż mailem,
// po którym nie zostawał ślad w panelu.
//
// Teraz każdy stan ma własne, jedno oczywiste następne kliknięcie.

const MAIL = "biuro@fp-solutions.pl";
const PHONE = "+48790782993";
const PHONE_LABEL = "+48 790 782 993";

function GatePanel({
  title, lead, children,
}: { title: string; lead: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-primary/25 bg-primary/[0.06] p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-primary/10 text-accent">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-fr-body font-bold text-ink">{title}</p>
          <p className="mt-1 text-fr-body leading-relaxed text-muted">{lead}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function ContactLinks({ emailCta, phoneCta }: { emailCta: string; phoneCta: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <a href={`mailto:${MAIL}`} className={btnCls("primary")}>{emailCta}</a>
      <a href={`tel:${PHONE}`} className={btnCls("secondary")}>{phoneCta} {PHONE_LABEL}</a>
    </div>
  );
}

/** Gość bez sesji: wycena już jest, brakuje konta. */
function AnonGate() {
  const t = useTranslations("symulacje.gate");
  return (
    <GatePanel title={t("anon.title")} lead={t("anon.lead")}>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* `next` sprowadza klienta dokładnie tam, skąd wyszedł. */}
        <Link href="/signup?next=/symulacje/nowa" className={btnCls("primary")}>
          {t("anon.signUp")}
        </Link>
        <Link href="/signin?next=/symulacje/nowa" className={btnCls("secondary")}>
          {t("anon.signIn")}
        </Link>
      </div>
      <p className="mt-3 font-mono text-fr-sm text-muted">{t("anon.keep")}</p>
    </GatePanel>
  );
}

/** Zalogowany, jeszcze bez zgody właściciela — prośba idzie z produktu. */
function RequestGate({ onRequested }: { onRequested: () => void }) {
  const t = useTranslations("symulacje.gate");
  const { refresh } = useAccess();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function send() {
    setSending(true);
    setError(false);
    try {
      const res = await fetch("/api/dostep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) { setError(true); return; }
      await refresh();
      onRequested();
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <GatePanel title={t("request.title")} lead={t("request.lead")}>
      <div className="mt-4 space-y-3">
        <div>
          <label className={labelCls} htmlFor="access-note">{t("request.noteLabel")}</label>
          <textarea
            id="access-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, ACCESS_NOTE_MAX))}
            rows={3}
            maxLength={ACCESS_NOTE_MAX}
            placeholder={t("request.notePlaceholder")}
            className={`${inputCls} resize-none`}
          />
        </div>
        {error && (
          <p role="alert" className="text-fr-sm text-warn">{t("request.error")}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={send} disabled={sending}>
            {sending ? t("request.sending") : t("request.submit")}
          </Btn>
          <a href={`mailto:${MAIL}`} className="text-fr-sm text-muted transition-colors hover:text-accent">
            {t("emailCta")}
          </a>
        </div>
      </div>
    </GatePanel>
  );
}

/**
 * Bramka uruchamiania na końcu kreatora.
 *
 * `children` to formularz zamówienia — pokazujemy go wyłącznie kontu, które
 * naprawdę może uruchomić obliczenia. O tym, czy może, rozstrzyga serwer
 * (`GET /api/dostep`); to tutaj jest wyłącznie warstwa widoku.
 */
export default function AccessGate({
  state, children,
}: { state: AccessState | null; children: React.ReactNode }) {
  const t = useTranslations("symulacje.gate");
  // Optymistyczne przejście do „czeka na rozpatrzenie" zaraz po wysłaniu prośby,
  // zanim odświeżony stan wróci z serwera.
  const [justRequested, setJustRequested] = useState(false);

  // Dopóki nie wiemy, kim jest gość, nie pokazujemy ani formularza, ani bramki:
  // mignięcie „załóż konto" zalogowanemu klientowi wygląda jak wylogowanie.
  if (!state) return <div className="h-40 animate-pulse rounded-panel bg-panel-deep" />;

  if (state.canRun) return <>{children}</>;
  if (!state.signedIn) return <AnonGate />;

  if (justRequested || state.access === "requested") {
    return (
      <GatePanel title={t("pending.title")} lead={t("pending.lead")}>
        <p className="mt-3 font-mono text-fr-sm text-muted">{t("pending.hint")}</p>
      </GatePanel>
    );
  }

  if (state.access === "blocked") {
    return (
      <GatePanel title={t("blocked.title")} lead={t("blocked.lead")}>
        <ContactLinks emailCta={t("emailCta")} phoneCta={t("phoneCta")} />
      </GatePanel>
    );
  }

  return <RequestGate onRequested={() => setJustRequested(true)} />;
}
