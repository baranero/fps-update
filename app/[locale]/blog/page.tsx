import SingleBlog from "@/components/Blog/SingleBlog";
import blogData from "@/components/Blog/blogData";
import PageHeader from "@/components/Common/PageHeader";
import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: "Blog o inżynierii bezpieczeństwa pożarowego | FP Solutions",
  description:
    "Baza wiedzy z zakresu inżynierii bezpieczeństwa pożarowego. Porady, aktualne przepisy, symulacje CFD, audyty ppoż. i operaty. Czytaj bloga FP Solutions.",
  alternates: {
    canonical: "https://fp-solutions.pl/blog",
  },
  openGraph: {
    title: "Blog FP Solutions – Ekspercka wiedza o ochronie ppoż.",
    description:
      "Sprawdź praktyczne artykuły inżynierskie o bezpieczeństwie pożarowym, scenariuszach rozwoju pożaru, IBP i nowoczesnych systemach ppoż.",
    url: "https://fp-solutions.pl/blog",
  },
};

const BlogPage = ({ params: { locale } }: { params: { locale: string } }) => {
  setRequestLocale(locale);
  const t = useTranslations("blog");
  return (
    <>
      <PageHeader page="blog" />

      <section className="pb-24 pt-16">
        <div className="container">

          {/* Ustrukturyzowany nagłówek SEO */}
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {t("introTitle")}
            </h2>
            <p className="mx-auto max-w-[700px] text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t("introDesc")}
            </p>
          </div>

          {/* Siatka z artykułami */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogData.map((blog) => (
              <SingleBlog key={blog.id} blog={blog} />
            ))}
          </div>

        </div>
      </section>
    </>
  );
};

export default BlogPage;

