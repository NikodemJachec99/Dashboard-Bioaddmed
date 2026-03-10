# BioAddMed Wrocław University of Science and Technology — pełny plan techniczny aplikacji webowej

## Wersja dokumentu
- **Nazwa projektu:** BioAddMed Hub
- **Organizacja:** Koło naukowe BioAddMed, Politechnika Wrocławska
- **Typ dokumentu:** pełna specyfikacja produktu i architektury technicznej
- **Docelowy stack:** Django + Django REST Framework + PostgreSQL + React + Docker + VPS Mikrus + GitHub
- **Cel dokumentu:** opisanie kompletnej aplikacji operacyjnej dla koła naukowego, obejmującej zarządzanie ludźmi, projektami, zadaniami, spotkaniami, wiedzą, głosowaniami, raportami i historią działań

---

# 1. Streszczenie produktu

## 1.1. Czym jest aplikacja
Aplikacja ma być centralnym systemem operacyjnym koła naukowego BioAddMed. Nie ma to być wyłącznie tablica z taskami, tylko pełne środowisko pracy koła, które integruje:
- członków koła,
- projekty badawcze, inżynierskie i organizacyjne,
- zadania typu kanban,
- harmonogramy i spotkania,
- głosowania administracyjne,
- bazę wiedzy,
- archiwum dorobku,
- raportowanie i monitoring aktywności.

System ma służyć zarówno codziennej pracy członków, jak i zarządzaniu operacyjnemu przez admina i koordynatorów.

## 1.2. Główny cel biznesowy
Zastąpić chaos organizacyjny jednym spójnym systemem, w którym od razu wiadomo:
- jakie projekty prowadzi koło,
- na jakim etapie jest każdy projekt,
- kto bierze udział w danym projekcie,
- jakie zadania są do wykonania,
- kiedy odbywają się spotkania,
- jakie decyzje wymagają głosowania,
- jakie materiały i ustalenia już istnieją,
- jaki jest realny poziom aktywności członków.

## 1.3. Kluczowe problemy, które system rozwiązuje
- brak jednej bazy członków i kompetencji,
- brak centralnego widoku projektów,
- słaby onboarding nowych osób,
- rozproszenie wiedzy i plików,
- ginące ustalenia po spotkaniach,
- brak przejrzystości odpowiedzialności,
- trudność w pilnowaniu terminów,
- brak łatwego mechanizmu głosowania i podejmowania decyzji,
- utrata wiedzy przy zmianie roczników lub zarządu.

---

# 2. Założenia funkcjonalne wysokiego poziomu

## 2.1. Każdy zalogowany użytkownik ma mieć dostęp do
- pulpitu głównego,
- listy wszystkich projektów,
- szczegółów projektów,
- aktualnego etapu projektu,
- listy członków projektu,
- kalendarza spotkań,
- ogłoszeń,
- własnego profilu,
- własnych zadań,
- bazy wiedzy w zakresie dozwolonym przez uprawnienia,
- wyników i aktywnych głosowań, jeśli są dla niego dostępne.

## 2.2. Admin ma mieć dodatkowo dostęp do
- pełnego zarządzania użytkownikami,
- zarządzania rolami,
- zakładania projektów,
- przypisywania użytkowników do projektów,
- wyznaczania koordynatorów,
- tworzenia głosowań,
- zarządzania spotkaniami i kalendarzem globalnym,
- podglądu metryk aktywności,
- generowania raportów,
- archiwizacji projektów,
- wglądu w historię zmian i logi audytowe.

## 2.3. Koordynator projektu ma mieć dostęp do
- zarządzania powierzonym projektem,
- aktualizacji etapu projektu,
- tworzenia i edycji tablicy kanban,
- dodawania tasków,
- przypisywania zadań członkom projektu,
- planowania spotkań projektowych,
- dodawania notatek po spotkaniach,
- zarządzania milestone’ami,
- zgłaszania ryzyk i blockerów,
- publikowania aktualizacji projektu.

## 2.4. Członek projektu ma mieć dostęp do
- przeglądu projektu,
- swoich zadań,
- możliwości zmiany statusu swoich zadań,
- komentarzy do zadań,
- uczestnictwa w spotkaniach,
- głosowania, jeśli ma do niego dostęp,
- przeglądania dokumentacji i bazy wiedzy,
- zgłaszania chęci dołączenia do projektów.

---

# 3. Role, model uprawnień i domena bezpieczeństwa

## 3.1. Role systemowe

### Admin
Rola globalna z pełnym dostępem administracyjnym. Admin zarządza całym systemem.

### Member
Rola globalna podstawowa. Każdy zwykły użytkownik systemu należy do tej roli.

## 3.2. Role projektowe

### Coordinator
Rola przypisana do konkretnego projektu przez tabelę członkostwa projektowego. Nie daje globalnego dostępu administracyjnego, ale daje szerokie uprawnienia wewnątrz danego projektu.

### Project Member
Uczestnik projektu bez uprawnień koordynacyjnych.

## 3.3. Zasada uprawnień
System musi opierać się na dwóch poziomach kontroli:
1. **rola globalna** — określa, czy użytkownik jest adminem,
2. **rola kontekstowa w projekcie** — określa, czy jest koordynatorem danego projektu.

To pozwala uniknąć błędu polegającego na tym, że ktoś będący koordynatorem jednego projektu ma dostęp administracyjny do wszystkich innych.

## 3.4. Matryca dostępu

| Funkcja | Admin | Koordynator projektu | Członek projektu | Zalogowany użytkownik |
|---|---|---:|---:|---:|
| Podgląd dashboardu globalnego | Tak | Tak | Tak | Tak |
| Podgląd listy projektów | Tak | Tak | Tak | Tak |
| Tworzenie projektu | Tak | Nie | Nie | Nie |
| Edycja dowolnego projektu | Tak | Nie | Nie | Nie |
| Edycja własnego projektu | Tak | Tak | Nie | Nie |
| Dodawanie użytkowników | Tak | Nie | Nie | Nie |
| Nadawanie ról | Tak | Nie | Nie | Nie |
| Przypisywanie użytkowników do projektu | Tak | Tak, w swoim projekcie | Nie | Nie |
| Zarządzanie taskami projektu | Tak | Tak | Ograniczone, własne | Nie |
| Tworzenie spotkań globalnych | Tak | Nie | Nie | Nie |
| Tworzenie spotkań projektowych | Tak | Tak | Nie | Nie |
| Tworzenie głosowań | Tak | Opcjonalnie, jeśli nadane uprawnienie | Nie | Nie |
| Udział w głosowaniach | Tak | Tak | Tak | Tak, jeśli uprawniony |
| Dostęp do logów audytowych | Tak | Nie | Nie | Nie |
| Generowanie raportów | Tak | Tak, raporty projektowe | Nie | Nie |

