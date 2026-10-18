# Bezpieczeństwo FDSRun — model i lista kontrolna

Stan na 2026-10-18. Dokument opisuje, jak serwis chroni dane klientów i konto
właściciela, oraz co trzeba zrobić RĘCZNIE poza kodem. Powstał przy wdrażaniu
kroku „zabezpieczenie maszyny i kont" z planu rozwoju.

---

## Zasady, których pilnuje kod

### Maszyna licząca zna wyłącznie swoje zlecenie

Do 2026-10-18 skrypt startowy maszyny niósł w `user_data` klucz `service_role`
Supabase, token API Hetznera, globalny sekret webhooka i klucze magazynu wyników.
Każdy, kto dostał się na maszynę (albo do jej metadanych), miał całą bazę, całe
konto chmury i wszystkie wyniki wszystkich klientów.

Teraz maszyna dostaje **jeden sekret: token swojego zlecenia**
([`lib/jobToken.ts`](../lib/jobToken.ts)). Token jest HMAC-em sekretu
`WEBHOOK_SECRET` i numeru zlecenia, więc serwer weryfikuje go bez kolumny w bazie,
a wyciek tokenu nie zdradza sekretu ani tokenów innych zleceń.

| Co maszyna robiła | Jak robi to teraz |
|---|---|
| pobierała plik `.fds` kluczem service_role | dostaje podpisany adres ważny 2 h (Supabase Storage) |
| wysyłała wyniki kluczami S3 przez `aws s3 cp` | prosi `POST /api/symulacje/[caseId]/upload-urls` o podpisane adresy PUT (15 min, tylko pod `results/<caseId>/`) i wysyła `curl -T` |
| raportowała globalnym sekretem webhooka | raportuje tokenem zlecenia (`x-job-token`) |
| kasowała się tokenem Hetznera | zgłasza koniec, a maszynę kasuje serwis; cron zwalnia osierocone |

Zlecenie zamknięte (done / failed / cancelled) nie przyjmuje już nic: `/complete`
odpowiada `stop:true`, więc maszyna, która jeszcze liczy, grzecznie kończy FDS.
Test [`cloudInit.test.ts`](../lib/__tests__/cloudInit.test.ts) pilnuje, żeby żaden
z dawnych sekretów nie wrócił do skryptu.

### Maszyna nie przyjmuje połączeń

Każda maszyna powstaje z firewallem Hetznera **bez żadnej reguły przychodzącej**
(`fdsrun-compute`, zakładany automatycznie albo wskazany w `HETZNER_FIREWALL_ID`).
Ruch wychodzący (HTTPS do serwisu i magazynu) zostaje. Dodatkowo skrypt startowy
blokuje hasło roota i logowanie hasłem w SSH — gdyby ktoś kiedyś otworzył port do
diagnostyki, wchodzi się wyłącznie kluczem.

Bez firewalla maszyna **nie powstaje** — zlecenie kończy się błędem widocznym na
karcie, zamiast maszyną z sekretami otwartą na świat.

### Własność zlecenia = konto

Zlecenie widzi wyłącznie konto, które je złożyło (plus właściciel). Dopasowanie
po adresie e-mail wypadło: adres w zleceniu brał się z formularza, więc wpisanie
cudzego adresu dawało tej osobie wgląd w zlecenie i wysyłało jej maila z dowolną
treścią w „uwagach". Adres zlecenia to teraz zawsze adres konta.

### Odnośniki do wyników żyją godzinę

Podpisany odnośnik do pliku działa bez logowania. Wcześniej był ważny 7 dni —
krążył w mailach i zrzutach ekranu długo po tym, jak klient skończył pracę.
Teraz: godzina dla listy wyników, 5 min dla pojedynczego pobrania, 15 min dla ZIP.

### Usunięcie konta usuwa dane

`DELETE /api/account/delete` kasuje wyniki z magazynu, pliki wejściowe i dziennik
zdarzeń, a wiersze zleceń **pseudonimizuje** (bez nazwiska, adresu, uwag, logów).
Zostaje numer, cena i stan płatności — zapis księgowy, nie dane osobowe. Konto z
liczącym zleceniem nie da się usunąć, dopóki zlecenie nie zostanie zatrzymane.

### Pozostałe

