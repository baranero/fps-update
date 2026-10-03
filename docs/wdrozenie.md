# Wdrożenie FDSRun do życia

Stan na 2026-09-22. Dokument prowadzi od „kod działa u mnie" do „obcy klient
sam policzył model i zapłacił". Kolejność ma znaczenie: każdy krok zakłada
poprzedni.

Jedno polecenie mówi, gdzie jesteś:

```bash
npm run preflight
```

Wypisuje obszary serwisu (rdzeń, poczta, obliczenia, płatności, cron), pokazuje
brakujące zmienne z wyjaśnieniem, **po co** każda jest, i wyłapuje zmienne
ustawione, a nieużywane przez kod. Źródłem jest rejestr [`lib/env.ts`](../lib/env.ts) —
nie ma drugiej listy, która mogłaby się rozjechać.

Drugie polecenie mówi to samo o bazie:

```bash
npm run sprawdz-baze
```

Sonduje schemat (tylko odczyt) i wypisuje, których migracji na tej bazie
brakuje — razem ze skutkiem każdego braku. Jest po co: migracje uruchamia się
ręcznie, a funkcje zapisujące **świadomie milczą** przy nieuruchomionej migracji,
żeby nie wywracać zlecenia. Rozjazd bazy z kodem nie daje więc żadnego sygnału
sam z siebie. Rejestr sond: [`lib/dbChecks.ts`](../lib/dbChecks.ts).

---

## Jak klient dziś przechodzi przez serwis

```
landing → kreator → wgranie .fds → analiza W PRZEGLĄDARCE → cena
   → [bramka] → konto → zgoda właściciela → uruchomienie
   → maszyna liczy → wyniki → płatność → faktura
```

Trzy rzeczy warto rozumieć, zanim ruszysz dalej:

1. **Analiza i wycena są publiczne.** Plik parsuje przeglądarka, serwer nie
   ponosi kosztu, więc cenę poznaje każdy — bez konta. To jest lejek.
2. **Bramka stoi na „Uruchom", nie na wejściu.** Rozstrzyga o niej kolumna
   `profiles.sim_access`, nie kod (patrz niżej).
3. **Płatność następuje PO obliczeniach**, według realnego zużycia maszyny.
   Dlatego uruchomienie jest kredytem i dlatego wymaga zgody właściciela.

---

## Krok 1. Migracje bazy

Uruchom w Supabase SQL Editor, w tej kolejności — każdy plik jest idempotentny
(`IF NOT EXISTS`), więc ponowne uruchomienie niczego nie zepsuje:

| Plik | Co dokłada |
|---|---|
| `migration_fds_submissions.sql` | tabela zleceń |
| `migration_hetzner_columns.sql` | koszt i czas życia maszyny |
| `migration_server_plan.sql` | plan maszyny przy zleceniu |
| `migration_payments.sql` | `payment_status`, `stripe_session_id` |
| `migration_reports.sql` | historia raportów z kalkulatorów |
| `migration_locale.sql` | język zlecenia (język maili) |
| `migration_append_fds_log.sql` | atomowe doklejanie logu |
| `migration_devc_stream.sql`, `migration_slice_stream.sql` | podgląd wyników na żywo |
| `migration_stall_watchdog.sql` | ślad postępu dla watchdoga |
| `migration_cleanup.sql` | znacznik skasowania wyników (retencja) |
| `migration_invoice_data.sql` | dane nabywcy w rozbiciu pod KSeF |
| `migration_job_events.sql` | dziennik zdarzeń + powód niepowodzenia |
| `migration_hrrpua.sql` | intensywność pożaru z pliku |
| `migration_price_backup.sql`, `migration_clear_failed_price.sql` | porządki w cenach |
| **`migration_sim_access.sql`** | **bramka uruchamiania obliczeń** |

Ostatnia jest nowa i bez niej **nikt poza właścicielem nie uruchomi obliczeń** —
kod schodzi wtedy na stan sprzed zmiany i wypisuje to w logu serwera.

**Kolejność nie ma znaczenia.** `migration_sim_access.sql` rozszerza ograniczenie
na `job_events` tylko wtedy, gdy ta tabela już istnieje; w przeciwnym razie
pomija ten krok, a `migration_job_events.sql` tworzy tabelę od razu z kompletem
etapów. (Pierwsza wersja robiła tu twardy `ALTER` i wywracała się na bazie bez
dziennika zdarzeń komunikatem `relation "public.job_events" does not exist`.)

> Supabase SQL Editor uruchamia skrypt w **jednej transakcji**: błąd w dowolnym
> miejscu wycofuje cały plik, także to, co wykonało się wcześniej. Po poprawce
> uruchom plik jeszcze raz w całości.

Sprawdzenie, co faktycznie jest na bazie: `npm run sprawdz-baze`.

## Krok 2. Zmienne środowiskowe

```bash
cp .env.local.example .env.local   # wzorzec generowany z lib/env.ts
npm run preflight
```

Na Vercelu ustaw je **osobno dla każdego z dwóch projektów**:

