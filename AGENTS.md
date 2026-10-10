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

| Warstwa  | Technologia                                                    |
| -------- | -------------------------------------------------------------- |
| Monorepo | pnpm workspaces (`nodeLinker: hoisted` — wymagane przez Metro) |
| Mobile   | Expo SDK 57 (React Native) + TypeScript + expo-router          |
| Audio    | expo-audio (pętle grają stale, zmienia się tylko głośność)     |
| Haptyka  | expo-haptics                                                   |
| Mowa     | expo-speech (systemowy TTS, offline)                           |
| Wspólne  | `@repo/shared` — typy formatu paczki dzieła (tylko typy)       |
| Pipeline | Python 3.10–3.12: transformers (Depth Anything V2, SAM 2.1), Claude API |

## Struktura

```
apps/mobile/
  assets/artworks/<id>/   paczki dzieł — WYNIK pipeline'u, nie edytować ręcznie
  assets/sounds/          pętle WAV — WYNIK pipeline/sounds.py (nagrania CC0) i scripts/generate-sounds.mjs
  src/app/                ekrany: index (galeria), artwork/[id] (eksploracja), training
  src/artworks/           odczyt paczki (dekodowanie warstw), registry.ts (generowany)
  src/exploration/        ExplorationBoard + hooki dźwięku, mowy i orientacji — wspólne
                          dla eksploracji dzieła i treningu
  src/readability-test/   plansza treningowa i pomiar czasu
packages/shared/          kontrakt paczki: src/artwork-package.ts
pipeline/
  artworks/<id>/          source.json (źródło i licencja), objects.json (obiekty i opisy)
  build.py                orkiestracja; kroki w describe.py, depth.py, segment.py, pack.py
  import_met.py           source.json z API The Met
  sounds.py, sounds.json  pętle dźwięków wycinane z nagrań CC0
  work/                   cache (gitignored): pobrane obrazy, głębia, podglądy masek
```

## Komendy (z roota)

```bash
pnpm install
pnpm dev              # Expo dev server — zeskanuj QR w Expo Go na telefonie
pnpm lint | typecheck
pipeline/.venv/bin/python pipeline/sounds.py           # po zmianie sounds.json
pipeline/.venv/bin/python pipeline/build.py --all      # po zmianie objects.json lub pipeline'u
```

Sprawdzenie bundla bez telefonu: `npx expo export --platform android --output-dir <katalog tymczasowy>`
w `apps/mobile`.

Dodawanie zależności do aplikacji: `pnpm --filter @repo/mobile exec expo install <pkg>`
(dobiera wersję zgodną z SDK). Jeśli nowa paczka ma skrypt instalacyjny, pnpm go
zablokuje — dopisz ją do `allowBuilds` w `pnpm-workspace.yaml`.

## Paczka dzieła

- Kontrakt: `packages/shared/src/artwork-package.ts`. Zmiana formatu = zmiana typów,
  `pipeline/pack.py` i `apps/mobile/src/artworks/artwork.ts` w jednym commicie.
- Warstwy (id obiektu, głębia, kontury) to surowe bajty w base64, nie PNG. Warstwa konturów
  to bliskość linii (255 na konturze, 0 kilka pikseli dalej); steruje wibracją
  w `src/exploration/use-contour-haptics.ts`.
- Nowy dźwięk: wpis w `pipeline/sounds.json` (nagranie CC0 z bigsoundbank.com, początek
  i długość fragmentu) → `pipeline/sounds.py`, potem wpis w `apps/mobile/src/audio/sounds.ts`.
  Pętla nie może mieć ciszy dłuższej niż ok. 0,5 s, bo palec na obiekcie nie może trafić
  w pustkę. Tylko CC0 z atrybucją (`ATTRIBUTION.md` generuje się sam) albo własna synteza
  w `apps/mobile/scripts/generate-sounds.mjs`.
- Nowe dzieło: `source.json` → `build.py` → poprawki w `objects.json` (pole `polygons`
  zastępuje maskę z SAM) → `build.py` → podgląd w `pipeline/work/<id>/preview.jpg`.
  Tylko domena publiczna / CC0, bez scen religijnych i politycznych.
- Obiekt musi być na ekranie telefonu co najmniej wielkości opuszka palca.

## Konwencje

- TypeScript strict, bez `any` tam, gdzie da się tego uniknąć.
- Kod, nazwy i commity po angielsku; teksty w UI po polsku.
- Po zmianach uruchom `pnpm typecheck` i `pnpm lint`.
- Małe commity, komunikaty w stylu `feat: ...`, `fix: ...`.
- Aplikacja ma działać w Expo Go (nikt w zespole nie musi mieć Android SDK), więc bez modułów
  natywnych spoza Expo Go.
- Gesty, haptykę i opóźnienie dźwięku da się sprawdzić tylko na telefonie — po zmianach w
  `src/exploration/` napisz, co trzeba przetestować ręcznie.
- Pliki poniżej ok. 300 linii; komentarze tłumaczą „dlaczego”, bo jury pyta o kod.
- Python w `pipeline/`: komunikaty dla użytkownika po polsku, kod i komentarze po angielsku.
