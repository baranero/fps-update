import { Blog } from "@/types/blog";
import Image from "next/image";
import Link from "next/link";

const SingleBlog = ({ blog }: { blog: Blog }) => {
  const { title, image, paragraph, author, tags, publishDate, slug } = blog;
  const articleLink = `/${slug}`;

  return (
    <div
      className="wow fadeInUp group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-800 dark:bg-[#111827]"
      data-wow-delay=".1s"
    >
      <Link href={articleLink} className="relative block aspect-[37/22] w-full overflow-hidden">
        <span className="absolute right-4 top-4 z-20 inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold capitalize text-white">
          {tags[0]}
        </span>
        <Image
          src={image}
          alt={`Miniatura artykułu: ${title}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="p-6 sm:p-8">
        <h3>
          <Link
            href={articleLink}
            className="mb-4 block text-xl font-bold text-slate-900 transition-colors duration-200 hover:text-primary dark:text-white dark:hover:text-primary sm:text-2xl"
          >
            {title}
          </Link>
        </h3>
        <p className="mb-6 border-b border-slate-100 pb-6 text-base text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {paragraph}
        </p>

        <div className="flex items-center">
          <div className="mr-5 flex items-center border-r border-slate-100 pr-5 dark:border-slate-700">
            <div className="mr-3">
              <div className="relative h-9 w-9 overflow-hidden rounded-full">
                <Image
                  src={author.image}
                  alt={`Autor: ${author.name}`}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div>
              <h4 className="mb-0.5 text-sm font-semibold text-slate-800 dark:text-white">
                {author.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{author.designation}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-0.5 text-sm font-semibold text-slate-800 dark:text-white">
              Data publikacji
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{publishDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleBlog;