| Zmienna | marketing (fp-solutions.pl) | cloud (fdsrun.com) |
|---|---|---|
| `NEXT_PUBLIC_SITE_MODE` | `marketing` | `cloud` |
| Supabase (3 klucze) | — | ✔ |
| Hetzner (maszyny + magazyn) | — | ✔ |
| `WEBHOOK_SECRET`, `CRON_SECRET` | — | ✔ |
| Stripe (2 klucze) | — | ✔ |
| `RESEND_API_KEY`, `ADMIN_EMAIL`, `MAIL_FROM` | — | ✔ |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL` | ✔ | ✔ |

`NEXT_PUBLIC_SITE_MODE` czytane jest **przy budowaniu** — po zmianie wdróż ponownie.

> `NEXT_PUBLIC_ADMIN_EMAIL` **nie jest już używane** i należy je usunąć.
> Adres właściciela nie ma po co leżeć w bundlu przeglądarki; o uprawnieniach
> mówi teraz `GET /api/dostep`.

## Krok 3. Otwarcie bramki uruchamiania

Bramka nie jest zmienną środowiskową ani wdrożeniem — to decyzja w panelu.

**Stany konta** (`profiles.sim_access`):

| Stan | Znaczenie |
|---|---|
| `none` | konto nigdy nie prosiło o dostęp (domyślny) |
| `requested` | klient poprosił, czeka na decyzję |
| `granted` | może uruchamiać obliczenia |
| `blocked` | odmowa; kolejna prośba niemożliwa |

**Jak to wygląda z obu stron:**

- Klient kończy kreator, widzi cenę i — zależnie od stanu — albo ścieżkę do
  konta, albo przycisk „Poproś o dostęp" z polem na dwa zdania o projekcie.
- Właściciel dostaje maila, a na pulpicie panelu, w sekcji „Wymaga uwagi",
  pojawia się licznik próśb. Decyzja zapada w zakładce **Użytkownicy**, w tym
  samym wierszu, w którym widać komplet danych do faktury i historię zleceń.
- Po przyznaniu dostępu klient dostaje maila i może uruchamiać.

Reguła mieszka w [`lib/access.ts`](../lib/access.ts) i ma własne testy — to ona
decyduje o wydaniu pieniędzy na maszynę, więc nie zmieniaj jej „przy okazji".

## Krok 4. Płatności

Pełny przebieg: [`platnosci-stripe.md`](platnosci-stripe.md). W skrócie: konto
Stripe, włączone BLIK i Przelewy24, dwa klucze na Vercelu, webhook na
`https://fdsrun.com/api/platnosci/webhook`.

Bez kluczy `/checkout` oddaje **503 z czytelnym komunikatem**, a webhook odrzuca
zdarzenia — nie da się przypadkiem oznaczyć zlecenia jako opłaconego.

## Krok 5. Cron sprzątający

Kasuje wyniki starsze niż 60 dni i zamyka zlecenia, które zawisły. Wymaga
`CRON_SECRET` w nagłówku `x-cron-secret`:

```
POST https://fdsrun.com/api/cron/cleanup
```

Watchdog patrzy na **postęp**, nie na zegar — zlecenie liczące wolno, ale
liczące, nie zostanie przerwane.

---

## Lista kontrolna przed otwarciem

- [ ] `npm run preflight` — wszystkie obszary na ✓
- [ ] `npm test`, `npm run typecheck`, `npm run lint` — czysto
- [ ] Migracje uruchomione, **w tym `migration_sim_access.sql`**
- [ ] `NEXT_PUBLIC_SITE_MODE` ustawione w obu projektach Vercel
- [ ] `NEXT_PUBLIC_ADMIN_EMAIL` usunięte z konfiguracji
- [ ] Domena nadawcy zweryfikowana w Resend (SPF/DKIM), `MAIL_FROM` przestawione
- [ ] Jedno zlecenie przejechane **od końca do końca na koncie testowym**:
      prośba o dostęp → przyznanie → uruchomienie → wyniki → płatność
- [ ] Jedna prawdziwa płatność na małą kwotę, wykonana i **zwrócona**
- [ ] Regulamin opisuje moment zapłaty, zwroty i prawo odstąpienia
- [ ] Cron wpięty w harmonogram

## Czego kod jeszcze NIE robi

Rzeczy świadomie zostawione — żeby nikt nie szukał ich w kodzie na próżno:

- **Zwrot w Stripe nie cofa `payment_status`** (brak obsługi `charge.refunded`).
  Przy pierwszym zwrocie popraw status ręcznie albo dopisz obsługę zdarzenia.
- **Faktury nie wystawiają się same** — miejsce na wpięcie ING Księgowość jest
  oznaczone w webhooku, opis w [`fakturowanie-ing.md`](fakturowanie-ing.md).
- **Prowizja Stripe nie wchodzi do marży** w panelu admina (ok. 1,5% + 1 zł).
- **Dostęp przyznaje człowiek.** Nie ma automatu „karta w kartotece → wolno
  uruchamiać". To następny krok, jeśli ruch przerośnie ręczną obsługę:
  Stripe w trybie `setup`, zapisana metoda płatności i obciążenie po
  obliczeniach. Dopiero wtedy bramka może otwierać się sama.