---

# 4. Moduły funkcjonalne systemu

# 4.1. Moduł użytkowników i członków koła

## Cel
Utrzymywanie jednej aktualnej bazy osób działających w kole.

## Funkcje
- tworzenie kont,
- aktywacja/dezaktywacja użytkowników,
- edycja danych członka,
- reset hasła,
- przypisanie roli globalnej,
- przypisanie do projektów,
- profil użytkownika,
- lista projektów użytkownika,
- historia aktywności,
- profil kompetencji.

## Dane w profilu użytkownika
- imię,
- nazwisko,
- email,
- avatar,
- bio,
- rok studiów,
- kierunek,
- specjalizacja,
- zainteresowania,
- umiejętności,
- technologie,
- doświadczenie,
- dostępność godzinowa,
- data dołączenia do koła,
- status aktywności,
- osiągnięcia,
- uczestnictwo w projektach.

## Rozszerzenia
- profil portfolio członka,
- eksport dorobku do CV,
- wykres aktywności członka.

---

# 4.2. Moduł projektów

## Cel
Prowadzenie pełnego rejestru projektów koła i monitorowanie ich przebiegu.

## Dane projektu
- nazwa,
- slug,
- krótki opis,
- pełny opis,
- kategoria,
- typ projektu,
- etap realizacji,
- status,
- procent postępu,
- data utworzenia,
- data rozpoczęcia,
- planowana data zakończenia,
- rzeczywista data zakończenia,
- koordynatorzy,
- członkowie,
- linki do zasobów,
- powiązane spotkania,
- milestone’y,
- ryzyka,
- archiwum zmian,
- podsumowanie rezultatów.

## Przykładowe kategorie projektów
- badawczy,
- biomedyczny,
- inżynierski,
- organizacyjny,
- konferencyjny,
- grantowy,
- promocyjny,
- edukacyjny.

## Przykładowe etapy
- pomysł,
- analiza,
- planowanie,
- w realizacji,
- testy,
- walidacja,
- publikacja,
- zakończony,
- wstrzymany,
- zarchiwizowany.

## Funkcje projektu
- tworzenie projektu,
- edycja szczegółów projektu,
- przypisywanie członków,
- przypisywanie koordynatorów,
- aktualizacja etapu,
- aktualizacja statusu,
- śledzenie postępu,
- widok składu projektu,
- przegląd powiązanych tasków,
- przegląd spotkań,
- przegląd dokumentacji,
- archiwum projektu.

---

# 4.3. Moduł tablicy kanban i task management

## Cel
Zarządzanie codzienną pracą w projektach.

## Struktura
Każdy projekt posiada własną tablicę kanban. Tablica zawiera kolumny oraz karty tasków.

## Domyślne kolumny
- Backlog,
- To Do,
- In Progress,
- Review,
- Done,
- Blocked.

## Dane taska
- tytuł,
- opis,
- projekt,
- kolumna,
- status,
- priorytet,
- assignee,
- autor,
- deadline,
- order w kolumnie,
- estymacja czasu,
- realny czas,
- tagi,
- zależności,
- komentarze,
- załączniki,
- historia zmian.

## Priorytety
- low,
- medium,
- high,
- urgent.

## Funkcje
- tworzenie tasków,
- edycja tasków,
- przeciąganie tasków między kolumnami,
- przypisywanie do użytkowników,
- ustawianie priorytetu,
- ustawianie terminu,
- filtrowanie po osobie, statusie, priorytecie, tagach,
- oznaczanie blockerów,
- komentowanie,
- wzmianki `@user`,
- checklisty w taskach,
- taski cykliczne,
- historia aktywności taska.

## Logika dostępu
- admin i koordynator mogą tworzyć i edytować taski,
- członek może edytować status swoich tasków,
- członek może dodawać komentarze,
- tylko admin i koordynator mogą usuwać taski lub przepisywać odpowiedzialność.

---

# 4.4. Moduł spotkań i terminarza

## Cel
Zintegrowanie planowania spotkań z codzienną pracą zespołów.

## Typy spotkań
- spotkanie ogólne koła,
- spotkanie projektowe,
- spotkanie zarządu,
- warsztat,
- konsultacje,
- prezentacja wyników,
- wydarzenie zewnętrzne.

## Dane spotkania
- tytuł,
- opis,
- typ,
- projekt powiązany opcjonalnie,
- organizator,
- uczestnicy,
- data,
- godzina rozpoczęcia,
- godzina zakończenia,
- lokalizacja lub link online,
- agenda,
- notatka po spotkaniu,
- lista ustaleń,
- lista zadań wynikających ze spotkania,
- status spotkania,
- obecności.

## Funkcje
- tworzenie wydarzeń w kalendarzu,
- zapraszanie uczestników,
- potwierdzanie obecności,
- edycja agendy,
- dodawanie notatek po spotkaniu,
- generowanie tasków z ustaleń,
- widok kalendarza miesiąc/tydzień/dzień,
- filtrowanie po projekcie i typie,
- przypomnienia o spotkaniach,
- historia spotkań w projekcie.

## Dodatkowe możliwości
- eksport do ICS,
- integracja z Google Calendar w przyszłości,
- rejestr obecności,
- podsumowanie AI notatek ze spotkania w późniejszej wersji.

---

# 4.5. Moduł głosowań

## Cel
Formalizacja procesu podejmowania decyzji administracyjnych i projektowych.

## Założenie
Admin musi mieć możliwość tworzenia głosowań. Opcjonalnie można rozszerzyć system tak, by wybrane osoby, np. zarząd lub koordynatorzy, także mogli zakładać głosowania w swoim zakresie.

