import { describe, expect, it } from "vitest";
import {
  EMPTY_INVOICE,
  addressLines,
  buyerName,
  formatNip,
  formatPostalCode,
  fromRow,
  grossAmount,
  invoiceCompletion,
  isEuCountry,
  isInvoiceComplete,
  isValidNip,
  isValidPostalCode,
  isValidVatId,
  normalizeNip,
  requiredFields,
  toRow,
  validateInvoice,
  vatTreatment,
  type InvoiceData,
} from "@/lib/invoice";

// NIP-y użyte w testach mają poprawną cyfrę kontrolną (wagi 6,5,7,2,3,4,5,6,7).
const VALID_NIP = "1234563218";
const VALID_NIP_2 = "5252248481";

function make(over: Partial<InvoiceData> = {}): InvoiceData {
  return { ...EMPTY_INVOICE, ...over };
}

describe("isValidNip", () => {
  it("przyjmuje NIP z poprawną cyfrą kontrolną", () => {
    expect(isValidNip(VALID_NIP)).toBe(true);
    expect(isValidNip(VALID_NIP_2)).toBe(true);
  });

  it("przyjmuje zapis z myślnikami i prefiksem PL", () => {
    expect(isValidNip("123-456-32-18")).toBe(true);
    expect(isValidNip("PL 1234563218")).toBe(true);
    expect(isValidNip(" 1234563218 ")).toBe(true);
  });

  it("odrzuca literówkę w cyfrze kontrolnej", () => {
    expect(isValidNip("1234563217")).toBe(false);
    expect(isValidNip("1234563219")).toBe(false);
  });

  it("odrzuca złą długość i znaki niebędące cyframi", () => {
    expect(isValidNip("123456321")).toBe(false);
    expect(isValidNip("12345632180")).toBe(false);
    expect(isValidNip("12345632AB")).toBe(false);
    expect(isValidNip("")).toBe(false);
  });

  // Ten numer przechodzi sumę kontrolną, ale nie jest nadawany — a bywał
  // wpisywany jako podpowiedź w starym formularzu.
  it("odrzuca ciągi jednakowych cyfr", () => {
    expect(isValidNip("0000000000")).toBe(false);
    expect(isValidNip("1111111111")).toBe(false);
  });

  it("odrzuca numery, dla których reszta z dzielenia wynosi 10", () => {
    // 8888888888 → suma 8·45 = 360, 360 % 11 = 8 ≠ 10; szukamy realnego przypadku
    // przez przeszukanie: wystarczy, że funkcja nigdy nie zwróci true dla reszty 10.
    for (let i = 0; i < 2000; i++) {
      const base = String(1000000000 + i).slice(0, 9);
      const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
      const sum = weights.reduce((a, w, j) => a + w * Number(base[j]), 0);
      if (sum % 11 === 10) {
        for (let d = 0; d <= 9; d++) expect(isValidNip(base + d)).toBe(false);
      }
    }
  });
});

describe("formatNip / normalizeNip", () => {
  it("sprowadza do samych cyfr i z powrotem do zapisu z fakturą", () => {
    expect(normalizeNip("PL 123-456-32-18")).toBe(VALID_NIP);
    expect(formatNip(VALID_NIP)).toBe("123-456-32-18");
  });

  it("nie psuje wartości, której nie umie sformatować", () => {
    expect(formatNip("abc")).toBe("abc");
  });
});

describe("isValidVatId", () => {
  it("przyjmuje poprawne numery VAT-UE", () => {
    expect(isValidVatId("DE123456789")).toBe(true);
    expect(isValidVatId("NL123456789B01")).toBe(true);
    expect(isValidVatId("ATU12345678")).toBe(true);
    expect(isValidVatId("CZ12345678")).toBe(true);
  });

  it("przyjmuje grecki prefiks EL obok kodu ISO GR", () => {
    expect(isValidVatId("EL123456789")).toBe(true);
    expect(isValidVatId("GR123456789")).toBe(true);
  });

  it("dla PL wymaga poprawnej sumy kontrolnej, nie samych 10 cyfr", () => {
    expect(isValidVatId(`PL${VALID_NIP}`)).toBe(true);
    expect(isValidVatId("PL1234563217")).toBe(false);
  });

  it("odrzuca brak prefiksu, zły kraj i zły format", () => {
    expect(isValidVatId("123456789")).toBe(false);
    expect(isValidVatId("XX123456789")).toBe(false);
    expect(isValidVatId("DE12345")).toBe(false);
  });

  it("znosi spacje i myślniki oraz małe litery", () => {
    expect(isValidVatId("de 123-456-789")).toBe(true);
  });
});

