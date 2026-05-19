import Link from "next/link";

const Breadcrumb = ({
  pageName,
  description,
}: {
  pageName: string;
  description: string;
}) => {
  return (
    <section className="relative z-10 overflow-hidden bg-slate-100 dark:bg-[#111827] pt-12 pb-10 lg:pt-16 lg:pb-14">
      <div className="container">
        <div className="-mx-4 flex flex-wrap items-center">
          <div className="w-full px-4 md:w-8/12 lg:w-7/12">
            <div className="mb-6 max-w-[570px] md:mb-0">
              <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {pageName}
              </h1>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>
          <div className="w-full px-4 md:w-4/12 lg:w-5/12">
            <nav className="text-end" aria-label="breadcrumb">
              <ul className="flex items-center md:justify-end">
                <li className="flex items-center">
                  <Link
                    href="/"
                    className="pr-1 text-sm font-medium text-slate-500 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-white"
                  >
                    Strona główna
                  </Link>
                  <span className="mr-3 block h-1.5 w-1.5 rotate-45 border-r-2 border-t-2 border-slate-400 dark:border-slate-600" />
                </li>
                <li className="text-sm font-medium text-primary">{pageName}</li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Breadcrumb;
