import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import TagButton from "@/components/Blog/TagButton";
import { ArrowRightIcon } from "@/components/ui/Icon";

type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string; n?: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "linkbox"; text: string; linkText: string; href: string };

// Renderer treści artykułu z bloków (namespace `articles.<slug>`).
// Tytuł / data / tag pobierane z `blog.posts.<slug>`.
export default function ArticlePage({ slug, image }: { slug: string; image: string }) {
  const tb = useTranslations("blog");
  const tp = useTranslations(`blog.posts.${slug}`);
  const ta = useTranslations(`articles.${slug}`);
  const blocks = ta.raw("blocks") as Block[];
  const tags = ta.raw("tags") as string[];

  return (
    <article className="py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto max-w-[760px]">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400 transition-colors hover:text-primary dark:text-slate-500"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
            {tb("crumbBack")}
          </Link>

          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
              {tp("tag")}
            </span>
            <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">{tp("date")}</span>
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[40px]">
            {tp("title")}
          </h1>

          <div className="mt-6 flex items-center gap-3 border-b border-slate-200 pb-6 dark:border-slate-800">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
              <Image src="/images/blog/jakub.jpg" alt={tb("authorName")} fill className="object-cover" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 dark:text-white">{tb("authorName")}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{tb("authorRole")}</p>
            </div>
          </div>

          <div className="mb-10 mt-8 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative aspect-[97/44] w-full">
              <Image src={image} alt={tp("title")} fill className="object-cover object-center" />
            </div>
          </div>

          <div className="space-y-6">
            {blocks.map((b, i) => {
              switch (b.type) {
                case "h":
                  return (
                    <div key={i} className="pt-4">
                      {b.n && (
                        <span className="font-mono text-[12px] font-bold text-primary">{b.n}</span>
                      )}
                      <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                        {b.text}
                      </h2>
                    </div>
                  );
                case "p":
                  return (
                    <p key={i} className="text-[15.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {b.text}
                    </p>
                  );
                case "list":
                  return (
                    <ul key={i} className="space-y-2.5">
                      {b.items.map((it, j) => (
                        <li
                          key={j}
                          className="flex gap-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  );
                case "quote":
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-primary/20 bg-primary/[0.06] p-6 sm:p-8"
                    >
                      <p className="text-center text-[15px] font-medium italic leading-relaxed text-slate-700 dark:text-slate-200">
                        {b.text}
                      </p>
                    </div>
                  );
                case "linkbox":
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-primary/20 bg-primary/[0.06] p-6 text-center"
                    >
                      <p className="text-[15px] font-medium italic text-slate-700 dark:text-slate-200">
                        {b.text}{" "}
                        <a
                          href={b.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-primary transition hover:opacity-80"
                        >
                          {b.linkText}
                        </a>
                      </p>
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tb("tagsLabel")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <TagButton key={tag} text={tag} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
