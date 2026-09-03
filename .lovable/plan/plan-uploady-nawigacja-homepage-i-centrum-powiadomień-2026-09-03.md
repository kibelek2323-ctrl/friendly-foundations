# Plan: uploady, nawigacja, homepage i centrum powiadomień

## 1. Naprawa „Bucket not found”
- Zweryfikować upload w tej samej sesji i konfiguracji backendu, z której korzysta aplikacja; bucket `marketplace-images` istnieje i ma limit 5 MB, więc błąd wskazuje na rozbieżne powiązanie środowiska lub przeglądarkowy klient storage.
- Przenieść zapis pliku i tworzenie podpisanego adresu do chronionej funkcji serwerowej, która używa kanonicznego połączenia backendowego po sprawdzeniu zalogowanego użytkownika.
- Zachować ścieżki plików przypisane do użytkownika, limity typu/rozmiaru, maksymalnie 6 zdjęć oraz czytelne komunikaty błędów.
- Przestać zapisywać wieloletnie podpisane URL-e jako dane oferty: przechowywać ścieżki obiektów, a przy odczycie ofert generować aktualne podpisane URL-e. Zapewni to poprawne wyświetlanie prywatnych zdjęć również po wygaśnięciu linku.
- Sprawdzić upload, podgląd zdjęcia, utworzenie oferty i publiczne wyświetlenie galerii na desktopie i mobile.

## 2. Publiczny navbar i menu konta
- Ujednolicić publiczny header, aby homepage, marketplace oraz nowe strony używały jednego spójnego układu.
- Dla zalogowanej osoby pokazać kolejno: zielony balans USD z ikoną dolara, avatar użytkownika i rozwijane menu.
- W menu umieścić co najmniej: **Open dashboard**, **Marketplace**, **Balance**, **FAQ**, **Status**, **Terms**, **Docs** i **Log out**.
- Na mobile zastąpić szeroką nawigację kompaktowym dropdownem otwieranym z avatara/menu; dla gościa zachować czytelne akcje logowania i rejestracji.
- Usunąć odnośniki do Pricing z publicznej nawigacji i stopki, bez usuwania istniejącej strony `/pricing`, aby nie psuć starego adresu.

## 3. Rozbudowa homepage
- Usunąć sekcję kart cenowych z homepage.
- Rozwinąć stronę o bardziej szczegółowe, produktowe sekcje: wizualny builder i podgląd Discord, komendy i komponenty, automatyzacje, publikowanie/uruchamianie botów oraz marketplace.
- Dodać krótkie „jak to działa”, konkretne korzyści i sekcję FAQ-preview prowadzącą do pełnego FAQ.
- Zachować obecny ciemny, discordowy styl, semantyczne tokeny, responsywność i istniejące ogłoszenia popup/bar.

## 4. Centrum powiadomień w dashboardzie
- Dodać w górnym pasku obok Search i „New bot” ikonę dzwonka z licznikiem nieprzeczytanych wiadomości.
- Desktop: panel rozwijany; mobile: panel dopasowany do małej szerokości, bez nachodzenia na pozostałe akcje.
- Połączyć w jednej osi czasu:
  - aktywne ogłoszenia administratora,
  - indywidualne powiadomienia systemowe użytkownika, np. zakup/sprzedaż, status lub błąd bota.
- Dodać oznaczanie pojedynczego wpisu oraz wszystkich wpisów jako przeczytane, linki do właściwego miejsca i czytelne stany pusty/ładowanie/błąd.
- Utworzyć bezpieczną tabelę powiadomień użytkownika z grantami i RLS ograniczającym odczyt/zmianę do właściciela; zapisy systemowe wykonywać wyłącznie po stronie serwera.
- Podłączyć istniejące źródła zdarzeń (zakupy/sprzedaż i runtime bota) bez duplikowania wpisów; ogłoszenia admina pozostaną wspólną warstwą broadcast.

## 5. Nowe strony publiczne
- Dodać osobne trasy:
  - `/faq` — pytania o tworzenie botów, Discord, marketplace, płatności/balance i uruchamianie,
  - `/terms` — regulamin korzystania, konta, treści użytkowników, marketplace, płatności i ograniczenia odpowiedzialności,
  - `/status` — bieżący stan kluczowych obszarów produktu oraz ostatnie komunikaty administracyjne.
- Każda strona otrzyma własny tytuł, opis, Open Graph, Twitter Card, jedno H1 i wspólny publiczny header/footer.
- Dodać linki do tych stron w menu i stopce.

## 6. Weryfikacja
- Sprawdzić migrację i reguły dostępu, a następnie uruchomić testy typów/testy projektu wykonywane przez harness.
- Przetestować w przeglądarce: upload obrazu, publikację i publiczny podgląd oferty, navbar dla gościa i zalogowanego użytkownika, dropdown mobilny, centrum powiadomień i stan przeczytania oraz wszystkie nowe trasy.
- Zweryfikować brak błędów konsoli i żądań 4xx/5xx w zmienionych przepływach.

## Szczegóły techniczne
- Upload będzie chronioną funkcją `createServerFn` z istniejącym middleware sesji; sekretne połączenie nie trafi do klienta.
- Nowa tabela powiadomień będzie zawierać użytkownika, typ, tytuł, treść, opcjonalny link, klucz deduplikacji, czas utworzenia i czas odczytu.
- Publiczne odczyty obrazów pozostaną bezpieczne dzięki krótkotrwałym podpisanym URL-om generowanym z zapisanych ścieżek.
- Nowe publiczne trasy pozostaną SSR-friendly i będą używać TanStack Router oraz istniejących komponentów projektu.
