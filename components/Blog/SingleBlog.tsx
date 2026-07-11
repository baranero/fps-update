import { Blog } from "@/types/blog";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const SingleBlog = ({ blog }: { blog: Blog }) => {
  const { image, author, slug } = blog;
  const t = useTranslations("blog");
  const tp = useTranslations(`blog.posts.${slug}`);
  const articleLink = `/${slug}`;
  const title = tp("title");

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-[#111827] dark:hover:border-slate-700">
      <Link href={articleLink} className="relative block aspect-[37/22] w-full overflow-hidden">
        <span className="absolute left-4 top-4 z-20 inline-flex items-center rounded-md bg-primary px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white">
          {tp("tag")}
        </span>
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <p className="mb-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{tp("date")}</p>
        <h3>
          <Link
            href={articleLink}
            className="mb-3 block font-display text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-primary dark:text-white sm:text-xl"
          >
            {title}
          </Link>
        </h3>
        <p className="mb-6 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          {tp("excerpt")}
        </p>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
            <Image src={author.image} alt={t("authorName")} fill className="object-cover" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{t("authorName")}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("authorRole")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleBlog;