## Typy głosowań
- ogólnokołowe,
- zarządowe,
- projektowe,
- administracyjne,
- rekrutacyjne,
- strategiczne.

## Typy pytań
- jednoodpowiedziowe,
- wieloodpowiedziowe,
- tak/nie,
- skala,
- zatwierdzenie odrzucenie.

## Dane głosowania
- tytuł,
- opis,
- typ,
- autor,
- zakres odbiorców,
- data rozpoczęcia,
- data zakończenia,
- anonimowe lub jawne,
- minimalne quorum,
- wymagany próg,
- status,
- odpowiedzi,
- wynik,
- komentarz końcowy.

## Funkcje
- tworzenie głosowania,
- ustawienie grupy uprawnionych do głosowania,
- ustawienie czasu trwania,
- możliwość oddania głosu tylko raz,
- podgląd frekwencji,
- zablokowanie głosowania po terminie,
- automatyczne liczenie wyników,
- ogłoszenie wyniku,
- archiwum zakończonych głosowań,
- powiadomienia o nowych głosowaniach.

## Przykładowe zastosowania
- wybór nowego projektu,
- głosowanie nad budżetem,
- zatwierdzenie współpracy,
- wybór terminu wydarzenia,
- wybór koordynatora,
- decyzja o archiwizacji projektu.

---

# 4.6. Moduł dashboardów

## Cel
Zapewnienie szybkiego wglądu w stan koła i bieżące obowiązki.

## Dashboard globalny dla każdego zalogowanego
- liczba aktywnych projektów,
- liczba członków,
- projekty na różnych etapach,
- najbliższe spotkania,
- ostatnie aktywności,
- najnowsze ogłoszenia,
- aktywne głosowania,
- skrót do własnych zadań.

## Dashboard osobisty
- moje taski na dziś,
- taski na ten tydzień,
- zaległe taski,
- projekty, w których uczestniczę,
- spotkania, w których mam uczestniczyć,
- oczekujące głosowania,
- moje ostatnie aktywności.

## Dashboard zarządu/admina
- liczba projektów aktywnych,
- projekty zagrożone,
- projekty bez aktualizacji od X dni,
- liczba tasków po terminie,
- liczba tasków zablokowanych,
- aktywność członków,
- frekwencja w głosowaniach,
- statystyki spotkań,
- członkowie bez przypisanego projektu,
- projekty bez koordynatora.

## Dashboard projektu
- etap projektu,
- procent postępu,
- aktywne milestone’y,
- ostatnie taski,
- zespół,
- nadchodzące spotkania,
- ryzyka i blokery,
- najnowsze pliki i notatki.

---

# 4.7. Moduł bazy wiedzy

## Cel
Zatrzymanie wiedzy organizacyjnej i projektowej w jednym miejscu.

## Typy wpisów
- poradniki,
- instrukcje,
- standardy pracy,
- wzory dokumentów,
- checklisty,
- lessons learned,
- notatki projektowe,
- FAQ,
- onboarding nowych członków.

## Funkcje
- tworzenie artykułów,
- wersjonowanie wpisów,
- tagowanie,
- kategoryzacja,
- wyszukiwanie,
- filtrowanie,
- pinowanie ważnych materiałów,
- powiązanie wpisów z projektami,
- uprawnienia prywatne/publiczne wewnątrz systemu,
- archiwizacja starych treści.

## Przykładowe zastosowania
- jak dołączyć do projektu,
- jak zgłosić nową inicjatywę,
- procedura przygotowania prezentacji,
- checklisty do zamknięcia projektu,
- dostęp do materiałów laboratoryjnych lub technicznych.

---

# 4.8. Moduł ogłoszeń

## Cel
Umożliwienie publikowania informacji organizacyjnych bez gubienia ich w komunikatorach.

## Funkcje
- tworzenie ogłoszeń,
- przypinanie ważnych ogłoszeń,
- określenie odbiorców,
- data publikacji i wygaśnięcia,
- załączniki,
- komentarze opcjonalnie,
- powiadomienia o nowym ogłoszeniu.

## Typy ogłoszeń
- organizacyjne,
- pilne,
- rekrutacyjne,
- wydarzenia,
- sukcesy i osiągnięcia,
- administracyjne.

---

# 4.9. Moduł kompetencji i rekrutacji do projektów

## Cel
Lepsze dopasowanie ludzi do projektów i uporządkowany nabór.

## Kompetencje użytkownika
- obszary wiedzy,
- technologie,
- narzędzia,
- poziom biegłości,
- zainteresowania,
- preferowane typy projektów,
- dostępność tygodniowa.

## Rekrutacja do projektu
Koordynator może otworzyć nabór do projektu i określić:
- kogo szuka,
- ile osób potrzeba,
- jakie kompetencje są wymagane,
- jaki jest deadline zgłoszeń,
- jak duże zaangażowanie jest potrzebne.

## Funkcje
- formularz zgłoszenia,
- status zgłoszenia,
- przegląd kandydatur,
- akceptacja/odrzucenie,
- automatyczne dodanie do projektu po akceptacji.

---

# 4.10. Moduł milestone’ów, ryzyk i blockerów

## Cel
Pokazanie, czy projekt rzeczywiście zmierza do celu.

## Milestone
Dane:
- tytuł,
- opis,
- termin,
- status,
- powiązane taski,
- procent realizacji.

## Ryzyko
Dane:
- tytuł,
- opis,
- poziom ryzyka,
- wpływ,
- plan mitigacji,
- właściciel ryzyka,
- status.

## Blocker
Dane:
- opis,
- data zgłoszenia,
- zgłaszający,
- projekt,
- zadania powiązane,
- status rozwiązania.

## Funkcje
- zgłaszanie ryzyk,
- śledzenie blockerów,
- dashboard problemów,
- powiadomienia do koordynatora/admina,
- raport projektowych zagrożeń.

---

# 4.11. Moduł archiwum i historii koła

## Cel
Budowanie pamięci organizacyjnej.

## Zawartość archiwum
- zakończone projekty,
- dorobek projektów,
- publikacje,
- prezentacje,
- prototypy,
- zdjęcia,
- lista uczestników,
- wnioski i lessons learned,
- sprawozdania.

## Funkcje
- archiwizacja projektu,
- publicznie widoczny wewnętrznie opis rezultatów,
- możliwość filtrowania po roku i kategorii,
- powiązanie z osiągnięciami członków.

