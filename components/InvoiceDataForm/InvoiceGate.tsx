"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { addressLines, isInvoiceComplete, type InvoiceData } from "@/lib/invoice";
import { loadInvoiceData } from "@/lib/invoiceClient";
import InvoiceDataForm from "@/components/InvoiceDataForm";
import { Chip, Skeleton } from "@/components/Cloud/ui";

/**
 * Dane do faktury w ścieżce zamówienia.
 *
 * Do tej pory jedynym miejscem, gdzie dało się je podać, był formularz w
 * profilu — a tam nikt nie zaglądał: na sześć kont komplet miało jedno.
 * Skutek był taki, że zlecenie dało się złożyć, a faktury wystawić już nie.
 *
 * Dlatego pytamy o nie dokładnie wtedy, kiedy mają znaczenie: przy składaniu
 * zamówienia. Komplet zwijamy do podglądu bloku adresowego, brak — rozwijamy
 * od razu w formularz, żeby nie wyrzucać klienta z kreatora na inną stronę.
 */
export default function InvoiceGate({ onReady }: { onReady: (ready: boolean) => void }) {
  const t = useTranslations("profile");
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    loadInvoiceData(createClient()).then((res) => {
      if (!alive) return;
      const value = res.ok ? res.data : null;
      const ready = value ? isInvoiceComplete(value) : false;
      setData(value);
      setEditing(!ready);
      setLoading(false);
      onReady(ready);
    });
    return () => { alive = false; };
  // onReady jest stabilne po stronie kreatora; celowo nie restartujemy odczytu.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Skeleton className="h-24" />;

  const ready = !!data && isInvoiceComplete(data);

  return (
    <div className="rounded-panel border border-hairline bg-panel-deep p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="font-mono text-fr-label uppercase text-muted">{t("invoice.title")}</h3>
          <Chip tone={ready ? "ok" : "warn"} dot>
            {ready ? t("invoice.completeYes") : t("invoice.gateRequired")}
          </Chip>
        </div>
        {ready && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-mono text-fr-micro uppercase text-muted transition-colors hover:text-accent"
          >
            {editing ? t("invoice.gateHide") : t("invoice.gateEdit")}
          </button>
        )}
      </div>

      {ready && !editing && data ? (
        <div className="font-mono text-fr-sm text-ink">
          {addressLines(data).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      ) : (
        <>
          {!ready && <p className="mb-4 text-fr-sm text-muted">{t("invoice.gateLead")}</p>}
          <InvoiceDataForm
            variant="panel"
            onSaved={(saved) => {
              const nowReady = isInvoiceComplete(saved);
              setData(saved);
              onReady(nowReady);
              if (nowReady) setEditing(false);
            }}
          />
        </>
      )}
    </div>
  );
}
