// ─── Dane nabywcy do faktury ─────────────────────────────────────────────────
//
// Jedno źródło prawdy o tym, JAKIE dane są potrzebne do wystawienia faktury i
// KIEDY komplet jest kompletny. Moduł jest czysty (bez Reacta, bez env, bez
// bazy) — korzysta z niego formularz w przeglądarce, walidacja w API i podgląd
// w panelu admina, więc nikt nie sprawdza NIP-u po swojemu.
//
// Podstawa prawna wymaganych pól — ustawa z 11.03.2004 o podatku od towarów
// i usług (t.j. Dz.U. 2024 poz. 361):
//
//   art. 106e ust. 1 pkt 3  — imię i nazwisko lub nazwa nabywcy oraz jego ADRES,
//   art. 106e ust. 1 pkt 5  — NIP nabywcy (numer identyfikujący go na potrzeby
//                             podatku), przy sprzedaży dla podatnika,
//   art. 106b ust. 3        — fakturę dla osoby prywatnej wystawia się na
//                             żądanie; NIP wtedy nie jest wymagany,
//   art. 106e ust. 1 pkt 18 — adnotacja „odwrotne obciążenie" przy usłudze dla
//                             podatnika z innego państwa UE (miejsce świadczenia
//                             wg art. 28b — siedziba nabywcy).
//
// Rozbicie adresu na ulicę / kod / miejscowość / kraj nie jest naszą fanaberią:
// takiego kształtu wymaga struktura faktury ustrukturyzowanej FA(2) w Krajowym
// Systemie e-Faktur. Jeden wolny „adres" trzeba by przed wysyłką rozcinać
// heurystyką, a to się nie udaje na adresach zagranicznych.

// ─── Model danych ────────────────────────────────────────────────────────────

/** Kim jest nabywca — decyduje, które pola są wymagane i jak liczy się VAT. */
export type BuyerType =
  | "company"   // podatnik krajowy — NIP wymagany, faktura z 23% VAT
  | "person"    // osoba prywatna — bez NIP-u (art. 106b ust. 3)
  | "eu"        // podatnik z UE — VAT-UE, odwrotne obciążenie (art. 28b)
  | "nonEu";    // nabywca spoza UE — poza zakresem polskiego VAT

export interface InvoiceData {
  buyerType: BuyerType;
  /** Nazwa firmy — wymagana dla `company` / `eu` / `nonEu`. */
  company: string;
  /** Imię i nazwisko — wymagane dla `person`, przy firmie to osoba kontaktowa. */
  fullName: string;
  /** NIP (PL, 10 cyfr) albo numer VAT-UE z prefiksem kraju. */
  nip: string;
  street: string;
  postalCode: string;
  city: string;
  /** Kod ISO 3166-1 alpha-2, wersalikami. */
  country: string;
  phone: string;
}

export const EMPTY_INVOICE: InvoiceData = {
  buyerType: "company",
  company: "",
  fullName: "",
  nip: "",
  street: "",
  postalCode: "",
  city: "",
  country: "PL",
  phone: "",
};

// ─── Kraje ───────────────────────────────────────────────────────────────────

/** Państwa członkowskie UE — decydują o odwrotnym obciążeniu. */
export const EU_COUNTRIES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
] as const;

export function isEuCountry(code: string): boolean {
  return (EU_COUNTRIES as readonly string[]).includes(code.toUpperCase());
}

// ─── NIP ─────────────────────────────────────────────────────────────────────

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

/** Same cyfry — NIP bywa wpisywany jako 123-456-32-18 albo „PL 1234563218". */
export function normalizeNip(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^PL/i, "").trim();
}

/**
 * NIP z sumą kontrolną (Ordynacja podatkowa — cyfra kontrolna liczona modulo 11
 * z wag 6,5,7,2,3,4,5,6,7). Literówka w NIP-ie to faktura do korekty, więc
 * sprawdzamy ją tu, a nie dopiero u księgowej.
 */
export function isValidNip(raw: string): boolean {
  const nip = normalizeNip(raw);
  if (!/^\d{10}$/.test(nip)) return false;
  // Same cyfry — NIP-y w rodzaju 0000000000 przechodzą sumę kontrolną, a nie istnieją.
  if (/^(\d)\1{9}$/.test(nip)) return false;

  const sum = NIP_WEIGHTS.reduce((acc, w, i) => acc + w * Number(nip[i]), 0);
  const check = sum % 11;
  // Reszta 10 nie ma reprezentacji w jednej cyfrze — taki numer nie jest nadawany.
  return check !== 10 && check === Number(nip[9]);
}