---

# 4.12. Moduł raportów i sprawozdań

## Cel
Automatyzacja raportowania dla zarządu i uczelni.

## Typy raportów
- tygodniowy raport aktywności,
- miesięczny raport projektów,
- raport członków,
- raport spotkań,
- raport głosowań,
- raport terminów,
- raport projektu końcowego,
- raport semestralny koła.

## Funkcje
- generowanie raportów po filtrach,
- eksport do PDF/CSV,
- harmonogram raportów,
- porównanie okresów,
- wykresy i zestawienia.

---

# 4.13. Moduł rezerwacji zasobów opcjonalny

## Cel
Zarządzanie wspólnym sprzętem i przestrzenią, jeśli koło dysponuje zasobami fizycznymi.

## Zasoby
- drukarka 3D,
- sprzęt laboratoryjny,
- sala,
- zestawy pomiarowe,
- mikroskop,
- komputer lub laptop,
- narzędzia specjalistyczne.

## Funkcje
- lista zasobów,
- kalendarz rezerwacji,
- status dostępności,
- opiekun zasobu,
- historia użycia,
- zasady korzystania.

---

# 4.14. Moduł osiągnięć i portfolio członków

## Cel
Budowanie ścieżki rozwoju członków i wartości dla CV.

## Funkcje
- udział w projektach,
- lista ukończonych zadań i milestone’ów,
- pełnione role,
- publikacje,
- udział w konferencjach,
- zdobyte kompetencje,
- certyfikaty,
- wygenerowanie profilu osiągnięć.

---

# 5. Wymagania funkcjonalne szczegółowe

# 5.1. Auth i bezpieczeństwo dostępu
- logowanie emailem i hasłem,
- odświeżanie tokenu,
- wylogowanie,
- odzyskiwanie hasła,
- zmiana hasła,
- blokowanie nieaktywnych kont,
- kontrola sesji,
- przyszłościowo 2FA.

# 5.2. Wymagania dla dashboardu
- szybkie ładowanie,
- personalizacja widoku,
- responsywność,
- karta projektu z kluczowymi informacjami,
- sekcja „co wymaga uwagi”.

# 5.3. Wymagania dla projektów
- każdy projekt ma mieć unikalny slug,
- projekt nie może istnieć bez twórcy,
- etap projektu musi być walidowany ze słownika,
- status projektu i etap są osobnymi polami,
- projekt może mieć wielu członków i wielu koordynatorów,
- członkostwo musi być wersjonowalne lub logowane.

# 5.4. Wymagania dla tasków
- task musi należeć do projektu,
- task może być przypisany maksymalnie do jednego głównego właściciela w MVP,
- task może mieć wielu obserwatorów w dalszej wersji,
- zmiana kolumny aktualizuje status logiczny,
- przesunięcie taska w kanbanie zapisuje order,
- task ukończony zapisuje datę ukończenia.

# 5.5. Wymagania dla spotkań
- spotkanie może być globalne lub projektowe,
- uczestnicy mogą potwierdzać obecność,
- po spotkaniu można dodać notatkę,
- z notatki można utworzyć taski,
- system powinien przypomnieć o spotkaniu.

# 5.6. Wymagania dla głosowań
- jeden użytkownik może oddać głos tylko raz,
- po zakończeniu terminu głosowanie jest zamykane,
- system zapisuje metadane głosu zgodnie z typem jawności,
- jeśli głosowanie jest anonimowe, nie pokazuje autora głosu,
- system liczy wynik automatycznie,
- możliwe jest sprawdzanie quorum.

---

# 6. Wymagania niefunkcjonalne

## 6.1. Wydajność
- dashboard powinien renderować podstawowe dane szybko,
- listy powinny używać paginacji,
- widoki z dużą liczbą tasków powinny mieć lazy loading lub odpowiednie query,
- backend powinien używać optymalizacji `select_related` i `prefetch_related`.

## 6.2. Skalowalność
System nie będzie ogromny na początku, ale powinien być gotowy na:
- rosnącą liczbę członków,
- rosnącą liczbę projektów,
- wieloletnie archiwum danych,
- dodanie integracji z zewnętrznymi usługami.

## 6.3. Utrzymywalność
- czytelna architektura modułowa,
- rozdzielenie backendu i frontendu,
- czytelny model domenowy,
- testy,
- dokumentacja API,
- spójny styl kodu.

## 6.4. Bezpieczeństwo
- hasła hashowane,
- JWT lub bezpieczna autoryzacja sesyjna,
- CORS ograniczony do frontendu,
- rate limiting logowania,
- walidacja payloadów,
- logi bezpieczeństwa,
- backup bazy danych,
- bezpieczne przechowywanie sekretów w `.env`.

## 6.5. Dostępność i UX
- responsywność na desktop i mobile,
- sensowny kontrast,
- czytelne komunikaty błędów,
- logiczne formularze,
- szybkie filtry i wyszukiwarka.

---

# 7. Architektura techniczna

# 7.1. Architektura wysokiego poziomu

## Frontend
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- biblioteka DnD do kanbana

## Backend
- Python 3.12+
- Django 5.x
- Django REST Framework
- PostgreSQL
- JWT auth
- Gunicorn

## Infrastruktura
- Docker
- Docker Compose
- Nginx
- VPS Mikrus
- GitHub + GitHub Actions

## Potencjalne rozszerzenia
- Redis,
- Celery,
- S3-compatible storage,
- mail service,
- integracja Discord/Slack,
- integracja Google Calendar.

---

# 7.2. Przepływ działania systemu
1. Użytkownik loguje się przez frontend.
2. Frontend pobiera token z backendu.
3. Frontend ładuje dashboard i podstawowe dane użytkownika.
4. Użytkownik przechodzi do projektu.
5. Backend zwraca dane projektu, członków, milestone’y, taski, spotkania i historię aktywności.
6. Koordynator zarządza taskami i spotkaniami.
7. Admin zarządza użytkownikami i głosowaniami.
8. System zapisuje logi aktywności i zmiany statusów.

---

# 8. Backend — architektura Django

# 8.1. Struktura aplikacji

