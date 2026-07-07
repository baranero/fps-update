import { Feature } from "@/types/feature";
import Link from "next/link";

const SingleFeature = ({ feature }: { feature: Feature }) => {
  const { icon, title, paragraph, href, isNew } = feature;

  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-2xl border border-slate-200/60 bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm dark:border-slate-700/50 dark:bg-slate-800/30 dark:hover:border-primary/25"
    >
      {isNew && (
        <span className="absolute right-5 top-5 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Nowa
        </span>
      )}
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-3 text-[16px] font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {paragraph}
      </p>
    </Link>
  );
};

export default SingleFeature;