/** Zapis z myślnikami: 123-456-32-18 — tak NIP wygląda na fakturze. */
export function formatNip(raw: string): string {
  const nip = normalizeNip(raw);
  if (!/^\d{10}$/.test(nip)) return raw.trim();
  return `${nip.slice(0, 3)}-${nip.slice(3, 6)}-${nip.slice(6, 8)}-${nip.slice(8)}`;
}

// ─── Numer VAT-UE ────────────────────────────────────────────────────────────
//
// Wzorce z VIES. Pilnujemy wyłącznie formatu — istnienie numeru potwierdza
// dopiero odpytanie VIES, którego nie robimy w formularzu.
const VAT_EU_PATTERNS: Record<string, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^[01]\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-Z0-9]{2}\d{9}$/,
  GR: /^\d{9}$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^(\d{7}[A-Z]{1,2}|\d[A-Z+*]\d{5}[A-Z])$/,
  IT: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
};

export function normalizeVatId(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Numer VAT-UE z prefiksem kraju, np. DE123456789. Grecja ma w VIES prefiks EL,
 * choć jej kod ISO to GR — przyjmujemy oba, bo klient wpisze ten ze swojej faktury.
 */
export function isValidVatId(raw: string): boolean {
  const vat = normalizeVatId(raw);
  const match = vat.match(/^([A-Z]{2})(.+)$/);
  if (!match) return false;
  const prefix = match[1] === "EL" ? "GR" : match[1];
  const pattern = VAT_EU_PATTERNS[prefix];
  if (!pattern) return false;
  // PL w formie VAT-UE nadal musi mieć poprawną sumę kontrolną.
  if (prefix === "PL") return isValidNip(match[2]);
  return pattern.test(match[2]);
}

// ─── Kod pocztowy ────────────────────────────────────────────────────────────

/** Polski kod pocztowy NN-NNN. Zagraniczne formaty są zbyt różnorodne, by je narzucać. */
export function isValidPostalCode(raw: string, country: string): boolean {
  const code = raw.trim();
  if (!code) return false;
  if (country.toUpperCase() === "PL") return /^\d{2}-\d{3}$/.test(code);
  return code.length >= 3;
}

/** 00000 → 00-000. Ludzie wpisują kod bez myślnika i to jest normalne. */
export function formatPostalCode(raw: string, country: string): string {
  const code = raw.trim();
  if (country.toUpperCase() !== "PL") return code;
  const digits = code.replace(/[\s-]/g, "");
  return /^\d{5}$/.test(digits) ? `${digits.slice(0, 2)}-${digits.slice(2)}` : code;
}

// ─── Walidacja kompletu ──────────────────────────────────────────────────────

export type InvoiceField = keyof InvoiceData;

/** Kod błędu — etykietę renderuje warstwa i18n (namespace `profile.invoice.err`). */
export type InvoiceErrorCode =
  | "required"
  | "nipInvalid"
  | "vatIdInvalid"
  | "postalInvalid";

export type InvoiceErrors = Partial<Record<InvoiceField, InvoiceErrorCode>>;

/** Pola wymagane dla danego typu nabywcy — jedno miejsce, z którego czyta i formularz, i API. */
export function requiredFields(buyerType: BuyerType): InvoiceField[] {
  const address: InvoiceField[] = ["street", "postalCode", "city", "country"];
  switch (buyerType) {
    case "person":
      // art. 106b ust. 3 — imię, nazwisko i adres wystarczą, NIP-u nie ma.
      return ["fullName", ...address];
    case "company":
      return ["company", "nip", ...address];
    case "eu":
      // Odwrotne obciążenie wymaga numeru VAT-UE — bez niego usługa nie może
      // być rozliczona przez nabywcę i VAT zostaje po naszej stronie.
      return ["company", "nip", ...address];
    case "nonEu":
      return ["company", ...address];
  }
}

export function validateInvoice(data: InvoiceData): InvoiceErrors {
  const errors: InvoiceErrors = {};
  const required = requiredFields(data.buyerType);

  for (const field of required) {
    if (!String(data[field] ?? "").trim()) errors[field] = "required";
  }

  if (!errors.nip && data.nip.trim()) {
    if (data.buyerType === "company" && !isValidNip(data.nip)) {
      errors.nip = "nipInvalid";
    } else if (data.buyerType === "eu" && !isValidVatId(data.nip)) {
      errors.nip = "vatIdInvalid";
    }
  }

  if (!errors.postalCode && data.postalCode.trim() && !isValidPostalCode(data.postalCode, data.country)) {
    errors.postalCode = "postalInvalid";
  }

  return errors;
}

export function isInvoiceComplete(data: InvoiceData): boolean {
  return Object.keys(validateInvoice(data)).length === 0;
}

/** Ile wymaganych pól jest już wypełnionych — zasila pasek postępu w panelu. */
export function invoiceCompletion(data: InvoiceData): { filled: number; total: number; pct: number } {
  const required = requiredFields(data.buyerType);
  const errors = validateInvoice(data);
  const filled = required.filter((f) => !errors[f]).length;
  return {
    filled,
    total: required.length,
    pct: required.length ? Math.round((filled / required.length) * 100) : 100,
  };
}

// ─── Prezentacja ─────────────────────────────────────────────────────────────

/** Nazwa nabywcy tak, jak ma trafić na fakturę. */
export function buyerName(data: InvoiceData): string {
  return (data.buyerType === "person" ? data.fullName : data.company || data.fullName).trim();
}

/** Adres w blok wierszy — tak, jak drukuje się go na fakturze. */
export function addressLines(data: InvoiceData): string[] {
  const lines: string[] = [];
  const name = buyerName(data);
  if (name) lines.push(name);
  if (data.buyerType !== "person" && data.fullName.trim() && data.company.trim()) {
    lines.push(data.fullName.trim());
  }
  if (data.street.trim()) lines.push(data.street.trim());

  const cityLine = [formatPostalCode(data.postalCode, data.country), data.city.trim()]
    .filter(Boolean)
    .join(" ");
  if (cityLine) lines.push(cityLine);

  if (data.country && data.country.toUpperCase() !== "PL") lines.push(data.country.toUpperCase());

  const taxId = data.nip.trim();
  if (taxId) {
    lines.push(data.buyerType === "company" ? `NIP ${formatNip(taxId)}` : `VAT ${normalizeVatId(taxId)}`);
  }
  return lines;
}

/**
 * Czy do zlecenia doliczamy polski VAT. Usługa obliczeniowa dla podatnika z UE
 * idzie na odwrotne obciążenie (art. 28b), a poza UE jest poza zakresem
 * polskiego VAT — w obu przypadkach stawka to 0%, ale z innej podstawy.
 */
export type VatTreatment = "standard" | "reverseCharge" | "outOfScope";

export function vatTreatment(data: InvoiceData): { treatment: VatTreatment; rate: number } {
  if (data.buyerType === "eu") return { treatment: "reverseCharge", rate: 0 };
  if (data.buyerType === "nonEu") return { treatment: "outOfScope", rate: 0 };
  return { treatment: "standard", rate: 0.23 };
}

/** Kwota brutto od netto wg sytuacji podatkowej nabywcy. */
export function grossAmount(net: number, data: InvoiceData): number {
  return Math.round(net * (1 + vatTreatment(data).rate) * 100) / 100;
}

// ─── Mapowanie na kolumny `profiles` ─────────────────────────────────────────
//
// Baza trzyma płaskie kolumny (migration_invoice_data.sql), a aplikacja pracuje
// na `InvoiceData`. Konwersja siedzi tutaj, żeby nazwy kolumn nie rozlazły się
// po komponentach.

export interface InvoiceRow {
  buyer_type: string | null;
  company: string | null;
  full_name: string | null;
  nip: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  /** Adres sprzed rozbicia na pola — używany tylko przy migracji danych. */
  address?: string | null;
}

const BUYER_TYPES: BuyerType[] = ["company", "person", "eu", "nonEu"];

export function fromRow(row: Partial<InvoiceRow> | null | undefined): InvoiceData {
  if (!row) return { ...EMPTY_INVOICE };
  const buyerType = BUYER_TYPES.includes(row.buyer_type as BuyerType)
    ? (row.buyer_type as BuyerType)
    : // Bez zapisanego typu zgadujemy po tym, co jest: NIP ⇒ firma.
      (row.nip ?? "").trim() ? "company" : "person";

  return {
    buyerType,
    company: row.company ?? "",
    fullName: row.full_name ?? "",
    nip: row.nip ?? "",
    // Konta założone przed rozbiciem adresu mają wszystko w jednym polu —
    // pokazujemy je w „ulicy", żeby dane nie zniknęły użytkownikowi z oczu.
    street: row.street ?? row.address ?? "",
    postalCode: row.postal_code ?? "",
    city: row.city ?? "",
    country: row.country ?? "PL",
    phone: row.phone ?? "",
  };
}

export function toRow(data: InvoiceData): InvoiceRow {
  return {
    buyer_type: data.buyerType,
    company: data.company.trim(),
    full_name: data.fullName.trim(),
    nip: data.buyerType === "company" ? normalizeNip(data.nip) : normalizeVatId(data.nip),
    street: data.street.trim(),
    postal_code: formatPostalCode(data.postalCode, data.country),
    city: data.city.trim(),
    country: data.country.trim().toUpperCase(),
    phone: data.phone.trim(),
  };
}
