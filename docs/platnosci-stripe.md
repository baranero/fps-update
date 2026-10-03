# Wdrożenie płatności Stripe

Stan na 2026-09-20. Kod płatności jest **napisany i kompletny** — brakuje
wyłącznie konfiguracji konta i kluczy. Ten dokument prowadzi przez to krok po
kroku, od zera do pierwszej opłaconej faktury.

Dostęp do uruchamiania symulacji jest **przyznawany po jednym koncie** przez
właściciela — nie wynika już z kodu, tylko ze stanu `profiles.sim_access`
(reguła: `lib/access.ts`, decyzja: panel admina → Użytkownicy). Płatności można
wdrażać i testować niezależnie, na koncie właściciela.

Przebieg wdrożenia całości: [`wdrozenie.md`](wdrozenie.md).

---

## Co już działa w kodzie

| Element | Plik | Rola |
|---|---|---|
| Utworzenie płatności | `app/api/platnosci/checkout/route.ts` | Liczy kwotę **brutto** wg statusu podatkowego nabywcy, tworzy sesję Stripe Checkout, zapisuje `stripe_session_id` i `payment_status='pending'` |
| Potwierdzenie | `app/api/platnosci/webhook/route.ts` | Weryfikuje podpis, na `checkout.session.completed` ustawia `payment_status='paid'` |
| Zabezpieczenie | `app/api/platnosci/verify/route.ts` | Gdy webhook się spóźni, strona zlecenia dopytuje Stripe bezpośrednio |
| Klient SDK | `lib/stripe/client.ts` | Leniwa inicjalizacja + `isStripeConfigured()` |

Bez kluczy `/checkout` zwraca **503 z czytelnym komunikatem**, a webhook odrzuca
zdarzenia — nie da się przypadkiem oznaczyć zlecenia jako opłaconego.

Kwota pobierana to **brutto**: `price` w bazie jest netto, a stawka wynika
z `vatTreatment()` (23% / odwrotne obciążenie / poza zakresem). Netto i stawka
lądują w `metadata` sesji, żeby księgowość nie musiała ich odtwarzać.

---

## Krok 1. Konto Stripe

1. Załóż konto na <https://dashboard.stripe.com> — jako **firma w Polsce**.
2. Przejdź aktywację: dane firmy, NIP, rachunek bankowy do wypłat, weryfikacja
   tożsamości. Bez aktywacji działa wyłącznie tryb testowy.
3. **Settings → Payouts** — ustaw rachunek i harmonogram wypłat.
4. **Settings → Public details** — nazwa na wyciągu klienta. Ustaw coś
   rozpoznawalnego (`FDSRUN`), inaczej klienci będą reklamować nieznane obciążenie.

## Krok 2. Metody płatności

**Settings → Payment methods.** Kod wysyła
`payment_method_types: ["card", "blik", "p24"]`, więc **wszystkie trzy muszą być
włączone**, inaczej Stripe odrzuci utworzenie sesji.

- **Karty** — domyślnie włączone.
- **BLIK** — wymaga waluty PLN. Włącz ręcznie.
- **Przelewy24 (p24)** — wymaga waluty PLN. Włącz ręcznie.

> Walutę sesji ustawiamy na `pln` w kodzie. Nie zmieniaj jej bez zmiany
> `lib/fds/pricing.ts` — cały cennik jest w złotych.

## Krok 3. Klucze

**Developers → API keys.**

| Zmienna | Skąd | Uwagi |
|---|---|---|
| `STRIPE_SECRET_KEY` | API keys → Secret key | `sk_test_…` w testach, `sk_live_…` na produkcji |
| `STRIPE_WEBHOOK_SECRET` | z kroku 4 | `whsec_…`, **inny dla trybu testowego i produkcyjnego** |

Klucz publiczny (`pk_…`) nie jest potrzebny — korzystamy z hostowanego Stripe
Checkout, czyli przekierowania, a nie z formularza karty u nas.

## Krok 4. Webhook

