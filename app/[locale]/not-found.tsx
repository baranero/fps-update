import Link from "next/link";
import { SITE_MODE } from "@/lib/cloud";

// Strona wspólna dla obu projektów. Drugi przycisk musi prowadzić tam, gdzie
// użytkownik faktycznie jest: na fdsrun.com do pulpitu chmury, na
// fp-solutions.pl do narzędzi projektanta. Wcześniej zawsze szedł na
// /narzedzia, więc na chmurze middleware odbijał go 301 na drugą domenę.
export default function NotFound() {
  const secondary =
    SITE_MODE === "cloud"
      ? { href: "/symulacje", label: "Pulpit symulacji" }
      : { href: "/narzedzia", label: "Panel narzędzi" };

  return (
    <section className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        <p className="mb-6 select-none font-heading text-fr-hero leading-none text-hairline">
          404
        </p>

        <h1 className="mb-3 font-heading text-fr-h2 text-ink">
          Strona nie istnieje
        </h1>
        <p className="mb-8 text-fr-body text-muted">
          Adres, który wpisałeś, nie istnieje lub został przeniesiony.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-panel bg-primary px-5 py-2.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90"
          >
            Strona główna
          </Link>
          <Link
            href={secondary.href}
            className="rounded-panel border border-hairline bg-panel px-5 py-2.5 text-fr-body font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary"
          >
            {secondary.label}
          </Link>
        </div>

      </div>
    </section>
  );
}
