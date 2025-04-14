import { Feature } from "@/types/feature";
import Link from "next/link";

const SingleFeature = ({ feature }: { feature: Feature }) => {
  const { icon, title, paragraph, href } = feature;
  return (
    <Link href={href} className="w-full p-10 hover:bg-opacity-10 hover:bg-red-400 transition-all rounded-xl">
      <div className="wow fadeInUp sm:block flex items-center gap-x-6" data-wow-delay=".15s">
        <div className="mb-10 flex sm:h-[70px] sm:w-[70px] items-center justify-center rounded-md bg-primary bg-opacity-10 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="mb-5 text-xl font-bold text-black dark:text-white sm:text-2xl lg:text-xl xl:text-2xl">
            {title}
          </h3>
          <p className="pr-[10px] text-base font-medium leading-relaxed text-body-color">
            {paragraph}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default SingleFeature;