```text
backend/
  manage.py
  config/
    settings/
      base.py
      dev.py
      prod.py
    urls.py
    asgi.py
    wsgi.py
  apps/
    users/
    projects/
    tasks/
    meetings/
    voting/
    dashboard/
    knowledge/
    announcements/
    activity/
    reports/
    common/
```

## 8.2. Zalecane biblioteki backendowe
- `django`
- `djangorestframework`
- `djangorestframework-simplejwt`
- `django-filter`
- `drf-spectacular`
- `psycopg`
- `gunicorn`
- `django-cors-headers`
- `Pillow`
- opcjonalnie `celery`, `redis`, `django-storages`

---

# 8.3. Model danych — główne encje

## User
- id
- email
- password
- first_name
- last_name
- avatar
- bio
- study_year
- field_of_study
- specialization
- joined_circle_at
- availability_hours_per_week
- system_role
- is_active
- is_staff
- created_at
- updated_at

## Skill
- id
- name
- category

## UserSkill
- id
- user
- skill
- level

## Project
- id
- name
- slug
- short_description
- description
- category
- project_type
- stage
- status
- progress_percent
- start_date
- planned_end_date
- actual_end_date
- created_by
- created_at
- updated_at

## ProjectMembership
- id
- user
- project
- project_role
- joined_at
- is_active

## ProjectLink
- id
- project
- label
- url
- type

## ProjectMilestone
- id
- project
- title
- description
- due_date
- status
- progress_percent

## ProjectRisk
- id
- project
- title
- description
- severity
- impact
- mitigation_plan
- owner
- status

## KanbanBoard
- id
- project
- name

## KanbanColumn
- id
- board
- name
- order
- color

## Task
- id
- project
- column
- title
- description
- status
- priority
- assignee
- created_by
- due_date
- estimated_hours
- actual_hours
- order
- completed_at
- created_at
- updated_at

## TaskTag
- id
- name
- color

## TaskComment
- id
- task
- author
- content
- created_at

## TaskChecklistItem
- id
- task
- content
- is_done
- order

## Meeting
- id
- title
- description
- meeting_type
- related_project
- organizer
- start_at
- end_at
- location
- online_url
- agenda
- notes
- status
- created_at

## MeetingParticipant
- id
- meeting
- user
- attendance_status
- presence_confirmed_at

## MeetingActionItem
- id
- meeting
- task
- description
- assignee
- due_date

## VotePoll
- id
- title
- description
- poll_type
- visibility_type
- author
- related_project
- starts_at
- ends_at
- quorum_required
- threshold_type
- status
- created_at

## VoteOption
- id
- poll
- label
- order

## VoteBallot
- id
- poll
- voter
- option
- cast_at

## KnowledgeArticle
- id
- title
- slug
- content
- category
- visibility
- related_project
- author
- is_pinned
- version
- created_at
- updated_at

## Announcement
- id
- title
- content
- audience_type
- start_at
- expires_at
- author
- is_pinned
- created_at

## ActivityLog
- id
- user
- action_type
- entity_type
- entity_id
- description
- metadata_json
- created_at

## ReportSnapshot
- id
- report_type
- generated_by
- parameters_json
- file_path
- created_at

---

# 8.4. Kluczowe decyzje modelowe
- użyć **custom user model** od samego początku,
- role projektowe przechowywać w `ProjectMembership`,
- osobno trzymać `stage` i `status` projektu,
- taski wiązać bezpośrednio z projektem i kolumną,
- spotkania i głosowania traktować jako niezależne moduły powiązywalne z projektem,
- audyt i historię trzymać centralnie w `ActivityLog`.

---

# 8.5. Permissions w Django REST Framework
Należy przygotować własne klasy uprawnień, np.:
- `IsAdminUserExtended`
- `IsProjectCoordinator`
- `IsProjectCoordinatorOrAdmin`
- `IsProjectMember`
- `IsTaskAssigneeOrCoordinatorOrAdmin`
- `CanVoteInPoll`
- `CanManageMeeting`

## Przykłady zasad
- tylko admin może tworzyć użytkowników,
- tylko admin może nadawać role globalne,
- admin i koordynator projektu mogą zarządzać taskami projektu,
- tylko uczestnik projektu może widzieć taski projektu, jeśli ustawisz bardziej restrykcyjny model,
- tylko użytkownik uprawniony do głosowania może oddać głos,
- głos można oddać tylko raz.

---

# 8.6. API REST — proponowany zestaw endpointów

