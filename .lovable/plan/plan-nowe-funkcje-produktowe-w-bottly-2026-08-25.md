# Plan: nowe funkcje produktowe w Bottly

## Cel
Dodać trzy funkcje, które zamieniają Bottly z edytora flow w gotowy produkt do budowania Discord botów: gotowe szablony, wbudowany symulator oraz połączenie z Discordem przez OAuth.

## Kolejność wdrażania

### Etap 1 — Biblioteka szablonów flow (największy efekt, najmniej ryzyka)

**Co robi:**
- Użytkownik podczas tworzenia bota lub w builderze może wybrać gotowy szablon (np. „Moderation kit”, „Welcome gate”, „Ticket system”).
- Szablon kopiuje się jako osobisty flow użytkownika i można go dowolnie edytować.

**Zmiany w bazie:**
- Nowa tabela `public.flow_templates` z kolumnami: `id`, `name`, `description`, `category`, `icon`, `nodes` (JSONB), `edges` (JSONB), `is_public`, `created_at`, `updated_at`.
- GRANT SELECT dla `anon` i `authenticated` (szablony publiczne, tylko do odczytu).
- GRANT ALL dla `service_role` (seed/admin).
- Włączona RLS i polityka pozwalająca czytać tylko szablony oznaczone `is_public = true`.

**Zmiany w kodzie:**
- `src/lib/templates.functions.ts`: `listPublicTemplates()` i `instantiateTemplate(templateId, flowName)` — tworzy nowy flow na koncie użytkownika na podstawie szablonu.
- `src/components/flow/NodeLibrary.tsx`: nowa zakładka „Templates" obok „Examples" z kartami szablonów i przyciskiem „Use template".
- `src/routes/_authenticated/bots.new.tsx`: opcjonalny krok „Pick a template" między „Basics" a zapisaniem bota — jeśli użytkownik wybierze szablon, nowy flow jest klonem szablonu, a nie pustym canvasem.
- Seed migracji: wstawiamy 4–5 gotowych szablonów (ban command, ticket system, verification, welcome greeter, giveaway).

### Etap 2 — Symulator / testowanie bota w przeglądarce

**Co robi:**
- W builderze pojawia się panel „Test" zamiast „Preview" (lub obok).
- Użytkownik wybiera trigger (np. `/ban @user spam`), klika „Run" i widzi, jak flow się wykonuje krok po kroku.
- Symulator pokazuje, jakie wiadomości/embedy zostaną wysłane, które gałęzie logiczne się wykonały i jakie zmienne były dostępne.

**Zmiany w kodzie:**
- `src/lib/flow-engine.ts`: lekki interpreter flow po stronie klienta — przechodzi od triggera przez połączone node'y, wykonuje proste operacje (send-message, send-embed, if-else, set-variable) i zbiera „output" (wysłane wiadomości, zmienne, błędy).
- `src/components/flow/TestPanel.tsx`: nowy panel z wyborem triggera, formularzem danych wejściowych, listą kroków symulacji i podglądem wynikowych wiadomości (używa istniejącego `DiscordMessagePreview`).
- `src/components/flow/FlowTopBar.tsx`: przycisk „Test" otwiera panel testowy zamiast wyświetlać toast.
- Podświetlanie node'ów na canvasie podczas symulacji (opcjonalnie w tej samej iteracji lub jako follow-up).

**Decyzja techniczna:**
- Symulator działa po stronie klienta, żeby był natychmiastowy i nie wymagał backendu. Nie wykonuje prawdziwych akcji na Discordzie — tylko pokazuje, co bot by zrobił.

### Etap 3 — Integracja Discord OAuth

**Co robi:**
- Użytkownik może połączyć swoje konto Discord z Bottly.
- Po połączeniu aplikacja pobiera listę serwerów, ról i kanałów użytkownika.
- Dane te trafiają do zmiennych buildera (`{server.roles}`, `{server.channels}`) i można je wybierać z dropdownów zamiast pisać nazwy ręcznie.
- Opcjonalnie: przycisk „Invite bot to server" generuje link OAuth z uprawnieniami.

