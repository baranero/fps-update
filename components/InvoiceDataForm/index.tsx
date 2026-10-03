"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { TONE_SURFACE, TONE_TEXT } from "@/lib/tone";
import {
  EMPTY_INVOICE,
  addressLines,
  formatPostalCode,
  invoiceCompletion,
  isEuCountry,
  requiredFields,
  validateInvoice,
  vatTreatment,
  type BuyerType,
  type InvoiceData,
  type InvoiceField,
} from "@/lib/invoice";
import { loadInvoiceData, saveInvoiceData } from "@/lib/invoiceClient";
import {
  Btn, Chip, Field, Meter, SectionLabel, Skeleton, inputCls, inputErrCls, labelCls,
} from "@/components/Cloud/ui";

type Msg = { ok: boolean; text: string };

function Toast({ msg, onDismiss }: { msg: Msg; onDismiss: () => void }) {
  const tone = msg.ok ? "ok" : "primary";
  return (
    <div className={`flex items-center gap-3 rounded-panel border px-4 py-3 text-fr-sm ${TONE_SURFACE[tone]} ${TONE_TEXT[tone]}`}>
      {msg.ok ? (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-50 transition-opacity hover:opacity-100">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const BUYER_TYPES: BuyerType[] = ["company", "person", "eu", "nonEu"];

/** Kraje podpowiadane w liście — UE plus najczęstsi klienci spoza niej. */
const COUNTRY_OPTIONS = [
  "PL", "DE", "CZ", "SK", "LT", "LV", "EE", "AT", "NL", "BE", "FR", "ES", "IT",
  "SE", "DK", "FI", "IE", "PT", "RO", "BG", "HR", "HU", "SI", "GR", "CY", "LU", "MT",
  "GB", "NO", "CH", "UA", "US", "AE",
];

/**
 * Zunifikowane dane rozliczeniowe (dane do faktury) — jedno źródło prawdy:
 * tabela `profiles`. Ten sam komponent obsługuje sekcję w Profilu
 * (variant="section") i panel w Rozliczeniach (variant="panel").
 *
 * Zakres pól i reguły ich wymagalności NIE są tu zaszyte — pochodzą z
 * `lib/invoice.ts`, gdzie stoi za nimi podstawa prawna (art. 106e ustawy o VAT)
 * i komplet testów.
 */
export default function InvoiceDataForm({
  variant = "section",
  onSaved,
}: {
  variant?: "section" | "panel";
  /** Wywoływane po udanym zapisie — kreator zamówienia odblokowuje wtedy wysyłkę. */
  onSaved?: (data: InvoiceData) => void;
}) {
  const t = useTranslations("profile");
  const [data, setData] = useState<InvoiceData>(EMPTY_INVOICE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<Msg | null>(null);
  // Błędy pokazujemy dopiero po dotknięciu pola albo po próbie zapisu —
  // formularz nie ma świecić na czerwono, zanim użytkownik cokolwiek napisze.
  const [touched, setTouched] = useState<Set<InvoiceField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const res = await loadInvoiceData(createClient());
      if (res.ok) setData(res.data);
      else if (res.reason === "error") setLoadError(true);
      setLoading(false);
    }
    load();
  }, []);

  const errors = useMemo(() => validateInvoice(data), [data]);
  const completion = useMemo(() => invoiceCompletion(data), [data]);
  const required = useMemo(() => new Set(requiredFields(data.buyerType)), [data.buyerType]);
  const preview = useMemo(() => addressLines(data), [data]);
  const vat = vatTreatment(data);

  const showError = (field: InvoiceField) =>
    (submitted || touched.has(field)) && errors[field]
      ? t(`invoice.err.${errors[field]}`)
      : undefined;

  function set<K extends InvoiceField>(key: K, value: InvoiceData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function markTouched(field: InvoiceField) {
    setTouched((s) => new Set(s).add(field));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    // Niekompletnych danych nie zapisujemy po cichu — faktury i tak nie da się
    // z nich wystawić, a użytkownik myślałby, że sprawa jest załatwiona.
    if (Object.keys(errors).length > 0) {
      setSaveMsg({ ok: false, text: t("invoice.incomplete") });
      return;
    }

    setSaveLoading(true);
    setSaveMsg(null);

    const { error } = await saveInvoiceData(createClient(), data);

    const msg: Msg = error
      ? { ok: false, text: t("invoice.saveErr") }
      : { ok: true, text: t("invoice.savedOk") };
    if (!error) onSaved?.(data);
    setSaveMsg(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (msg.ok) timerRef.current = setTimeout(() => setSaveMsg(null), 4000);
    setSaveLoading(false);
  }

  if (loading) return <Skeleton className="h-64 max-w-2xl" />;
  if (loadError) return <p className="text-fr-sm text-accent">{t("invoice.saveErr")}</p>;

  const text = (
    label: string,
    key: InvoiceField,
    opts?: { placeholder?: string; hint?: string; onBlurFormat?: () => void; autoComplete?: string }
  ) => {
    const err = showError(key);
    return (
      <Field
        label={required.has(key) ? label : `${label} ${t("invoice.optional")}`}
        hint={opts?.hint}
        error={err}
      >
        <input
          type="text"
          value={String(data[key] ?? "")}
          onChange={(e) => set(key, e.target.value as never)}
          onBlur={() => { markTouched(key); opts?.onBlurFormat?.(); }}
          placeholder={opts?.placeholder}
          autoComplete={opts?.autoComplete}
          aria-invalid={!!err}
          className={err ? inputErrCls : inputCls}
        />
      </Field>
    );
  };

  const complete = completion.pct === 100;

  const form = (
    <form onSubmit={handleSave} className="space-y-6">

      {/* Postęp kompletowania — od tego zależy, czy da się wystawić fakturę */}
      <div className="rounded-panel border border-hairline bg-panel-deep p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-mono text-fr-micro uppercase text-faint">{t("invoice.completeness")}</p>
          <Chip tone={complete ? "ok" : "warn"} dot>
            {complete
              ? t("invoice.completeYes")
              : t("invoice.completeNo", { filled: completion.filled, total: completion.total })}
          </Chip>
        </div>
        <Meter pct={completion.pct} tone={complete ? "ok" : "warn"} />
      </div>

      {/* Typ nabywcy — steruje resztą formularza i sposobem rozliczenia VAT */}
      <div>
        <label className={labelCls}>{t("invoice.buyerType")}</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BUYER_TYPES.map((type) => {
            const active = data.buyerType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setData((d) => ({
                    ...d,
                    buyerType: type,
                    // Przy przejściu na osobę prywatną numer podatkowy przestaje
                    // mieć zastosowanie — zostawienie go wprowadzałoby w błąd.
                    nip: type === "person" ? "" : d.nip,
                    country: type === "company" || type === "person" ? "PL" : d.country,
                  }));
                }}
                aria-pressed={active}
                className={`rounded-panel border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-hairline bg-panel-deep hover:border-primary/40"
                }`}
              >
                <p className={`text-fr-body font-semibold ${active ? "text-accent" : "text-ink"}`}>
                  {t(`invoice.buyer.${type}`)}
                </p>
                <p className="mt-0.5 text-fr-sm text-muted">{t(`invoice.buyerDesc.${type}`)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nazwa nabywcy */}
      {data.buyerType !== "person" &&
        text(t("invoice.company"), "company", {
          placeholder: t("invoice.phCompany"),
          autoComplete: "organization",
        })}

      {text(
        data.buyerType === "person" ? t("invoice.fullName") : t("invoice.contactPerson"),
        "fullName",
        { placeholder: t("invoice.phFullName"), autoComplete: "name" }
      )}

      {/* Numer podatkowy */}
      {data.buyerType === "company" &&
        text(t("invoice.nip"), "nip", {
          placeholder: t("invoice.phNip"),
          hint: t("invoice.nipHint"),
        })}

      {data.buyerType === "eu" &&
        text(t("invoice.vatId"), "nip", {
          placeholder: t("invoice.phVatId"),
          hint: t("invoice.vatIdHint"),
        })}

      {/* Adres — rozbity, bo takiego wymaga faktura ustrukturyzowana */}
      <div className="space-y-4">
        <SectionLabel className="block">{t("invoice.addressSection")}</SectionLabel>

        {text(t("invoice.street"), "street", {
          placeholder: t("invoice.phStreet"),
          autoComplete: "street-address",
        })}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
          {text(t("invoice.postalCode"), "postalCode", {
            placeholder: data.country === "PL" ? "00-000" : t("invoice.phPostal"),
            autoComplete: "postal-code",
            // Kod bez myślnika to najczęstszy zapis — poprawiamy go po wyjściu
            // z pola, zamiast czepiać się użytkownika komunikatem.
            onBlurFormat: () =>
              setData((d) => ({ ...d, postalCode: formatPostalCode(d.postalCode, d.country) })),
          })}
          {text(t("invoice.city"), "city", {
            placeholder: t("invoice.phCity"),
            autoComplete: "address-level2",
          })}
        </div>

        <Field label={t("invoice.country")} error={showError("country")}>
          <select
            value={data.country}
            onChange={(e) => {
              const country = e.target.value;
              setData((d) => ({
                ...d,
                country,
                // Kraj i typ nabywcy muszą się zgadzać: firma z Niemiec nie może
                // zostać „firmą krajową", bo faktura wyszłaby z polskim VAT-em.
                buyerType:
                  d.buyerType === "person" || d.buyerType === "company"
                    ? country === "PL" ? d.buyerType : isEuCountry(country) ? "eu" : "nonEu"
                    : country === "PL" ? "company" : isEuCountry(country) ? "eu" : "nonEu",
              }));
            }}
            className={inputCls}
          >
            {COUNTRY_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {t(`invoice.country_.${code}`)} ({code})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {text(t("invoice.phone"), "phone", {
        placeholder: t("invoice.phPhone"),
        autoComplete: "tel",
      })}

      {/* Jak zostanie rozliczony VAT — wynika z typu nabywcy, więc mówimy to wprost */}
      <div className={`rounded-panel border p-4 ${TONE_SURFACE[vat.treatment === "standard" ? "muted" : "signal"]}`}>
        <p className={`font-mono text-fr-micro uppercase ${vat.treatment === "standard" ? "text-muted" : "text-signal"}`}>
          {t("invoice.vatTitle")}
        </p>
        <p className="mt-1 text-fr-sm text-muted">{t(`invoice.vat.${vat.treatment}`)}</p>
      </div>

      {/* Podgląd bloku adresowego — dokładnie tak, jak trafi na fakturę */}
      {preview.length > 0 && (
        <div>
          <SectionLabel className="mb-3 block">{t("invoice.preview")}</SectionLabel>
          <div className="rounded-panel border border-hairline bg-panel-deep p-4 font-mono text-fr-sm text-ink">
            {preview.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {saveMsg && <Toast msg={saveMsg} onDismiss={() => setSaveMsg(null)} />}

      <div className="flex flex-wrap items-center gap-3">
        <Btn type="submit" disabled={saveLoading}>
          {saveLoading ? t("invoice.saving") : t("invoice.save")}
        </Btn>
        <p className="text-fr-sm text-muted">{t("invoice.legalBasis")}</p>
      </div>
    </form>
  );

  // Panel: bez własnego nagłówka (dostarcza go rodzic, np. <summary> w Rozliczeniach).
  if (variant === "panel") {
    return (
      <div className="space-y-4">
        <p className="text-fr-sm text-muted">{t("invoice.subtitle")}</p>
        {form}
      </div>
    );
  }

  return (
    <section className="border-t border-hairline pt-8">
      <SectionLabel className="mb-1 block">{t("invoice.title")}</SectionLabel>
      <p className="mb-4 max-w-2xl text-fr-sm text-muted">{t("invoice.subtitle")}</p>
      <div className="max-w-2xl">{form}</div>
    </section>
  );
}