- Nagłówki `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` i ograniczony CSP na każdej odpowiedzi
  ([`next.config.js`](../next.config.js)).
- Limity żądań także na złożeniu zlecenia (10/h na konto), checkoucie i usunięciu konta.
- Treść od klienta w mailach HTML jest escapowana (`escapeHtml` w `lib/mail.ts`).
- Polityki RLS tabeli `profiles` są zapisane w repozytorium
  ([`migration_profiles.sql`](../supabase/migration_profiles.sql)) razem z wyzwalaczem,
  który nie pozwala klientowi samemu nadać sobie `sim_access = 'granted'`.
- Funkcje Vercela biegną we Frankfurcie (`regions` w `vercel.json`).

---

## Do zrobienia ręcznie po wdrożeniu

Kolejność ma znaczenie: najpierw wdrożenie i migracja, potem rotacja.

- [ ] **Migracja** `supabase/migration_profiles.sql` w SQL Editorze; potem `npm run sprawdz-baze`.
- [ ] **Rotacja sekretów, które leżały na każdej dotychczasowej maszynie:**
  - Hetzner → Security → API tokens: nowy token, podmiana `HETZNER_API_TOKEN`, skasowanie starego;
  - Hetzner → Object Storage → S3 credentials: nowa para, podmiana `HETZNER_STORAGE_*`, skasowanie starej;
  - `WEBHOOK_SECRET`: nowa losowa wartość (np. `openssl rand -hex 32`) — maszyny
    uruchomione przed wdrożeniem i tak już nie zaraportują (stary nagłówek);
  - klucza `service_role` Supabase **nie da się już obrócić** — Supabase wycofał
    rotację starych kluczy (anon, service_role, JWT secret), a same klucze
    wygasza do końca 2026. Zamiast rotacji przejście na nowe klucze:
    1. Supabase → Project Settings → **API Keys** → zakładka nowych kluczy:
       skopiuj **publishable key** (`sb_publishable_…`) i utwórz **secret key**
       (`sb_secret_…`) o nazwie np. `vercel-cloud`;
    2. Vercel (projekt cloud): `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← publishable,
       `SUPABASE_SERVICE_ROLE_KEY` ← secret; Redeploy;
    3. sprawdź logowanie, kartę zlecenia, panel admina i jedno zlecenie;
    4. zakładka **Legacy API Keys** → **Disable legacy API keys**. Dopiero to
       unieważnia stary klucz service_role, który leżał na maszynach.
- [ ] **Dwuskładnikowe logowanie** na kontach: Vercel, Supabase, Hetzner, Stripe,
  GitHub, Resend, ING. To konta, z których da się wyłączyć cały serwis.
- [ ] **Supabase → Authentication → Settings:** włącz „Leaked password protection"
  i potwierdzanie adresu e-mail; ustaw minimalną długość hasła ≥ 10.
- [ ] **Supabase → Settings → Database:** sprawdź, czy region projektu jest w UE
  (Frankfurt). Jeśli nie — to pozycja do polityki prywatności, nie do przenosin.
- [ ] **Vercel → Settings → Environment Variables:** sekrety oznacz jako „Sensitive".
- [ ] **Vercel → Settings → Deployment Protection:** włącz ochronę podglądów (preview).
- [ ] **Hetzner → Firewalls:** po pierwszym zleceniu sprawdź, że `fdsrun-compute`
  istnieje, ma 0 reguł przychodzących i jest przypięty do maszyny.
- [ ] **Pierwsze zlecenie po wdrożeniu:** w logu zlecenia szukaj `upload:` (błędy
  wysyłki) — jeśli są, sprawdź, czy magazyn przyjmuje presigned PUT (CORS nie ma
  tu znaczenia, to nie przeglądarka).

## Czego ten krok NIE robi

- Nie wprowadza CSP dla skryptów — wymaga nonce'ów w Next i osobnego testowania.
- Nie ogranicza limitów żądań globalnie — licznik jest per instancja funkcji
  (patrz `lib/utils/rateLimit.ts`); to świadomy kompromis bez Redisa.
- Nie dodaje MFA dla klientów serwisu — Supabase to wspiera, ale to osobny krok w UI.
- Nie rusza panelu admina: rozpoznanie właściciela to nadal porównanie z `ADMIN_EMAIL`.
