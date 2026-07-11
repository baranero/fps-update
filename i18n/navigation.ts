import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Lokalizowane odpowiedniki Link / useRouter / usePathname / redirect —
// automatycznie zachowują aktywny język w adresie.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
