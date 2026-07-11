import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

// Precyzyjny przycisk zamiast „pigułki": mały promień, jeden wyraźny akcent,
// warianty primary / ghost / link. Z `href` renderuje lokalizowany Link,
// bez — zwykły <button>.

type Variant = "primary" | "ghost" | "link";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-primary text-white px-[18px] py-3 hover:bg-[#C0201A] dark:hover:bg-[#FF817B]",
  ghost:
    "border-slate-300 bg-transparent text-slate-900 px-[18px] py-3 hover:border-slate-900 dark:border-slate-600 dark:text-white dark:hover:border-white",
  link:
    "border-transparent bg-transparent px-1.5 py-1 text-primary hover:underline",
};

type ButtonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  href,
  onClick,
  type = "button",
  disabled,
  title,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
