# Rozbudowa Bottly — marketplace, moderacja, admin, blog

Wybrane punkty: 6, 8, 10, 16, 17, 18, 19, 20, 21, 22.
Motyw jasny (20) — pominięty na Twoją prośbę, zostajemy przy dark-only.
Realizacja w trzech etapach, każdy do przetestowania osobno.

## Etap 1 — Marketplace i twórcy (6, 8, 10, 16, 18)

**Oceny i recenzje (6)**
- Kupujący może wystawić 1–5 gwiazdek i komentarz do listingu, który kupił.
- Na karcie listingu i stronie szczegółów: średnia ocena + liczba recenzji.
- Lista recenzji pod opisem, z nazwą i avatarem autora.

**Kategorie, filtry i sortowanie (8)**
- Pasek filtrów na /marketplace: kategoria, tagi, zakres ceny, „tylko darmowe”.
- Sortowanie: najnowsze, najlepiej oceniane, bestsellery, cena rosnąco/malejąco.
- Wybór kategorii przy publikacji listingu.

**Kody rabatowe procentowe (10)**
- Nowy typ kodu: procent zniżki (np. 20%), opcjonalnie ograniczony do jednego listingu.
- Pole „kod rabatowy” w oknie zakupu — cena przeliczana przed potwierdzeniem.
- Tworzenie i dezaktywacja kodów w panelu admina (obok kodów salda i planów).

**Publiczne profile twórców (16)**
- Strona /u/{nazwa}: avatar, opis, liczba sprzedaży, średnia ocena, lista listingów.
- Link do profilu z każdej karty i strony listingu.
- Edycja opisu profilu w ustawieniach konta.

**Weryfikacja twórców (18)**
- Badge „Verified” przy nazwie twórcy w marketplace i na profilu.
- Admin nadaje i odbiera weryfikację z panelu użytkowników (Etap 2) lub z listy twórców.

## Etap 2 — Moderacja i admin (17, 21, 22)

**Zgłoszenia (17)**
- Przycisk „Zgłoś” na listingu i na profilu twórcy: powód + opis.
- Kolejka moderacji w adminie: otwarte / rozpatrzone, akcje: ukryj listing, odrzuć zgłoszenie.
- Powiadomienie dla twórcy, gdy jego listing zostanie ukryty.

**Panel statystyk admina (21)**
- Kafelki: liczba użytkowników, botów, botów online, listingów, sprzedaży, obrót.
- Wykresy: rejestracje i sprzedaże w czasie (7/30/90 dni).
- Ostatnia aktywność: nowe konta, nowe listingi, ostatnie zakupy.

**Zarządzanie użytkownikami (22)**
- Lista użytkowników z wyszukiwarką (e-mail / nazwa).
- Akcje: ban / unban, zmiana planu, korekta salda (z powodem), nadanie weryfikacji, nadanie roli admina.
- Historia korekt salda widoczna w szczegółach użytkownika.
- Zbanowany użytkownik traci dostęp do dashboardu i publikowania.

## Etap 3 — Blog i changelog (19)

- Wpisy trzymane w bazie, pisane w panelu admina (tytuł, slug, okładka, treść markdown, typ: blog lub changelog, status: szkic/opublikowany, data).
- Publiczne strony: /blog (lista), /blog/{slug} (wpis), /changelog (oś czasu wydań).
- Metadane SEO na każdej stronie wpisu, link do bloga w stopce i menu.

## Szczegóły techniczne

- Nowe tabele: `listing_reviews`, `discount_codes` + `discount_code_redemptions`, `reports`, `blog_posts`, `balance_adjustments`; rozszerzenia: `marketplace_listings.category`, `profiles.bio`/`username`/`verified`/`banned`.
- Każda tabela z GRANT-ami i politykami RLS: publiczny odczyt tylko dla recenzji, opublikowanych wpisów i profili; zapis ograniczony do właściciela; moderacja i kody wyłącznie przez rolę serwisową po sprawdzeniu roli admina.
- Rabaty i korekty salda liczone w funkcjach bazodanowych (SECURITY DEFINER), tak jak istniejące `purchase_listing` i `redeem_balance_code` — cena nigdy nie pochodzi z klienta.
- Logika po stronie serwera w `src/lib/*.functions.ts` z `requireSupabaseAuth`; funkcje admina dodatkowo weryfikują `has_role(uid, 'admin')`.
- Statystyki admina liczone zapytaniami agregującymi po stronie serwera, wykresy na `recharts`.
- Powiadomienia (ukrycie listingu, nowa recenzja, nowa sprzedaż) trafiają do istniejącego `user_notifications`.
