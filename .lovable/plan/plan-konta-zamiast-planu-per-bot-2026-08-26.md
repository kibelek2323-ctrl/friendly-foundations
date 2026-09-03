# Plan konta zamiast planu per bot

Plan przestaje być właściwością bota — staje się właściwością konta użytkownika i aktywuje się kodem. Limity planu realnie blokują akcje w aplikacji.

## Co zmienia się dla użytkownika

- Kreator bota (`/bots/new`) traci krok „Plan”. Zostają: Template → Basics.
- Karty botów i widoki bota nie pokazują już planu bota. Plan widnieje raz — w profilu/pasku bocznym i na `/billing`.
- Nowa strona **Plan i kod** (`/billing`): aktualny plan, data wygaśnięcia, zużycie limitów (boty, komendy/flow, wiadomości AI dziś) oraz pole „Wpisz kod”.
- Po wpisaniu poprawnego kodu plan konta zmienia się natychmiast (np. Free → Pro) i limity się podnoszą.
- Panel admina (`/admin/codes`, widoczny tylko dla roli admin): generowanie kodów (plan, liczba użyć, data wygaśnięcia, ile dni planu daje kod), lista kodów z licznikiem wykorzystań, dezaktywacja kodu.

## Limity (egzekwowane, nie tylko opisowe)

| Limit | Free | Pro | Ultimate |
| --- | --- | --- | --- |
| Boty | 1 | 5 | bez limitu |
| Komendy / flow na bota | 5 | 50 | bez limitu |
| Wiadomości AI asystenta / dzień | 10 | 200 | 1000 |
| Edycja opisu bota i brandingu | zablokowane | tak | tak |

Zachowanie przy przekroczeniu:
- Tworzenie bota ponad limit: przycisk „Create a bot” pokazuje toast + link do `/billing`, bot nie powstaje.
- Dodanie komendy/flow ponad limit: to samo, blokada w `CommandsWorkspace` i przy tworzeniu flow.
- AI asystent: serwer odrzuca zapytanie po wyczerpaniu dziennego limitu, panel pokazuje pozostałą liczbę wiadomości i CTA do `/billing`.
- Opis bota / branding na Free: pola disabled z plakietką „Pro”, a serwerowy zapis i tak odrzuca zmianę.

## Szczegóły techniczne

**Baza (migracja):**
- `user_plans` — `user_id` (unikalny), `plan` (`free|pro|ultimate`), `expires_at` nullable, `activated_code_id`. RLS: select własnego wiersza; zapis tylko przez funkcje serwerowe (service role). GRANT dla `authenticated` (SELECT) i `service_role` (ALL).
- `plan_codes` — `code` (unikalny), `plan`, `duration_days` nullable (null = bezterminowo), `max_uses`, `used_count`, `expires_at`, `active`, `created_by`. RLS: brak dostępu dla `authenticated`; obsługa wyłącznie przez serwer/admina.
- `plan_code_redemptions` — kto i kiedy wykorzystał kod (unikat `(code_id, user_id)`).
- `app_role` enum + `user_roles` + funkcja `has_role(uuid, app_role)` (security definer) — do bramkowania panelu admina.
- `ai_usage` — `user_id`, `day` (date), `count`, unikat `(user_id, day)`; licznik dziennych zapytań AI.

**Serwer (`createServerFn`, `requireSupabaseAuth`):**
- `src/lib/plan.functions.ts`: `getMyPlan` (plan + zużycie), `redeemPlanCode` (atomowa walidacja i inkrementacja `used_count` w funkcji SQL security definer), `assertCanCreateBot`, `assertCanEditBranding`.
- `src/lib/admin-codes.functions.ts`: `listPlanCodes`, `createPlanCodes`, `deactivatePlanCode` — każda po weryfikacji `has_role(auth.uid(),'admin')` przez `context.supabase`, dopiero potem operacje admin-clientem ładowanym wewnątrz handlera.
- `src/lib/flow-ai.functions.ts`: przed wywołaniem modelu inkrementacja `ai_usage` i sprawdzenie limitu planu; zwrot `remaining` do UI.

**Frontend:**
- `src/hooks/usePlan.ts` — `useQuery` po `getMyPlan`, udostępnia `plan`, `limits`, `usage`, `can(...)`.
- `src/data/catalog.ts` — `PLAN_LIMITS` jako źródło prawdy dla liczbowych limitów (obok istniejących opisów marketingowych `PLANS`).
- `src/routes/_authenticated/bots.new.tsx` — usunięcie kroku Plan i `PlanId` z draftu; `STEPS = ["Template","Basics"]`; sprawdzenie limitu botów przed startem.
- `src/routes/_authenticated/billing.tsx` i `src/routes/_authenticated/admin.codes.tsx` — nowe strony z własnym `head()`.
- Usunięcie plakietki planu z `bots.index.tsx` i widoków bota; pole `plan` w typie `Bot` zostaje w danych (kompatybilność zapisanych botów), ale nie jest już nigdzie pokazywane ani ustawiane przez usera — nowe boty dostają plan konta.
- `AppShell` — link „Plan” w menu profilu, „Admin codes” tylko dla admina.

**Bezpieczeństwo:** kody nigdy nie trafiają do klienta poza panelem admina; realizacja kodu i wszystkie limity są sprawdzane po stronie serwera, UI tylko odzwierciedla stan.
