# Fakturowanie przez Księgowość ING

Stan na 2026-09-20. Księgowość firmy prowadzona jest w **Księgowości ING**,
która udostępnia publiczne API do wystawiania faktur. To zmienia plan: **nie
budujemy własnego generatora faktur ani własnej integracji z KSeF** — obie te
rzeczy ING ma po swojej stronie.

## Dlaczego tędy, a nie własny PDF

Własny generator oznaczałby trzy rzeczy do utrzymania: numerację zgodną
z art. 106e, składowanie dokumentów i integrację z KSeF. Do tego faktury
musiałyby i tak trafić do ING, żeby w ogóle wejść do ksiąg — czyli podwójna
ewidencja i ręczne przepisywanie. Wystawianie przez API ING daje jeden obieg:
dokument powstaje od razu w księgach, z właściwą numeracją i z KSeF-em
obsłużonym przez ING jako usługa dodatkowa.

## API, które mamy do dyspozycji

| | |
|---|---|
| Wystawienie | `POST https://ksiegowosc.ing.pl/v2/api/public/create-invoice` |
| Pobranie PDF | `GET https://ksiegowosc.ing.pl/v2/api/public/download-invoice/{id}/pdf` |
| Uwierzytelnienie | nagłówek `ApiUserCompanyRoleKey` |
| Klucz | panel ING: **Dane i Ustawienia → Integracje** |

## Dlaczego nasz model danych już pasuje

To nie przypadek — dane nabywcy rozbiliśmy dokładnie tak, jak wymaga tego
faktura ustrukturyzowana, a ING oczekuje tego samego kształtu:

| Pole ING | Nasze (`lib/invoice.ts`) |
|---|---|
| `fullName` | `buyerName()` — firma albo imię i nazwisko |
| `addressStreet` | `street` |
| `postCode` / `city` | `postalCode` / `city` |
| `countryCode` | `country` |
| `taxNumber` / `taxCountryCode` | `nip` (znormalizowany) + prefiks kraju |
| `email` | konto użytkownika |

Najważniejsze: **`taxStake` w ING ma dokładnie te trzy przypadki, które już
rozróżniamy** w `vatTreatment()`:

| Nasz `treatment` | `taxStake` w ING |
|---|---|
| `standard` (23%) | `TAX_23` |
| `reverseCharge` (podatnik z UE, art. 28b) | `TAX_REVERSE_CHARGE` |
| `outOfScope` (spoza UE) | `TAX_NOT_LIABLE` |

Dlatego wystawienie faktury sprowadza się do przemapowania `InvoiceData`
i jednej pozycji na dokumencie.

## Gdzie to wpiąć

**W webhooku Stripe, po potwierdzonej zapłacie** — jest tam już zostawiony
`TODO(faktura)` w `app/api/platnosci/webhook/route.ts`. Świadomie nie
w checkoucie: fakturę wystawiamy do zapłaconej usługi, nie do zamiaru zapłaty.

Szkic przebiegu:

1. Webhook potwierdza `payment_status='paid'`.
2. **Sprawdź, czy faktura już istnieje** (`invoice_id IS NULL`) — Stripe potrafi
   dostarczyć to samo zdarzenie dwa razy, a duplikat faktury to korekta.
3. Wczytaj dane nabywcy (`loadInvoiceData` po stronie serwera / `fromRow`).
4. Zmapuj na payload ING: jedna pozycja `„Symulacja CFD FDS — {nazwa pliku}"`,
   `quantity: 1`, `unit: "usł."`, wartości netto/VAT/brutto z `price`
   i `vatTreatment()`, `method: "TRANSFER"`, `deadlineDate` = dzień wystawienia
   (usługa opłacona z góry).
5. Zapisz zwrócone `id` i link do PDF na zleceniu.
6. Zdarzenie `invoice` w dzienniku (`logEvent`) — etap jest już przewidziany
   w `migration_job_events.sql`.

## Czego brakuje do wdrożenia

1. **Migracja** — kolumny na zleceniu: `invoice_id`, `invoice_number`,
   `invoice_pdf_url`, `invoice_issued_at`.
2. **`lib/invoiceIng.ts`** — mapowanie `InvoiceData` + kwota → payload ING,
   wysyłka, obsługa błędów. Moduł czysty i otestowany tak samo jak
   `lib/invoice.ts`, bo mapowanie stawek VAT to miejsce, w którym błąd kosztuje
   korektę.
3. **Klucz** `ING_KSIEGOWOSC_API_KEY` w zmiennych środowiskowych projektu cloud.
4. **Pobieranie faktury przez klienta** — przycisk na karcie zlecenia
   i w Rozliczeniach, pobierający PDF przez nasz serwer (nie ujawniamy klucza
   przeglądarce).
5. **Zachowanie przy awarii ING** — płatność jest już przyjęta, więc nieudane
   wystawienie **nie może** wywrócić webhooka. Zapisujemy błąd w dzienniku
   i zostawiamy do ponowienia; brak faktury to sprawa do ręcznego dokończenia,
   nie powód do cofania płatności.

## Do potwierdzenia po Twojej stronie

- Czy usługa **KSeF w ING** jest wykupiona — od tego zależy, czy faktury trafią
  do KSeF automatycznie, czy trzeba je wysyłać osobno.
- Numeracja: czy faktury z API mają wpadać w tę samą serię, co wystawiane
  ręcznie, czy w osobną (np. `FDSRUN/…`). To ustawienie po stronie ING.
- Rachunek bankowy na fakturze — API przyjmuje `bankAccounts`; przy płatności
  kartą przez Stripe to pole jest informacyjne, ale musi się zgadzać z ksiegami.

---

Źródła: [OpenAPI ING Księgowość](https://www.ingksiegowosc.pl/uslugi-dodatkowe/integracje-e-commerce/api),
[KSeF w ING Księgowość](https://www.ingksiegowosc.pl/uslugi-dodatkowe/krajowy-system-e-faktur)
