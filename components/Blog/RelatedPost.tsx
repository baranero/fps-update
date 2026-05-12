import Image from "next/image";
import Link from "next/link";

const RelatedPost = ({
  image,
  slug,
  title,
  date,
}: {
  image: string;
  slug: string;
  title: string;
  date: string;
}) => {
  return (
    <div className="flex items-center lg:block xl:flex group">
      <div className="mr-5 lg:mb-3 xl:mb-0">
        <Link href={slug} className="relative block h-[60px] w-[70px] overflow-hidden rounded-md sm:h-[75px] sm:w-[85px]">
          <Image 
            src={image} 
            alt={`Artykuł: ${title}`} 
            fill 
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </Link>
      </div>
      <div className="w-full">
        <h5>
          <Link
            href={slug}
            className="mb-[6px] block text-base font-medium leading-snug text-black transition-colors duration-200 hover:text-primary dark:text-white dark:hover:text-primary"
          >
            {title}
          </Link>
        </h5>
        <p className="text-xs font-medium text-body-color">{date}</p>
      </div>
    </div>
  );
};

export default RelatedPost;