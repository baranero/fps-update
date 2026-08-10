import { Link } from "@/i18n/navigation";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { cloudSeoUrls } from "@/lib/seo";
import { getKbPost, kbContent, kbPosts } from "@/lib/content/kb";
import PostBody from "@/components/Kb/PostBody";

type Params = { locale: string; slug: string };

// Artykuły są statyczne (moduły TS), więc prerenderujemy komplet — zero pracy
// na żądanie i pewność, że literówka w slugu wyjdzie na buildzie, a nie w ruchu.
// Adres EN powstaje tylko dla artykułów przetłumaczonych; reszta zwraca 404,
// zamiast serwować polski tekst pod angielskim URL-em.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    kbPosts(locale).map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = getKbPost(params.slug);
  const c = post && kbContent(post, params.locale);
  if (!post || !c) return {};
  const { canonical } = cloudSeoUrls(params.locale, `/baza-wiedzy/${post.slug}`);
  // hreflang tylko dla języków, w których artykuł faktycznie istnieje.
  const languages: Record<string, string> = {
    pl: cloudSeoUrls("pl", `/baza-wiedzy/${post.slug}`).canonical,
  };
  if (post.en) languages.en = cloudSeoUrls("en", `/baza-wiedzy/${post.slug}`).canonical;
  languages["x-default"] = languages.pl;

  return {
    title: `${c.title} | FDSRun`,
    description: c.lead,
    alternates: { canonical, languages },
    openGraph: {
      type: "article",
      title: c.title,
      description: c.lead,
      url: canonical,
      publishedTime: post.date,
      tags: c.tags,
    },
  };
}

export default async function KbPostPage({ params }: { params: Params }) {
  setRequestLocale(params.locale);
  const post = getKbPost(params.slug);
  const c = post && kbContent(post, params.locale);
  if (!post || !c) notFound();

  const t = await getTranslations("kb");
  const fmt = new Intl.DateTimeFormat(params.locale === "en" ? "en-GB" : "pl-PL", {
    day: "numeric", month: "long", year: "numeric",
  });
  const others = kbPosts(params.locale).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="bg-canvas text-ink">
      <article className="px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-[820px]">
          <Link
            href="/baza-wiedzy"
            className="mb-8 inline-flex items-center gap-2 font-mono text-fr-micro uppercase text-faint transition-colors hover:text-primary"
          >
            <span aria-hidden>←</span>
            {t("back")}
          </Link>

          <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-fr-micro uppercase text-faint">
            <span className="rounded-chip bg-primary px-2 py-0.5 text-white">{c.tags[0]}</span>
            {post.lesson && (
              <Link href="/baza-wiedzy/kurs-fds" className="transition-colors hover:text-primary">
                {t("lessonLabel", { n: post.lesson })}
              </Link>
            )}
            <time dateTime={post.date}>{fmt.format(new Date(post.date))}</time>
            <span aria-hidden>·</span>
            <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
          </div>

          <h1 className="fr-balance font-heading text-fr-h1 text-ink">{c.title}</h1>
          <p className="mt-5 border-b border-hairline pb-8 text-fr-lead text-muted">{c.lead}</p>

          <div className="mt-10">
            <PostBody blocks={c.blocks} />
          </div>

          <div className="mt-12 border-t border-hairline pt-6">
            <p className="mb-3 font-mono text-fr-micro uppercase text-faint">{t("tagsLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {c.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-chip border border-hairline bg-panel px-2.5 py-1 font-mono text-fr-micro uppercase text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <section className="border-t border-hairline px-4 py-16">
          <div className="mx-auto w-full max-w-[1400px]">
            <h2 className="mb-6 font-mono text-fr-micro uppercase text-faint">{t("moreHeading")}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {others.map((p) => {
                const oc = kbContent(p, params.locale)!;
                return (
                  <Link
                    key={p.slug}
                    href={`/baza-wiedzy/${p.slug}`}
                    className="flex h-full flex-col rounded-card border border-hairline bg-panel p-6 transition-colors hover:border-primary/30"
                  >
                    <span className="mb-4 font-mono text-fr-micro uppercase text-primary">{oc.tags[0]}</span>
                    <h3 className="font-heading text-fr-h4 text-ink">{oc.title}</h3>
                    <p className="mt-2 line-clamp-3 text-fr-sm text-muted">{oc.lead}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-hairline px-4 py-16">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap justify-center gap-3">
          <Link
            href="/symulacje/nowa"
            className="rounded-panel bg-primary px-7 py-3.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("ctaRun")}
          </Link>
          <Link
            href="/baza-wiedzy/kurs-fds"
            className="rounded-panel border border-hairline px-7 py-3.5 text-fr-body font-semibold text-ink transition-colors hover:bg-panel"
          >
            {t("ctaCourse")}
          </Link>
        </div>
      </section>
    </div>
  );
}