## Auth
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset-confirm/`

## Users
- `GET /api/users/`
- `POST /api/users/`
- `GET /api/users/{id}/`
- `PATCH /api/users/{id}/`
- `DELETE /api/users/{id}/`
- `GET /api/users/{id}/projects/`
- `GET /api/users/{id}/activity/`
- `GET /api/users/{id}/portfolio/`

## Skills
- `GET /api/skills/`
- `POST /api/users/{id}/skills/`
- `PATCH /api/users/{id}/skills/{id}/`
- `DELETE /api/users/{id}/skills/{id}/`

## Projects
- `GET /api/projects/`
- `POST /api/projects/`
- `GET /api/projects/{id}/`
- `PATCH /api/projects/{id}/`
- `DELETE /api/projects/{id}/`
- `GET /api/projects/{id}/overview/`
- `GET /api/projects/{id}/activity/`
- `POST /api/projects/{id}/archive/`

## Project memberships
- `GET /api/projects/{id}/members/`
- `POST /api/projects/{id}/members/`
- `PATCH /api/projects/{id}/members/{membership_id}/`
- `DELETE /api/projects/{id}/members/{membership_id}/`

## Project links
- `GET /api/projects/{id}/links/`
- `POST /api/projects/{id}/links/`
- `PATCH /api/project-links/{id}/`
- `DELETE /api/project-links/{id}/`

## Milestones
- `GET /api/projects/{id}/milestones/`
- `POST /api/projects/{id}/milestones/`
- `PATCH /api/milestones/{id}/`
- `DELETE /api/milestones/{id}/`

## Risks / blockers
- `GET /api/projects/{id}/risks/`
- `POST /api/projects/{id}/risks/`
- `PATCH /api/risks/{id}/`
- `DELETE /api/risks/{id}/`

## Kanban
- `GET /api/projects/{id}/board/`
- `POST /api/projects/{id}/columns/`
- `PATCH /api/columns/{id}/`
- `DELETE /api/columns/{id}/`

## Tasks
- `GET /api/projects/{id}/tasks/`
- `POST /api/projects/{id}/tasks/`
- `GET /api/tasks/{id}/`
- `PATCH /api/tasks/{id}/`
- `DELETE /api/tasks/{id}/`
- `POST /api/tasks/{id}/move/`
- `POST /api/tasks/{id}/comments/`
- `GET /api/tasks/{id}/comments/`
- `POST /api/tasks/{id}/checklist/`

## Meetings
- `GET /api/meetings/`
- `POST /api/meetings/`
- `GET /api/meetings/{id}/`
- `PATCH /api/meetings/{id}/`
- `DELETE /api/meetings/{id}/`
- `POST /api/meetings/{id}/participants/`
- `POST /api/meetings/{id}/attendance/`
- `POST /api/meetings/{id}/action-items/`
- `POST /api/meetings/{id}/generate-tasks/`

## Voting
- `GET /api/polls/`
- `POST /api/polls/`
- `GET /api/polls/{id}/`
- `PATCH /api/polls/{id}/`
- `DELETE /api/polls/{id}/`
- `POST /api/polls/{id}/vote/`
- `GET /api/polls/{id}/results/`
- `POST /api/polls/{id}/close/`

## Knowledge base
- `GET /api/knowledge/`
- `POST /api/knowledge/`
- `GET /api/knowledge/{id}/`
- `PATCH /api/knowledge/{id}/`
- `DELETE /api/knowledge/{id}/`

## Announcements
- `GET /api/announcements/`
- `POST /api/announcements/`
- `PATCH /api/announcements/{id}/`
- `DELETE /api/announcements/{id}/`

## Dashboard
- `GET /api/dashboard/overview/`
- `GET /api/dashboard/my-summary/`
- `GET /api/dashboard/admin-summary/`
- `GET /api/dashboard/project-health/`

## Reports
- `POST /api/reports/generate/`
- `GET /api/reports/`
- `GET /api/reports/{id}/download/`

---

# 8.7. Serializery i walidacja
Każdy moduł powinien mieć osobne serializery read/write, jeśli struktura wejścia i wyjścia jest różna. Warto od razu przyjąć:
- osobne serializery list/detail,
- walidację domenową w serializerach i serwisach,
- filtrowanie przez `django-filter`,
- dokumentację OpenAPI przez `drf-spectacular`.

---

# 8.8. Serwisy domenowe
Dla bardziej złożonych akcji warto wprowadzić warstwę usług, np.:
- `ProjectService`
- `TaskService`
- `MeetingService`
- `VotingService`
- `ReportingService`

Przykłady zadań usług:
- archiwizacja projektu,
- tworzenie domyślnej tablicy kanban,
- generowanie tasków ze spotkania,
- liczenie wyników głosowania,
- budowanie dashboardu,
- generowanie raportu.

---

# 8.9. Testy backendu
Minimalny zakres:
- testy modeli,
- testy permissions,
- testy endpointów krytycznych,
- testy logiki głosowań,
- testy generowania tasków,
- testy raportów,
- testy autoryzacji.

Narzędzia:
- `pytest`
- `pytest-django`
- fabryki danych.

---

# 9. Frontend — architektura React

# 9.1. Stack frontendowy
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- biblioteka UI: MUI lub Tailwind + komponenty
- biblioteka drag-and-drop do kanban

## Rekomendacja
Dla panelu administracyjnego i aplikacji typu dashboard bardzo dobrze sprawdzi się:
- **MUI** jeśli chcesz szybko osiągnąć profesjonalny wygląd,
- **Tailwind + własny design system** jeśli zależy Ci na pełnej kontroli wizualnej.

---

# 9.2. Struktura projektu frontendowego

```text
frontend/
  src/
    app/
      router/
      providers/
      layouts/
    pages/
      auth/
      dashboard/
      projects/
      tasks/
      meetings/
      voting/
      members/
      knowledge/
      admin/
      profile/
      reports/
    features/
      auth/
      users/
      projects/
      kanban/
      meetings/
      voting/
      knowledge/
      announcements/
      dashboard/
    components/
      common/
      layout/
      ui/
    hooks/
    api/
    types/
    utils/
