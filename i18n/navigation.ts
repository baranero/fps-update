import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Lokalizowane odpowiedniki Link / useRouter / usePathname —
// automatycznie zachowują aktywny język w adresie.
export const { Link, usePathname, useRouter } =
  createNavigation(routing);
