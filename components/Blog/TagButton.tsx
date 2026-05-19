import Link from "next/link";

const TagButton = ({ href = "#0", text }: { href?: string; text: string }) => {
  return (
    <Link
      href={href}
      className="bg-slate-100 mb-3 mr-3 inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm text-black transition-colors duration-300 hover:bg-primary hover:text-white dark:bg-slate-800 dark:text-white dark:hover:bg-primary"
    >
      {text}
    </Link>
  );
};

export default TagButton;
