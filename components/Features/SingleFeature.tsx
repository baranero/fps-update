import { Feature } from "@/types/feature";
import Link from "next/link";

const SingleFeature = ({ feature }: { feature: Feature }) => {
  const { icon, title, paragraph, href } = feature;

  return (
    <div className="w-full">
      <Link
        href={href}
        className="group relative block h-full rounded-2xl p-8 transition-all duration-300 hover:bg-primary/5 lg:p-10"
      >
        <div className="wow fadeInUp flex flex-col items-start" data-wow-delay=".15s">
          <div className="mb-8 flex h-[70px] w-[70px] items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
            {icon}
          </div>
          <div>
            <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
              {title}
            </h3>
            <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              {paragraph}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default SingleFeature;