```

---

# 9.3. Główne widoki

## Auth
- logowanie,
- reset hasła,
- ustawienie nowego hasła.

## Dashboard
- kafelki statystyk,
- lista projektów,
- moje zadania,
- najbliższe spotkania,
- aktywne głosowania,
- ogłoszenia,
- sekcja „wymaga uwagi”.

## Projects list
- karty projektów,
- filtry,
- wyszukiwarka,
- badge etapu,
- progress bar,
- liczba członków.

## Project detail
- header projektu,
- opis,
- etap i status,
- zespół,
- milestone’y,
- ryzyka,
- taby: overview / kanban / meetings / files / knowledge / activity.

## Kanban
- kolumny,
- karty,
- drag and drop,
- modal taska,
- filtry,
- widok listy jako alternatywa.

## Meetings calendar
- widok miesiąca / tygodnia / dnia,
- lista spotkań,
- szczegóły spotkania,
- RSVP,
- notatki i action items.

## Voting
- lista aktywnych i archiwalnych głosowań,
- widok szczegółów,
- formularz oddania głosu,
- wyniki.

## Members
- lista członków,
- profil użytkownika,
- kompetencje,
- projekty.

## Knowledge base
- lista artykułów,
- filtr po kategoriach,
- wyszukiwarka,
- widok artykułu,
- edycja.

## Admin
- user management,
- project management,
- role management,
- polls management,
- reports,
- system activity.

---

# 9.4. Kluczowe komponenty UI

## Layout
- `AppShell`
- `Sidebar`
- `Topbar`
- `Breadcrumbs`
- `ProtectedRoute`
- `RoleGuard`

## Dashboard
- `StatCard`
- `ProjectSummaryCard`
- `MeetingWidget`
- `VotingWidget`
- `AnnouncementsWidget`
- `MyTasksWidget`

## Project
- `ProjectHeader`
- `ProjectMembersPanel`
- `ProjectStageBadge`
- `MilestoneList`
- `RiskPanel`
- `ProjectActivityFeed`

## Kanban
- `KanbanBoard`
- `KanbanColumn`
- `TaskCard`
- `TaskModal`
- `TaskFilters`
- `TaskCommentList`
- `ChecklistEditor`

## Meetings
- `CalendarView`
- `MeetingCard`
- `MeetingForm`
- `AttendanceSelector`
- `MeetingNotesEditor`

## Voting
- `PollCard`
- `PollForm`
- `VoteOptions`
- `PollResultChart`

## Admin
- `UserTable`
- `UserForm`
- `ProjectAssignmentModal`
- `RoleBadge`
- `ReportGenerator`

---

# 9.5. Zarządzanie stanem

## Rekomendacja
- auth w Context API,
- dane serwerowe w TanStack Query,
- formularze przez React Hook Form,
- walidacja wejścia przez Zod.

## Korzyści
- prostszy frontend,
- dobry cache,
- mniejsza liczba ręcznego zarządzania stanem,
- łatwa obsługa loadingów, invalidacji i optimistic updates.

---

# 9.6. UX i interakcje
- czytelne etykiety etapów i statusów,
- kolorowe badge’y priorytetów,
- szybkie wyszukiwanie globalne,
- kliknięcie w projekt prowadzi do szczegółów,
- task otwiera modal zamiast pełnego przeładowania,
- filtry pamiętane lokalnie,
- puste stany z sensownymi komunikatami,
- potwierdzenia przy destrukcyjnych akcjach,
- responsywność dla tabletów i telefonów.

---

# 10. Wzorce ekranów i przepływy użytkownika

# 10.1. Flow nowego użytkownika
1. Admin tworzy konto.
2. Użytkownik ustawia hasło.
3. Loguje się.
4. Widzi dashboard, swoje projekty, spotkania i zadania.
5. Uzupełnia profil i kompetencje.

# 10.2. Flow nowego projektu
1. Admin tworzy projekt.
2. Dodaje opis, kategorię, etap i terminy.
3. Przypisuje koordynatora.
4. Koordynator dodaje członków, milestone’y i taski.
5. Powstaje domyślna tablica kanban.

# 10.3. Flow spotkania projektowego
1. Koordynator tworzy spotkanie.
2. Uczestnicy dostają powiadomienie.
3. Po spotkaniu koordynator dodaje notatkę.
4. Z ustaleń tworzone są taski.
5. Dashboard projektu pokazuje nowe action items.

# 10.4. Flow głosowania
1. Admin tworzy głosowanie.
2. Wskazuje uprawnionych odbiorców.
3. Użytkownicy oddają głos.
4. Po upływie czasu system zamyka głosowanie.
5. Wynik jest publikowany i archiwizowany.

---

# 11. Powiadomienia

## Typy powiadomień
- przypisano Ci task,
- zbliża się deadline,
- task jest spóźniony,
- dodano komentarz do Twojego taska,
- utworzono spotkanie,
- zbliża się spotkanie,
- dodano Cię do projektu,
- utworzono głosowanie,
- kończy się czas na oddanie głosu,
- opublikowano ogłoszenie,
- oznaczono Cię we wzmiance.

## Kanały
- in-app w MVP,
- email w V2,
- Discord/Slack w dalszej wersji.

---

# 12. Wyszukiwanie i filtrowanie

## Wyszukiwanie globalne
Powinno obejmować:
- projekty,
- użytkowników,
- taski,
- artykuły bazy wiedzy,
- spotkania,
- głosowania,
- ogłoszenia.

## Filtry lokalne
- po projekcie,
- po statusie,
- po etapie,
- po terminie,
- po użytkowniku,
- po kategorii,
- po typie spotkania,
- po aktywności.

---

# 13. Raporty i analityka

## Kluczowe KPI
- liczba aktywnych projektów,
- średni czas zamknięcia taska,
- liczba tasków po terminie,
- liczba spotkań na projekt,
- frekwencja spotkań,
- frekwencja głosowań,
- liczba aktywnych członków,
- projekty bez aktualizacji,
- liczba blockerów,
- procent ukończonych milestone’ów.

## Widoki analityczne
- wykresy aktywności miesięcznej,
- heatmapa aktywności użytkowników,
- zdrowie projektu,
- skuteczność realizacji terminów,
- statystyki zaangażowania członków.

---

# 14. Integracje zewnętrzne — plan rozszerzeń

## Priorytet późniejszy
- GitHub repository links,
- Google Drive / OneDrive links,
- Google Calendar sync,
- Discord webhook,
- email SMTP,
- eksport PDF,
- uczelniane formularze lub systemy raportowe, jeśli zajdzie potrzeba.

Na MVP wystarczy przechowywanie linków i podstawowy eksport raportów.

---

# 15. Bezpieczeństwo

## 15.1. Ochrona danych
- hasła tylko jako hash,
- brak trzymania sekretów w repo,
- `.env` poza kodem,
- oddzielenie środowisk dev/prod,
- regularne backupy PostgreSQL,
- role i permissions sprawdzane po stronie backendu, nie tylko w UI.

## 15.2. Audyt
- logowanie krytycznych operacji,
- zapis kto zmienił rolę, projekt, członkostwo, wynik głosowania, etap projektu,
- logowanie utworzenia/usunięcia tasków i spotkań.

## 15.3. Ochrona API
- JWT access i refresh token,
- rate limiting logowania,
- walidacja danych wejściowych,
- poprawna polityka CORS,
- odpowiednia konfiguracja `CSRF_TRUSTED_ORIGINS` jeśli będzie potrzebna,
- HTTPS na produkcji.

---

# 16. Docker, konteneryzacja i infrastruktura

# 16.1. Kontenery
- `frontend`
- `backend`
- `postgres`
- `nginx`
- opcjonalnie `redis`

## 16.2. Struktura repo monorepo

```text
bioaddmed-app/
  backend/
  frontend/
  deploy/
    docker-compose.dev.yml
    docker-compose.prod.yml
    nginx/
      default.conf
  .github/
    workflows/
      ci.yml
      deploy.yml
  README.md
