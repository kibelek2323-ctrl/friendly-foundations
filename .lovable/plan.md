# Marketplace 2.0, onboarding, referrals i 2FA e-mail

Cztery bloki funkcji z nowoczesnym, spójnym wyglądem. Realizacja w 4 fazach — każda kończy się działającym kawałkiem.

## Faza 1 — Marketplace 2.0

Co już jest: kategorie, tagi, sortowanie, recenzje, zakupy, obrazy.

Co dochodzi:
- **Wersje ofert** — każda publikacja aktualizacji tworzy wersję (numer, notatki, data). Kupujący widzą changelog oferty i dostają powiadomienie o aktualizacji.
- **Wypłaty dla twórców** — twórca zgłasza wypłatę z salda (metoda + dane kontaktowe), admin zatwierdza/odrzuca w panelu, saldo się blokuje i rozlicza.
- **Ulubione / wishlist** — serce na karcie oferty, zakładka „Saved" w koncie.
- **Wyszukiwarka i UI** — pasek wyszukiwania po tytule/tagach, chipsy kategorii, karty z ratingiem i liczbą sprzedaży, sticky panel zakupu na stronie oferty.
- **Statystyki twórcy** — wyświetlenia oferty, konwersja, przychód w USD na stronie „Moje oferty".

## Faza 2 — Onboarding

- Po pierwszym logowaniu kreator w 3 krokach: cel (moderacja / zabawa / społeczność) → wybór szablonu lub pusty bot → podłączenie tokenu.
- Publiczna strona `/templates` z galerią szablonów i przyciskiem „Use template".
- Checklista startowa na dashboardzie (utwórz bota, dodaj komendę, uruchom, opublikuj) z paskiem postępu, znika po ukończeniu.

## Faza 3 — Kody referral

- Każdy użytkownik dostaje kod i link `?ref=KOD` na stronie `/referrals`.
- Rejestracja z kodem: zapis powiązania; po pierwszym doładowaniu/zakupie polecającego i poleconego zasila bonus w USD (domyślnie 2 USD / 10% pierwszego zakupu — wartości konfigurowalne w adminie).
- Statystyki: kliknięcia, rejestracje, zarobione USD; wypłaty przez saldo.
- Ochrona przed nadużyciem: brak samo-polecania, jedno powiązanie na konto, bonus dopiero po realnej płatności.

## Faza 4 — 2FA kodem e-mail

- Włączenie 2FA w ustawieniach konta; przy logowaniu e-mailem po haśle krok z 6-cyfrowym kodem (ważny 10 min, limit prób, jednorazowy, hash w bazie).
- Kody wysyłane z **auth@bottly.xyz** — wymaga podpięcia domeny e-mail w Lovable Cloud (DNS). Bez tego nie da się wysyłać z tego adresu.
- Kody zapasowe (10 sztuk, do pobrania), możliwość regeneracji.
- Nowoczesny ekran weryfikacji: 6 pól OTP, auto-focus, wklejanie kodu, odliczanie do ponownego wysłania.

## Szczegóły techniczne

- Nowe tabele: `listing_versions`, `listing_favorites`, `payout_requests`, `referrals` + `referral_rewards`, `user_2fa` (secret/enabled), `email_otp_codes` (hash, expires_at, attempts), `backup_codes`. Każda z RLS i GRANT-ami; operacje wrażliwe przez `service_role` w server functions.
- Server functions w `src/lib/*.functions.ts` z `requireSupabaseAuth`; wysyłka e-maili przez server route + provider e-mail Lovable Cloud.
- Panel admina: nowe zakładki „Payouts" i „Referrals" (konfiguracja bonusu).
- Spójny styl: istniejące tokeny motywu, zaokrąglone karty, brak twardych kolorów.

## Zależność do potwierdzenia

Faza 4 wymaga skonfigurowania domeny e-mail dla `bottly.xyz`, żeby kody wychodziły z `auth@bottly.xyz`.
