import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import RunConsole from "@/components/Cloud/RunConsole";
import FigurePlates from "@/components/Cloud/FigurePlates";
import ParserSection from "@/components/Cloud/ParserSection";
import ProgressSection from "@/components/Cloud/ProgressSection";
import StageStrip from "@/components/Cloud/StageStrip";
import FactPanels from "@/components/Cloud/FactPanels";
import CloudMarketing from "@/components/Cloud/CloudMarketing";

// Landing FDSRun w układzie ze wzoru graficznego (Stitch): hero z pełnej
// szerokości konsolą zlecenia → rysunki techniczne → dwie sekcje 2-kolumnowe
// (parser / postęp) → pas etapów → panele akcentowe → oferta i FAQ → CTA.
// Renderowany jako root projektu „cloud" (fdsrun.com/) i pod /chmura w dev.
// Cała paleta na tokenach powierzchni (canvas/panel/ink/…), więc jeden zestaw
// klas obsługuje motyw jasny i ciemny.
export default async function CloudLanding() {
  const t = await getTranslations("cloudLanding");
  const tn = await getTranslations("cloudNav");
  const ts = await getTranslations("symulacje");

  return (
    <div className="bg-canvas text-ink">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-16 pt-16 md:pb-20 md:pt-24">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="mb-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h1 className="mb-6 max-w-[900px] fr-balance font-heading text-fr-hero text-ink">
                {t("hero.line1")}
                <br />
                {t("hero.line2")}
              </h1>
              <p className="mb-8 max-w-2xl text-fr-lead text-muted">{t("hero.lead")}</p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/symulacje/nowa"
                  className="rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
                >
                  {tn("run")}
                </Link>
                <Link
                  href="/cennik"
                  className="rounded-panel border border-hairline bg-panel px-7 py-3.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel-deep"
                >
                  {t("hero.ctaSecondary")}
                </Link>
              </div>
            </div>

            <div className="shrink-0 pb-1 lg:text-right">
              <Link
                href="/funkcje"
                className="inline-flex items-center gap-1.5 font-mono text-fr-data text-muted transition-colors hover:text-primary"
              >
                {t("hero.sideLink")} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <RunConsole />

          {/* Pasek specyfikacji — twarde parametry usługi zamiast ogólników.
              To treść do przeczytania, nie ozdobnik: normalna wielkość liter,
              minimalny tracking i pełny kontrast tekstu. Wersaliki w mono przy
              9 px robiły z tego szlaczek. */}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-hairline pt-6">
            {[ts("trust.vm"), ts("trust.epyc"), ts("trust.payg"), ts("trust.retention")].map((tag) => (
              <span key={tag} className="flex items-center gap-2.5 font-mono text-fr-sm text-ink">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <FigurePlates />
      <ParserSection />
      <ProgressSection />
      <StageStrip />
      <FactPanels />

      {/* ── Oferta + FAQ ──────────────────────────────────────────────────── */}
      <section className="border-t border-hairline bg-canvas px-4 py-20 md:py-28">
        <div className="mx-auto w-full max-w-3xl">
          <CloudMarketing />
        </div>
      </section>

      {/* ── Finalne CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-hairline bg-canvas px-4 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-8 fr-balance font-heading text-fr-hero text-ink">
            {t("finalCta.line1")}
            <br />
            {t("finalCta.line2")}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/symulacje/nowa"
              className="rounded-panel bg-primary px-8 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
            >
              {tn("run")}
            </Link>
            {/* mailto, nie /kontakt — ta ścieżka należy do projektu „marketing"
                i na fdsrun.com middleware odbiłby ją 301 na fp-solutions.pl */}
            <a
              href="mailto:biuro@fp-solutions.pl"
              className="rounded-panel border border-hairline px-8 py-3.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel"
            >
              {t("finalCta.contact")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