describe("kod pocztowy", () => {
  it("wymaga formatu NN-NNN tylko dla Polski", () => {
    expect(isValidPostalCode("00-950", "PL")).toBe(true);
    expect(isValidPostalCode("00950", "PL")).toBe(false);
    expect(isValidPostalCode("SW1A 1AA", "GB")).toBe(true);
  });

  it("dostawia myślnik w polskim kodzie", () => {
    expect(formatPostalCode("00950", "PL")).toBe("00-950");
    expect(formatPostalCode("00-950", "PL")).toBe("00-950");
    expect(formatPostalCode("SW1A 1AA", "GB")).toBe("SW1A 1AA");
  });
});

describe("requiredFields", () => {
  it("dla osoby prywatnej nie wymaga NIP-u (art. 106b ust. 3)", () => {
    const fields = requiredFields("person");
    expect(fields).not.toContain("nip");
    expect(fields).toContain("fullName");
  });

  it("dla firmy krajowej wymaga nazwy i NIP-u (art. 106e ust. 1 pkt 3 i 5)", () => {
    expect(requiredFields("company")).toEqual(
      expect.arrayContaining(["company", "nip", "street", "postalCode", "city", "country"])
    );
  });

  it("dla nabywcy z UE wymaga numeru VAT-UE — bez niego nie ma odwrotnego obciążenia", () => {
    expect(requiredFields("eu")).toContain("nip");
  });

  it("dla nabywcy spoza UE nie wymaga numeru podatkowego", () => {
    expect(requiredFields("nonEu")).not.toContain("nip");
  });
});

describe("validateInvoice", () => {
  const complete = make({
    buyerType: "company",
    company: "Fire Protection Sp. z o.o.",
    nip: VALID_NIP,
    street: "ul. Przykładowa 1",
    postalCode: "00-950",
    city: "Warszawa",
    country: "PL",
  });

  it("komplet firmowy przechodzi bez błędów", () => {
    expect(validateInvoice(complete)).toEqual({});
    expect(isInvoiceComplete(complete)).toBe(true);
  });

  it("wskazuje brakujące pola po nazwie", () => {
    const errors = validateInvoice(make({ buyerType: "company" }));
    expect(errors.company).toBe("required");
    expect(errors.nip).toBe("required");
    expect(errors.city).toBe("required");
  });

  it("rozpoznaje zły NIP osobno od braku NIP-u", () => {
    expect(validateInvoice({ ...complete, nip: "1234563217" }).nip).toBe("nipInvalid");
    expect(validateInvoice({ ...complete, nip: "" }).nip).toBe("required");
  });

  it("dla nabywcy z UE sprawdza numer jako VAT-UE, nie jako NIP", () => {
    const eu = { ...complete, buyerType: "eu" as const, country: "DE", nip: "DE123456789", postalCode: "10115" };
    expect(validateInvoice(eu)).toEqual({});
    expect(validateInvoice({ ...eu, nip: VALID_NIP }).nip).toBe("vatIdInvalid");
  });

  it("wyłapuje zły kod pocztowy", () => {
    expect(validateInvoice({ ...complete, postalCode: "00950" }).postalCode).toBe("postalInvalid");
  });

  it("osoba prywatna z adresem jest kompletna bez NIP-u", () => {
    const person = make({
      buyerType: "person",
      fullName: "Jan Kowalski",
      street: "ul. Kwiatowa 5",
      postalCode: "31-001",
      city: "Kraków",
    });
    expect(isInvoiceComplete(person)).toBe(true);
  });
});

describe("invoiceCompletion", () => {
  it("liczy postęp wypełniania wymaganych pól", () => {
    // Pusty komplet ma już wypełniony kraj (PL z domyślnych) — stąd 1 z 6.
    expect(invoiceCompletion(make({ buyerType: "company" })).filled).toBe(1);
    const half = make({ buyerType: "company", company: "X", nip: VALID_NIP, country: "PL" });
    const c = invoiceCompletion(half);
    expect(c.filled).toBe(3);
    expect(c.total).toBe(6);
    expect(c.pct).toBe(50);
  });

  it("komplet to 100%", () => {
    const full = make({
      buyerType: "person", fullName: "Jan Kowalski", street: "ul. Kwiatowa 5",
      postalCode: "31-001", city: "Kraków", country: "PL",
    });
    expect(invoiceCompletion(full).pct).toBe(100);
  });
});