```

## 16.3. Dockerfile backend
Powinien zawierać:
- bazę Python slim,
- instalację zależności,
- kopiowanie kodu,
- uruchamianie `gunicorn`.

## 16.4. Dockerfile frontend
Powinien zawierać:
- etap build z Node,
- etap serwowania statycznych plików,
- albo osobny Nginx obsługujący build.

## 16.5. Compose produkcyjny
Powinien uruchamiać:
- postgres z wolumenem,
- backend,
- frontend,
- nginx jako reverse proxy.

## 16.6. Wolumeny
- dane PostgreSQL,
- media,
- static files,
- backupy lub mount backupów opcjonalnie.

---

# 17. Deploy na VPS Mikrus

## 17.1. Założenia
- kod w GitHub,
- VPS Mikrus jako środowisko produkcyjne,
- domena lub subdomena,
- dostęp po SSH,
- Docker i Docker Compose na serwerze.

## 17.2. Schemat deployu
1. Push do `main`.
2. GitHub Actions uruchamia testy.
3. Jeśli testy przejdą, pipeline łączy się po SSH z VPS.
4. Repo jest aktualizowane.
5. Wykonywany jest `docker compose up -d --build`.
6. Backend uruchamia migracje i `collectstatic`.
7. Aplikacja jest dostępna przez Nginx.

## 17.3. Zmienne środowiskowe
- `DJANGO_SECRET_KEY`
- `DJANGO_SETTINGS_MODULE`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SIGNING_KEY`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

## 17.4. Produkcyjne aspekty operacyjne
- logrotate,
- backup cron dla PostgreSQL,
- monitoring stanu kontenerów,
- podstawowe alerty błędów.

---

# 18. GitHub Actions — CI/CD

## 18.1. CI backend
- lint,
- testy,
- sprawdzenie migracji,
- build obrazu.

## 18.2. CI frontend
- install,
- lint,
- typecheck,
- build.

## 18.3. CD produkcyjne
- deploy przez SSH,
- restart kontenerów,
- migracje,
- collectstatic,
- ewentualny warm-up aplikacji.

---

# 19. Roadmap wdrożeniowa

# Etap 0 — analiza i projekt
- finalizacja wymagań,
- makiety,
- ERD,
- architektura,
- backlog.

# Etap 1 — MVP backend
- custom user,
- auth,
- projekty,
- memberships,
- taski,
- podstawowe permissions,
- dashboard overview.

# Etap 2 — MVP frontend
- logowanie,
- dashboard,
- lista projektów,
- szczegóły projektu,
- kanban,
- panel użytkownika.

# Etap 3 — moduły rozszerzające
- spotkania,
- kalendarz,
- notatki,
- komentarze,
- ogłoszenia.

# Etap 4 — zarządzanie organizacją
- głosowania,
- baza wiedzy,
- raporty,
- kompetencje członków,
- onboarding.

# Etap 5 — rozwój zaawansowany
- portfolio członka,
- archiwum,
- rekrutacja do projektów,
- ryzyka i milestone’y,
- rezerwacje zasobów.

# Etap 6 — funkcje inteligentne
- AI summary projektów,
- AI summary spotkań,
- AI onboarding do projektu,
- rekomendacje przypisania osób po kompetencjach.

---

# 20. Priorytety implementacyjne

## Must-have
- auth,
- użytkownicy,
- role,
- projekty,
- członkostwa,
- dashboard,
- kanban,
- taski,
- spotkania,
- głosowania admina,
- Docker,
- deploy.

## Should-have
- komentarze,
- ogłoszenia,
- milestone’y,
- ryzyka,
- baza wiedzy,
- raporty.

## Nice-to-have
- kompetencje i rekrutacja,
- portfolio członków,
- archiwum sukcesów,
- rezerwacje zasobów,
- AI i integracje.

---

# 21. Ryzyka projektowe wdrożenia

## Ryzyka techniczne
- zbyt szeroki zakres na MVP,
- niedoszacowanie permissions,
- zbyt skomplikowana logika głosowań,
- brak testów krytycznych,
- problemy z responsywnością kanbana.

## Ryzyka organizacyjne
- rozrost wymagań,
- brak konsekwencji w używaniu systemu,
- niedokładne utrzymywanie danych o projektach,
- brak właściciela produktowego po stronie koła.

## Mitigacja
- podział na etapy,
- ścisłe MVP,
- onboarding użytkowników,
- rola admina jako właściciela danych,
- jasne procedury użycia systemu.

---

# 22. Najważniejsze decyzje architektoniczne

1. **Monorepo** dla prostszego wdrożenia.
2. **Django REST Framework** jako solidny backend administracyjno-biznesowy.
3. **React + TypeScript** jako nowoczesny frontend.
4. **PostgreSQL** jako główna baza danych.
5. **Docker Compose na VPS Mikrus** jako model wdrożenia.
6. **RBAC + role projektowe** jako model bezpieczeństwa.
7. **Spotkania i głosowania jako moduły pierwszoplanowe**, a nie dodatki.
8. **Baza wiedzy i archiwum** jako filary utrzymania pamięci organizacyjnej.

---

# 23. Finalna definicja produktu

BioAddMed Hub to pełnoprawna platforma operacyjna dla koła naukowego BioAddMed, której celem jest centralizacja zarządzania członkami, projektami, zadaniami, spotkaniami, wiedzą i procesami decyzyjnymi. System zapewnia wspólny pulpit projektów dla wszystkich zalogowanych użytkowników, rozbudowany model uprawnień dla admina i koordynatorów, tablice kanban, kalendarz spotkań, notatki i action items, głosowania administracyjne, profile kompetencji, bazę wiedzy, raporty i archiwum dorobku. Warstwa techniczna opiera się o Django, Django REST Framework, React, PostgreSQL, Docker i wdrożenie na VPS Mikrus z integracją z GitHub Actions.

---

# 24. Rekomendacja końcowa

Najlepszy praktyczny sposób realizacji tego projektu to zbudowanie najpierw rdzenia operacyjnego:
- logowanie,
- użytkownicy,
- role,
- projekty,
- dashboard,
- kanban,
- spotkania,
- głosowania.

Następnie należy rozszerzyć system o funkcje, które realnie zwiększają codzienną użyteczność:
- komentarze,
- ogłoszenia,
- baza wiedzy,
- milestone’y,
- raporty,
- kompetencje i onboarding.

Dzięki temu aplikacja nie będzie tylko „panelem”, ale stanie się rzeczywistym centrum działania koła naukowego.

