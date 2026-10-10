# AGENTS.md

Instrukcje dla agentów AI (Claude Code, Codex, Cursor itd.) pracujących w tym repo.
`CLAUDE.md` tylko importuje ten plik — edytuj tutaj.

## Kontekst

Projekt na hackathon **BEST Hacks 2026** (10–11.10.2026, 24 h, drużyna 2–4 osoby),
temat „Code For Culture”, kategoria **Sztuka**.

**Dotknij obrazu** — aplikacja mobilna, w której osoba niewidoma poznaje obraz, wodząc
palcem po ekranie. Pod palcem gra dźwięk obiektu (koń → tętent), na krawędziach obiektów
telefon wibruje, przytrzymanie palca odczytuje nazwę obiektu. Dźwięk mówi **co** jest
pod palcem, a nie **gdzie** — położenie palca użytkownik zna z dotyku.

Aplikacja ma działać **lokalnie** — nie ma deploymentu, nie dodawaj konfiguracji CI/CD ani hostingu.

### Co wynika z regulaminu (`Regulamin.pdf`)

- Cały projekt musi powstać w trakcie hackathonu i być pracą własną — nie kopiuj cudzych
  rozwiązań; biblioteki open source są OK.
- Zmiany w projekcie po upływie czasu = dyskwalifikacja. Nie commituj i nie pushuj po deadlinie.
- Rozwiązanie trafia do publicznego repozytorium — **żadnych sekretów w repo** (`.env` jest w `.gitignore`).
- Zakaz rozwiązań naruszających bezpieczeństwo / wykorzystujących podatności oraz treści
  obraźliwych, politycznych, religijnych, wulgarnych (dotyczy też obrazów, dźwięków, tekstów w UI i nazw).
  Dobierając dzieła, omijaj sceny religijne.
- Naruszenie praw autorskich = dyskwalifikacja: tylko dzieła z domeny publicznej, dźwięki
  CC0 albo wygenerowane przez nas.
- Kryteria oceny (to jest priorytet przy każdej decyzji):
  1. **Stopień realizacji** (0–10) — działający kod, nie makieta; zgodność z tematem.
  2. **Aspekt techniczny** (0–10) — sensowna, skalowalna architektura; zespół musi umieć
     uzasadnić decyzje na Q&A, więc kod ma być prosty i zrozumiały.
  3. **Design i funkcjonalność** (0–10) — intuicyjny UX/UI, funkcje realnie rozwiązują problem.
  4. **Kreatywność i innowacyjność** (0–10).
  5. Etap 2: **przydatność / potencjał biznesowy** (0–10) i **prezentacja** (0–5, 5 minut).

Wniosek: najpierw działający rdzeń (palec → obiekt → dźwięk + wibracja), potem dopieszczanie.
Bez nadmiarowych abstrakcji, bez funkcji „na zapas”.

## Stack

| Warstwa  | Technologia                                                   |
| -------- | ------------------------------------------------------------- |
| Monorepo | pnpm workspaces (`nodeLinker: hoisted` — wymagane przez Metro) |
| Mobile   | Expo (React Native) + TypeScript + expo-router                |
| Audio    | expo-audio (na razie; docelowo react-native-audio-api)        |
| Haptyka  | expo-haptics                                                  |
| Mowa     | expo-speech (systemowy TTS, offline)                          |
| Wspólne  | `@repo/shared` — kontrakty (np. format paczki dzieła)         |

Planowane: pipeline w Pythonie przygotowujący „paczki sensoryczne” dzieł
(mapa głębi, maski obiektów, opisy) — jeszcze go nie ma.

## Struktura

```
apps/
  mobile/             aplikacja Expo
packages/
  shared/             wspólne typy
```

## Komendy (z roota)

```bash
pnpm install
pnpm dev              # Expo dev server — zeskanuj QR w Expo Go na telefonie
pnpm lint | typecheck
```

Dodawanie zależności do aplikacji: `pnpm --filter @repo/mobile exec expo install <pkg>`
(dobiera wersję zgodną z SDK). Jeśli nowa paczka ma skrypt instalacyjny, pnpm go
zablokuje — dopisz ją do `allowBuilds` w `pnpm-workspace.yaml`.

## Konwencje

- TypeScript strict, bez `any` tam, gdzie da się tego uniknąć.
- Kod, nazwy i commity po angielsku; teksty w UI po polsku.
- Po zmianach uruchom `pnpm typecheck` i `pnpm lint`.
- Małe commity, komunikaty w stylu `feat: ...`, `fix: ...`.
- Dopóki nie potrzebujemy natywnych modułów spoza Expo Go, aplikacja ma działać w Expo Go
  (nikt w zespole nie musi mieć Android SDK).