describe("VAT", () => {
  it("krajowy nabywca — 23%", () => {
    const d = make({ buyerType: "company" });
    expect(vatTreatment(d)).toEqual({ treatment: "standard", rate: 0.23 });
    expect(grossAmount(100, d)).toBe(123);
  });

  it("podatnik z UE — odwrotne obciążenie, 0%", () => {
    const d = make({ buyerType: "eu", country: "DE" });
    expect(vatTreatment(d).treatment).toBe("reverseCharge");
    expect(grossAmount(100, d)).toBe(100);
  });

  it("spoza UE — poza zakresem polskiego VAT", () => {
    const d = make({ buyerType: "nonEu", country: "US" });
    expect(vatTreatment(d).treatment).toBe("outOfScope");
    expect(grossAmount(100, d)).toBe(100);
  });

  it("osoba prywatna z kraju — 23%", () => {
    expect(vatTreatment(make({ buyerType: "person" })).rate).toBe(0.23);
  });

  it("zaokrągla brutto do grosza", () => {
    expect(grossAmount(19.99, make({ buyerType: "company" }))).toBe(24.59);
  });
});

describe("isEuCountry", () => {
  it("rozpoznaje państwa UE, odrzuca resztę", () => {
    expect(isEuCountry("DE")).toBe(true);
    expect(isEuCountry("pl")).toBe(true);
    expect(isEuCountry("GB")).toBe(false);
    expect(isEuCountry("US")).toBe(false);
  });
});

describe("prezentacja adresu", () => {
  it("składa blok adresowy faktury", () => {
    const d = make({
      buyerType: "company", company: "Fire Protection Sp. z o.o.", fullName: "Jan Kowalski",
      nip: VALID_NIP, street: "ul. Przykładowa 1", postalCode: "00950", city: "Warszawa", country: "PL",
    });
    expect(addressLines(d)).toEqual([
      "Fire Protection Sp. z o.o.",
      "Jan Kowalski",
      "ul. Przykładowa 1",
      "00-950 Warszawa",
      "NIP 123-456-32-18",
    ]);
  });

  it("dla zagranicy dopisuje kraj i numer VAT", () => {
    const d = make({
      buyerType: "eu", company: "Brandschutz GmbH", nip: "DE123456789",
      street: "Hauptstr. 1", postalCode: "10115", city: "Berlin", country: "DE",
    });
    const lines = addressLines(d);
    expect(lines).toContain("DE");
    expect(lines).toContain("VAT DE123456789");
  });

  it("nazwą nabywcy jest firma, a dla osoby prywatnej imię i nazwisko", () => {
    expect(buyerName(make({ buyerType: "company", company: "ACME", fullName: "Jan" }))).toBe("ACME");
    expect(buyerName(make({ buyerType: "person", company: "ACME", fullName: "Jan" }))).toBe("Jan");
  });
});

describe("mapowanie na kolumny bazy", () => {
  it("czyta wiersz i zapisuje go z powrotem bez utraty danych", () => {
    const row = {
      buyer_type: "company", company: "ACME", full_name: "Jan Kowalski", nip: "123-456-32-18",
      street: "ul. Przykładowa 1", postal_code: "00950", city: "Warszawa", country: "pl", phone: "+48 600 100 200",
    };
    const data = fromRow(row);
    expect(data.buyerType).toBe("company");
    const back = toRow(data);
    expect(back.nip).toBe(VALID_NIP);
    expect(back.postal_code).toBe("00-950");
    expect(back.country).toBe("PL");
  });

  it("konto sprzed rozbicia adresu nie traci starej wartości", () => {
    const data = fromRow({ address: "ul. Stara 7, 00-001 Warszawa", nip: VALID_NIP });
    expect(data.street).toBe("ul. Stara 7, 00-001 Warszawa");
    // Bez zapisanego typu, ale z NIP-em — traktujemy jak firmę.
    expect(data.buyerType).toBe("company");
  });

  it("puste konto daje pusty komplet, a nie wyjątek", () => {
    expect(fromRow(null)).toEqual(EMPTY_INVOICE);
    expect(fromRow({}).buyerType).toBe("person");
  });
});
