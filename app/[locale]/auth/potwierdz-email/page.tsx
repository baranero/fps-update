import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "auth.confirmEmail" });
  return { title: t("metaTitle") };
}

export default function PotwierdzenieEmailPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = useTranslations("auth.confirmEmail");
  return (
    <section className="relative z-10 overflow-hidden bg-canvas px-4 py-16 md:py-24">
      {/* Ta sama siatka w tle, co na logowaniu i rejestracji */}
      <div className="fr-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-[460px] text-center">

        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-tile border border-primary/20 bg-primary/10 text-primary">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <span className="mb-3 block font-mono text-fr-label uppercase text-muted">FDSRUN // POTWIERDZENIE</span>
        <h1 className="mb-2 font-heading text-fr-h2 text-ink">{t("title")}</h1>
        <p className="mb-6 text-fr-body text-muted">{t("body")}</p>

        <div className="mb-6 space-y-1 rounded-card border border-hairline bg-panel px-4 py-3 text-left text-fr-sm text-muted">
          <p>{t("validity")}</p>
          <p>{t("spam")}</p>
        </div>

        <Link
          href="/signin"
          className="inline-flex items-center gap-1.5 font-mono text-fr-label uppercase text-muted transition-colors hover:text-primary"
        >
          {t("back")}
        </Link>

      </div>
    </section>
  );
}