**Developers → Webhooks → Add endpoint.**

- **URL:** `https://fdsrun.com/api/platnosci/webhook`
- **Zdarzenia:** wystarczy `checkout.session.completed`
- Po zapisaniu skopiuj **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`

Webhook czyta surowe ciało żądania (`req.text()`), co jest warunkiem weryfikacji
podpisu — nie zmieniaj tego na `req.json()`.

## Krok 5. Zmienne środowiskowe na Vercelu

Wyłącznie w projekcie **cloud** (fdsrun.com). Projekt marketingowy ich nie potrzebuje.

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Ustaw je dla **Production** i **Preview** osobno — w Preview używaj kluczy
testowych, żeby podgląd wdrożenia nigdy nie obciążył prawdziwej karty.

Po dodaniu zmiennych **wdróż ponownie** — Next czyta je w czasie budowania runtime'u.

## Krok 6. Test w trybie testowym

1. Klucze `sk_test_…` + webhook w trybie testowym.
2. Lokalnie przekieruj webhook na swoją maszynę:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/platnosci/webhook
   ```
   Komenda wypisze tymczasowy `whsec_…` — wstaw go do `.env.local`.
3. Wejdź na zakończone zlecenie → **Zapłać**. Karty testowe:

   | Numer | Efekt |
   |---|---|
   | `4242 4242 4242 4242` | płatność udana |
   | `4000 0000 0000 9995` | odrzucona (brak środków) |
   | `4000 0025 0000 3155` | wymaga 3D Secure |

   Data ważności dowolna przyszła, CVC dowolne.
4. Sprawdź, że:
   - `payment_status` zmienia się na `paid`,
   - w `job_events` pojawia się wpis `payment` z kwotą i stawką,
   - kwota u Stripe to **brutto**, a `metadata.net_pln` zgadza się z ceną netto.

## Krok 7. Wejście na produkcję

- [ ] Konto aktywowane, wypłaty skonfigurowane
- [ ] BLIK i Przelewy24 włączone
- [ ] Klucze `sk_live_…` i produkcyjny `whsec_…` na Vercelu (Production)
- [ ] Webhook produkcyjny wskazuje na `https://fdsrun.com/...` i ma status **Enabled**
- [ ] Jedna prawdziwa płatność na małą kwotę, wykonana i **zwrócona** z panelu Stripe
- [ ] Regulamin opisuje moment zapłaty, zwroty i prawo odstąpienia
- [ ] Wystawianie faktur podpięte (patrz `docs/fakturowanie-ing.md`)

---

## Na co uważać

**Nie ufaj przekierowaniu powrotnemu.** `?platnosc=sukces` w adresie to tylko
sygnał dla interfejsu. Jedynym źródłem prawdy jest webhook (i `verify` jako
zabezpieczenie). Kod już tak działa — nie „upraszczaj" tego.

**Webhook musi być idempotentny.** Stripe potrafi dostarczyć to samo zdarzenie
kilka razy. Obecny zapis ustawia `payment_status='paid'` po `stripe_session_id`,
więc powtórka jest nieszkodliwa. Gdy dołożysz wystawianie faktury, **koniecznie**
sprawdź najpierw, czy faktura dla tego zlecenia już nie istnieje — inaczej
powtórzone zdarzenie wystawi duplikat.

**Zwroty.** Zwrot wykonany w panelu Stripe **nie cofnie** `payment_status` —
nie obsługujemy zdarzenia `charge.refunded`. Przy pierwszym zwrocie albo popraw
status ręcznie, albo dopisz obsługę tego zdarzenia.

**Prowizja Stripe** (ok. 1,5% + 1 zł dla kart z EOG, BLIK i P24 mają własne
stawki) **nie jest ujęta w marży** z `lib/fds/pricing.ts`. Przy cenie 100 zł to
ok. 2,5 zł, czyli realna krotność spada o kilka procent. Panel **Marża**
w adminie liczy koszt maszyn, nie prowizje — miej to z tyłu głowy przy ocenie
wyniku.
