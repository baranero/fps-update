# FP Solutions / FDSRun

Jedno repozytorium, **dwa produkty** wdrażane jako dwa projekty Vercel:

| Produkt | Domena | Co to jest |
|---|---|---|
| **FP Solutions** | `fp-solutions.pl` | Witryna usług ppoż. + publiczne kalkulatory inżynierskie (PL) |
| **FDSRun** | `fdsrun.com` | Serwis chmurowy: analiza pliku `.fds`, wycena, obliczenia CFD na maszynie w chmurze, wyniki i rozliczenie (PL + EN) |

O tym, który produkt serwuje dany projekt, decyduje **`NEXT_PUBLIC_SITE_MODE`**
ustawiony przy budowaniu (`cloud` albo `marketing`). Middleware przekierowuje 301
treść „obcą" danemu projektowi, żeby te same strony nie indeksowały się dwa razy.
Bez tej zmiennej (dev, preview) rozpoznanie idzie po ścieżce — patrz
[`lib/cloud.ts`](lib/cloud.ts), jedyne źródło prawdy dla mapy ścieżek.

---

## Start

```bash
npm ci
cp .env.local.example .env.local   # uzupełnij wartości
npm run preflight                  # co jest skonfigurowane, a co nie ruszy
npm run sprawdz-baze               # których migracji brakuje na tej bazie
npm run dev
```

W dev oba produkty stoją pod jednym adresem: witryna usługowa pod `/`,
landing chmury pod `/chmura`.

## Polecenia

| Polecenie | Do czego |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Testy logiki (vitest) — cennik, planer maszyn, MPI, CNBOP, faktury, bramka dostępu |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preflight` | **Gotowość wdrożenia**: które obszary serwisu działają przy obecnej konfiguracji |
| `npm run sprawdz-baze` | **Stan migracji**: których migracji brakuje na tej bazie (tylko odczyt) |
| `npm run przelicz-ceny` | Przeliczenie cennika na historii zleceń (`--zapisz` zapisuje) |
| `npm run diagnoza-estymacji` | Porównanie prognoz czasu z rzeczywistością |

## Gdzie co mieszka

```
app/[locale]/
  symulacje/          przestrzeń konta FDSRun: pulpit, kreator, zlecenie, historia,
                      rozliczenia, statystyki, profil, panel admina
  narzedzia/          publiczne kalkulatory (fp-solutions.pl)
  api/                trasy serwerowe
lib/
  access.ts           kto może uruchamiać obliczenia (reguła, izomorficzna)
  cloud.ts            mapa ścieżek: chmura vs witryna usługowa + stare adresy
  env.ts              rejestr zmiennych środowiskowych (czyta go preflight)
  status.ts           statusy zleceń: tony, kolory, grupy
  fds/                parser .fds, planer maszyn, cennik, kalibracja, czytanie logu
  hetzner/            maszyny liczące i magazyn wyników
  invoice.ts          dane nabywcy i VAT wg art. 106e ustawy o VAT / KSeF FA(2)
components/Cloud/     system wizualny chmury (tokeny fr-*), wykresy, konsola
supabase/             migracje SQL — uruchamiane ręcznie w SQL Editorze
docs/                 wdrożenie, płatności, fakturowanie
messages/             tłumaczenia; EN scala się na PL (braki spadają na polski)
```

## Zasady, które łatwo złamać

- **Klient widzi CENĘ, nigdy kosztu.** Koszt maszyn i symbol dostawcy zostają po
  stronie serwera — także w danych wysyłanych do przeglądarki.
- **Plik parsuje serwer.** Kreator liczy wycenę w przeglądarce dla podglądu;
  `/api/symulacje/submit` parsuje plik jeszcze raz u siebie i planuje od zera.
- **Bramka własności zlecenia** ma jedno wejście: `lib/utils/caseAccess.ts`.
  Nowy endpoint na `/api/symulacje/[caseId]/*` musi przez nie przejść.
- **Mapa ścieżek w jednym pliku.** Middleware importuje `lib/cloud.ts` — nie
  dopisuj drugiej listy.
- **Tokeny `fr-*` zamiast `dark:`** w przestrzeni chmury: motyw przełącza się sam.

## Wdrożenie

Przebieg krok po kroku: **[`docs/wdrozenie.md`](docs/wdrozenie.md)**.
Płatności: [`docs/platnosci-stripe.md`](docs/platnosci-stripe.md).
Faktury: [`docs/fakturowanie-ing.md`](docs/fakturowanie-ing.md).
