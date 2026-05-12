import SingleBlog from "@/components/Blog/SingleBlog";
import blogData from "@/components/Blog/blogData";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";

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

const BlogPage = () => {
  return (
    <>
      <Breadcrumb 
        pageName="Blog" 
        description="Aktualności, przepisy i ekspercka wiedza z zakresu ochrony i inżynierii bezpieczeństwa pożarowego." 
      />

      <section className="pb-[120px] pt-[60px]">
        <div className="container">
          
          {/* Ustrukturyzowany nagłówek SEO */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-3xl font-bold text-black dark:text-white sm:text-4xl">
              Baza wiedzy przeciwpożarowej
            </h1>
            <p className="mx-auto max-w-[700px] text-base leading-relaxed text-body-color dark:text-body-color-dark">
              Bądź na bieżąco z najnowszymi wytycznymi i rozwiązaniami w branży. Publikujemy artykuły i poradniki tworzone przez ekspertów od inżynierii bezpieczeństwa pożarowego.
            </p>
          </div>

          {/* Siatka z artykułami */}
          <div className="-mx-4 flex flex-wrap justify-center">
            {blogData.map((blog) => (
              <div
                key={blog.id}
                className="w-full px-4 md:w-2/3 lg:w-1/2 xl:w-1/3"
              >
                <SingleBlog blog={blog} />
              </div>
            ))}
          </div>
          
        </div>
      </section>
    </>
  );
};

export default BlogPage;