**Zmiany w bazie:**
- Nowa tabela `public.discord_connections` z kolumnami: `id`, `user_id`, `discord_user_id`, `access_token`, `refresh_token`, `expires_at`, `scopes`, `created_at`, `updated_at`.
- GRANT SELECT/INSERT/UPDATE/DELETE dla `authenticated` (użytkownik zarządza tylko swoim połączeniem).
- GRANT ALL dla `service_role`.
- Włączona RLS i polityka `auth.uid() = user_id`.
- **Bezpieczeństwo:** tokeny Discorda przechowujemy w bazie, ale nigdy nie zwracamy ich do frontendu. Wszystkie zapytania do Discord API wykonuje serwer przez `createServerFn`.

**Zmiany w kodzie:**
- `src/lib/discord.functions.ts`: `connectDiscord()`, `disconnectDiscord()`, `listGuilds()`, `listGuildRoles(guildId)`, `listGuildChannels(guildId)` — wszystko jako `createServerFn` z `requireSupabaseAuth`.
- `src/components/discord/DiscordConnectButton.tsx`: przycisk „Connect Discord" w ustawieniach bota / w builderze.
- `src/components/flow/VariableInput.tsx`: rozszerzenie o autocomplete kanałów/ról z połączonego serwera.
- `src/services/discord.ts`: helper `inviteUrl(clientId, permissions, guildId)` do generowania linku zaproszenia bota.

**Decyzja OAuth:**
- Używamy standardowego OAuth2 Discorda z `identify` + `guilds` scope.
- Przepłyk: frontend → Discord authorize → redirect na `/auth/discord/callback` → wymiana kodu na token po stronie serwera → zapis w `discord_connections`.
- Lovable Cloud: konfiguracja providera Discord w auth (jeśli jest wspierana) lub osobny endpoint callback jako server route.

## Ryzyka i decyzje do potwierdzenia

1. **Czy szablony mają być tylko systemowe, czy użytkownicy też mogą tworzyć własne i udostępniać?**
   - Plan zakłada na start tylko systemowe szablony seedowane migracją. Własne szablony to kolejny etap.
2. **Czy symulator ma obsługiwać wszystkie node'y, czy tylko wiadomości/logikę?**
   - W pierwszej wersji obsługujemy: triggers, send-message, send-embed, reply, if-else, set-variable, cooldown. Akcje moderacyjne (ban, kick) są symulowane jako „would execute" bez rzeczywistego wywołania.
3. **Czy Discord OAuth jest konieczny do działania symulatora?**
   - Nie. Symulator działa na mockowanych danych. OAuth dodaje realne dane serwera jako opcję.
4. **Gdzie fizycznie uruchamiamy bota?**
   - Ten plan nie obejmuje hostowania bota. Symulator jest lokalny, a OAuth służy do importu danych i generowania linku zaproszenia. Rzeczywiste uruchomienie bota to osobny, duży etap.

## Szacunkowy zakres plików

- Nowe: `src/lib/templates.functions.ts`, `src/lib/flow-engine.ts`, `src/lib/discord.functions.ts`, `src/components/flow/TestPanel.tsx`, `src/components/discord/DiscordConnectButton.tsx`.
- Modyfikowane: `src/components/flow/NodeLibrary.tsx`, `src/components/flow/FlowTopBar.tsx`, `src/components/flow/BuilderShell.tsx`, `src/routes/_authenticated/bots.new.tsx`, `src/components/flow/VariableInput.tsx`.
- Migracje: `flow_templates`, `discord_connections` + seed szablonów.

## Kryteria ukończenia

- Użytkownik może wybrać szablon przy tworzeniu bota i w builderze.
- Użytkownik może uruchomić symulację flow i zobaczyć wynikowe wiadomości.
- Użytkownik może połączyć Discorda, wybrać serwer i używać jego kanałów/ról w polach buildera.
