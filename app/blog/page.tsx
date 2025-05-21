import SingleBlog from "@/components/Blog/SingleBlog";
import blogData from "@/components/Blog/blogData";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { FaArrowLeft } from "react-icons/fa";
import { Metadata } from "next";
import { FaArrowRight } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Blog o ochronie przeciwpożarowej – FP Solutions",
  description:
    "Porady, przepisy i praktyczne wskazówki z zakresu ochrony ppoż., symulacji CFD, audytów i OZEx. Czytaj najnowsze wpisy na blogu FP Solutions.",
  alternates: {
    canonical: "https://fp-solutions.pl/blog",
  },
  openGraph: {
    title: "Blog FP Solutions – Ekspercka wiedza o ochronie ppoż.",
    description:
      "Sprawdź praktyczne artykuły o bezpieczeństwie pożarowym, scenariuszach pożaru, IBP i więcej.",
    url: "https://fp-solutions.pl/blog",
  },
};

const Blog = () => {
  return (
    <>
      <Breadcrumb pageName="Blog" description="Aktualności i wiedza z zakresu ochrony przeciwpożarowej" />

      <h1 className="pt-10 text-center text-3xl font-bold text-body-color">
        Blog o ochronie przeciwpożarowej
      </h1>

      <section className="pb-[120px] pt-[60px]">
        <div className="container">
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

export default Blog;
