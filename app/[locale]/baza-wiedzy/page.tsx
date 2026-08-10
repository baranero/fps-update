import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cloudSeoUrls } from "@/lib/seo";
import { fdsCourse, kbContent, kbPosts, publishedLessons } from "@/lib/content/kb";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "kb.metadata" });
  const { canonical, languages } = cloudSeoUrls(locale, "/baza-wiedzy");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
  };
}

export default async function BazaWiedzyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("kb");
  const posts = kbPosts(locale);
  const course = fdsCourse(locale);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pl-PL", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="bg-canvas text-ink">
      {/* Hero — układ jak /funkcje i /cennik: blok do lewej, nie „marketingowy" środek */}
      <section className="border-b border-hairline px-4 py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1400px]">
          <span className="mb-5 inline-flex items-center gap-2 rounded-chip border border-hairline px-2.5 py-1 font-mono text-fr-micro uppercase text-muted">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {t("badge")}
          </span>
          <h1 className="max-w-3xl fr-balance font-heading text-fr-h1 text-ink">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-fr-lead text-muted">{t("lead")}</p>
        </div>
      </section>

      {/* Kurs — wyróżniony kafel nad listą artykułów */}
      <section className="px-4 pt-16 md:pt-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <Link
            href="/baza-wiedzy/kurs-fds"
            className="group block rounded-card border border-hairline bg-panel p-6 transition-colors hover:border-primary/30 md:p-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-chip bg-primary px-2 py-0.5 font-mono text-fr-micro uppercase text-white">
                {t("courseBadge")}
              </span>
              <span className="font-mono text-fr-micro uppercase text-faint">
                {t("courseProgress", { done: publishedLessons(locale).length, total: course.length })}
              </span>
            </div>
            <h2 className="mt-4 font-heading text-fr-h2 text-ink">{t("courseTitle")}</h2>
            <p className="mt-3 max-w-3xl text-fr-body text-muted">{t("courseLead")}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-fr-body font-semibold text-primary">
              {t("courseCta")}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Artykuły */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <h2 className="mb-6 font-mono text-fr-micro uppercase text-faint">{t("articlesHeading")}</h2>

          {posts.length === 0 ? (
            <p className="text-fr-body text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => {
                const c = kbContent(post, locale)!;
                return (
                  <article key={post.slug} className="h-full">
                    <Link
                      href={`/baza-wiedzy/${post.slug}`}
                      className="flex h-full flex-col rounded-card border border-hairline bg-panel p-6 transition-colors hover:border-primary/30"
                    >
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <span className="rounded-chip border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-fr-micro uppercase text-primary">
                          {c.tags[0]}
                        </span>
                        <span className="font-mono text-fr-micro uppercase text-faint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <h3 className="font-heading text-fr-h4 text-ink">{c.title}</h3>
                      <p className="mt-2 line-clamp-4 text-fr-sm text-muted">{c.lead}</p>

                      <div className="mt-5 flex items-center gap-2 border-t border-hairline-soft pt-4 font-mono text-fr-micro uppercase text-faint">
                        <time dateTime={post.date}>{fmt.format(new Date(post.date))}</time>
                        <span aria-hidden>·</span>
                        <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
