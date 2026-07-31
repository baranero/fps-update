import { useTranslations } from "next-intl";

// Dwa panele akcentowe — miejsce, w którym wzór graficzny miał cytaty klientów.
// Świadomie NIE wstawiam tu wymyślonych opinii (byłyby nieprawdziwe na
// produkcyjnej stronie); ten sam blok kolorystyczny niesie konkretne, dające
// się zweryfikować obietnice usługi. Gdy pojawią się prawdziwe referencje,
// wystarczy podmienić treść — układ 3:2 i kolory zostają.
export default function FactPanels() {
  const t = useTranslations("cloudLanding.facts");

  return (
    <section className="border-t border-hairline bg-well px-4 py-20 md:py-32">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex h-[360px] flex-col justify-between rounded-card bg-mint p-8 md:h-[440px] md:p-10 lg:col-span-3">
          <p className="max-w-2xl font-heading text-fr-h2 leading-tight text-black">{t("f1Body")}</p>
          <div>
            <div className="font-bold text-black">{t("f1Label")}</div>
            <div className="text-fr-sm text-black/70">{t("f1Meta")}</div>
          </div>
        </div>

        <div className="flex h-[360px] flex-col justify-between rounded-card bg-lime p-8 md:h-[440px] md:p-10 lg:col-span-2">
          <p className="font-heading text-fr-h3 leading-tight text-black">{t("f2Body")}</p>
          <div>
            <div className="font-bold text-black">{t("f2Label")}</div>
            <div className="text-fr-sm text-black/70">{t("f2Meta")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
