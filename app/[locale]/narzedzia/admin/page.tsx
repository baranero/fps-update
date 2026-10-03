import { legacyRedirectPage } from "@/lib/legacyRedirect";

// Stary adres konta — dziś /symulacje/admin (patrz lib/legacyRedirect.ts).
export default legacyRedirectPage("/symulacje/admin");
