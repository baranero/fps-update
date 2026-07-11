import { useTranslations } from "next-intl";
import SingleBlog from "./SingleBlog";
import blogData from "./blogData";
import Kicker from "@/components/ui/Kicker";

const Blog = () => {
  const t = useTranslations("blog");

  return (
    <section id="blog" className="bg-slate-100 py-16 dark:bg-[#111827] md:py-20 lg:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="flex justify-center">
            <Kicker>{t("homeKicker")}</Kicker>
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("homeTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {t("homeDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {blogData.map((blog) => (
            <SingleBlog key={blog.id} blog={blog} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
