# Asystent AI w builderze

Dodajemy wysuwany panel czatu AI po lewej stronie buildera (`/builder`, `/builder/:flowId`), który rozumie aktualny flow i potrafi go tworzyć oraz modyfikować.

## Jak to działa dla użytkownika

- Nowy przycisk „AI Assistant” na górnym pasku buildera (ikona iskierki) otwiera panel po lewej, obok biblioteki node'ów. Na mobile otwiera się jako pełny drawer.
- Czat z historią rozmowy, streamingiem odpowiedzi i renderowaniem markdown.
- Podpowiedzi na start, np. „Zrób system ticketów”, „Dodaj komendę /ban z potwierdzeniem”, „Wyjaśnij mój flow”.
- Gdy AI proponuje zmianę na kanwie, pokazuje kartę podsumowania („Dodam 4 node'y i 3 połączenia”) z przyciskami **Zastosuj** / **Odrzuć**. Nic nie zmienia się bez akceptacji.
- Po zastosowaniu zmiana trafia do historii undo/redo, więc Cmd+Z ją cofa, a flow zapisuje się jak zwykle na koncie użytkownika.
- Czat jest tylko w builderze i nie zmienia niczego poza kanwą aktualnego flow.

## Zakres możliwości AI

- Tworzenie kompletnych flowów od zera na podstawie opisu.
- Dodawanie/usuwanie node'ów, łączenie ich, ustawianie pól konfiguracji (treści wiadomości, embedy, warunki).
- Wyjaśnianie istniejącego flow i wskazywanie błędów (osierocone node'y, brak triggera, puste wymagane pola).

## Szczegóły techniczne

- Model: `openai/gpt-5.6-sol` przez Lovable AI Gateway, wywoływany z chronionej funkcji serwerowej `src/lib/flow-ai.functions.ts` (`.middleware([requireSupabaseAuth])`), więc klucz nie trafia do przeglądarki.
- Kontekst promptu: skrócony katalog node'ów z `src/data/node-catalog.ts` (typ, kategoria, pola i ich rodzaje) plus zserializowany aktualny graf (nodes + edges, bez zbędnych metadanych), żeby AI operowało na realnych typach.
- Wyjście modelu: strict JSON — `{ reply, plan?: { summary, nodes[], edges[], mode: "append" | "replace" } }`. Walidacja Zodem po stronie serwera; nieznane typy node'ów odrzucane zanim trafią do UI.
- Zastosowanie zmian: nowa akcja `applyAiPlan(plan, mode)` w `src/stores/useFlowStore.ts`, zbudowana na istniejących `addPreparedNode` / `setNodes` / `setEdges` i tym samym mechanizmie snapshotów co `applyExample`, z auto-layoutem pozycji dla nowych node'ów.
- UI: `src/components/flow/AiAssistantPanel.tsx` (lista wiadomości, input, karta propozycji), stan czatu lokalny w komponencie; osadzony w `BuilderShell.tsx` obok `NodeLibrary` i w `Sheet` na mobile; przełącznik dodany w `FlowTopBar.tsx`.
- Historia rozmowy trzymana w pamięci sesji buildera (bez nowych tabel); pełna historia wysyłana przy każdym zapytaniu.
