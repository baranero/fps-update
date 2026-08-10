import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls } from "@/lib/seo";
import { fdsCourse, publishedLessons } from "@/lib/content/kb";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "kb.course.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/baza-wiedzy/kurs-fds");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

export default async function KursFdsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("kb");
  const course = fdsCourse(locale);
  const done = publishedLessons(locale).length;

  return (
    <div className="bg-canvas text-ink">
      {/* Hero */}
      <section className="border-b border-hairline px-4 py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1400px]">
          <Link
            href="/baza-wiedzy"
            className="mb-8 inline-flex items-center gap-2 font-mono text-fr-micro uppercase text-faint transition-colors hover:text-primary"
          >
            <span aria-hidden>←</span>
            {t("back")}
          </Link>
          <span className="mb-5 flex items-center gap-2 font-mono text-fr-micro uppercase text-muted">
            <span className="rounded-chip bg-primary px-2 py-0.5 text-white">{t("courseBadge")}</span>
            {t("courseProgress", { done, total: course.length })}
          </span>
          <h1 className="max-w-3xl fr-balance font-heading text-fr-h1 text-ink">{t("course.title")}</h1>
          <p className="mt-5 max-w-2xl text-fr-lead text-muted">{t("course.lead")}</p>
        </div>
      </section>

      {/* Program — lekcje bez treści renderują się BEZ linku (żadnych 404) */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto w-full max-w-[900px]">
          <h2 className="mb-6 font-mono text-fr-micro uppercase text-faint">{t("course.outline")}</h2>

          <ol className="divide-y divide-hairline rounded-card border border-hairline bg-panel">
            {course.map((lesson) => {
              const body = (
                <>
                  <span className="shrink-0 font-mono text-fr-data text-primary">
                    {String(lesson.n).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-fr-h4 text-ink">{lesson.title}</span>
                      {!lesson.slug && (
                        <span className="rounded-chip border border-hairline px-1.5 py-0.5 font-mono text-fr-micro uppercase text-faint">
                          {t("soon")}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block text-fr-sm text-muted">{lesson.summary}</span>
                  </span>
                  {lesson.slug && (
                    <span aria-hidden className="shrink-0 self-center text-primary">
                      →
                    </span>
                  )}
                </>
              );

              return (
                <li key={lesson.n}>
                  {lesson.slug ? (
                    <Link
                      href={`/baza-wiedzy/${lesson.slug}`}
                      className="flex gap-4 p-5 transition-colors hover:bg-panel-deep md:p-6"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-4 p-5 md:p-6">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>

          <p className="mt-6 text-fr-sm text-faint">{t("course.note")}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-hairline px-4 py-16">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap justify-center gap-3">
          <Link
            href="/symulacje/nowa"
            className="rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("ctaRun")}
          </Link>
          <Link
            href="/funkcje"
            className="rounded-panel border border-hairline px-7 py-3.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel"
          >
            {t("ctaFeatures")}
          </Link>
        </div>
      </section>
    </div>
  );
}
