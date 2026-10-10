# AGENTS.md

Instrukcje dla agentów AI (Claude Code, Codex, Cursor itd.) pracujących w tym repo.
`CLAUDE.md` tylko importuje ten plik — edytuj tutaj.

## Kontekst

Projekt na hackathon **BEST Hacks 2026** (10–11.10.2026, 24 h, drużyna 2–4 osoby).
Temat i szczegółowe wymagania: _do uzupełnienia po ogłoszeniu zadania_.
Aplikacja ma działać **lokalnie** — nie ma deploymentu, nie dodawaj konfiguracji CI/CD ani hostingu.

### Co wynika z regulaminu (`Regulamin.pdf`)

- Cały projekt musi powstać w trakcie hackathonu i być pracą własną — nie kopiuj cudzych
  rozwiązań; biblioteki open source są OK.
- Zmiany w projekcie po upływie czasu = dyskwalifikacja. Nie commituj i nie pushuj po deadlinie.
- Rozwiązanie trafia do publicznego repozytorium — **żadnych sekretów w repo** (`.env` jest w `.gitignore`).
- Zakaz rozwiązań naruszających bezpieczeństwo / wykorzystujących podatności oraz treści
  obraźliwych, politycznych, religijnych, wulgarnych (dotyczy też seedów, tekstów w UI i nazw).
- Kryteria oceny (to jest priorytet przy każdej decyzji):
  1. **Stopień realizacji** (0–10) — działający kod, nie makieta; zgodność z tematem.
  2. **Aspekt techniczny** (0–10) — sensowna, skalowalna architektura; zespół musi umieć
     uzasadnić decyzje na Q&A, więc kod ma być prosty i zrozumiały.
  3. **Design i funkcjonalność** (0–10) — intuicyjny UX/UI, funkcje realnie rozwiązują problem.
  4. **Kreatywność i innowacyjność** (0–10).
  5. Etap 2: **przydatność / potencjał biznesowy** (0–10) i **prezentacja** (0–5, 5 minut).

Wniosek: najpierw działający pionowy wycinek (UI → API → DB), potem dopieszczanie. Bez
nadmiarowych abstrakcji, bez funkcji „na zapas”.

## Stack

| Warstwa  | Technologia                                                        |
| -------- | ------------------------------------------------------------------ |
| Monorepo | pnpm workspaces (bez Turborepo/Nx — `pnpm -r --parallel` wystarcza) |
| Frontend | Vite 8 + React 19 + TypeScript                                     |
| UI       | Tailwind CSS 4, shadcn/ui (styl `radix-nova`), Lucide React        |
| Backend  | NestJS 11 (CommonJS)                                               |
| Baza     | PostgreSQL 17 (docker compose), Prisma ORM **7.9.x**               |
| Wspólne  | `@repo/shared` — typy i schematy zod                               |

**Prisma jest przypięta do 7.9.1 — nie podnoś do 8.x (breaking changes).** `prisma`,
`@prisma/client` i `@prisma/adapter-pg` muszą mieć tę samą wersję.

## Struktura

```
apps/
  api/                NestJS
    prisma/           schema.prisma + migracje
    prisma.config.ts  konfiguracja Prisma CLI (URL bazy z .env)
    src/
      prisma/         PrismaModule (globalny) + PrismaService
      health/         przykładowy moduł — wzorzec dla kolejnych
      generated/      wygenerowany klient Prisma (gitignored, nie edytować)
  web/                Vite + React
    src/components/ui komponenty shadcn (generowane przez CLI)
    src/lib/utils.ts  cn()
packages/
  shared/             wspólne typy / schematy zod
docker-compose.yml    Postgres na porcie 5433
```

## Komendy (z roota)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # tylko za pierwszym razem
pnpm db:up            # Postgres w dockerze (localhost:5433)
pnpm db:migrate       # prisma migrate dev (po zmianie schema.prisma: --name <opis>)
pnpm dev              # shared (watch) + api :3000 + web :5173
pnpm build | lint | typecheck | test
pnpm --filter @repo/api test:e2e   # wymaga działającej bazy
pnpm db:studio | db:generate | db:down | db:reset
```

Dodawanie zależności: `pnpm --filter @repo/web add <pkg>` (analogicznie `@repo/api`, `@repo/shared`).
Jeśli nowa paczka ma skrypt instalacyjny, pnpm go zablokuje — dopisz ją do `allowBuilds`
w `pnpm-workspace.yaml`.

## Konwencje

### Ogólne
- TypeScript strict, bez `any` tam, gdzie da się tego uniknąć.
- Kod, nazwy i commity po angielsku; teksty w UI po polsku (chyba że zadanie wymaga inaczej).
- Po zmianach uruchom `pnpm typecheck` i `pnpm lint`.
- Małe commity, komunikaty w stylu `feat: ...`, `fix: ...`.

### `packages/shared`
- Kontrakt API (DTO request/response) definiuj tutaj jako schemat zod + `z.infer` typ
  i używaj po obu stronach.
- Web importuje **źródła TS** bezpośrednio, API importuje **zbudowany CJS z `dist/`**
  (`pnpm dev` buduje i obserwuje paczkę automatycznie; samo API bez `pnpm dev` wymaga
  wcześniej `pnpm --filter @repo/shared build`).
- Dlatego: bez `enum` i `namespace` (używaj `as const` / `z.enum`), importy typów przez
  `import type`, żadnych zależności od Node ani DOM.

### `apps/api`
- Jeden moduł Nest na domenę: `src/<feature>/<feature>.{module,controller,service}.ts`.
- Dostęp do bazy tylko przez `PrismaService` (wstrzykiwany, moduł jest globalny).
- Klient importuj z `../generated/prisma/client`, nie z `@prisma/client`.
- Wszystkie endpointy są pod prefiksem `/api` (ustawiony w `main.ts`).
- Walidacja wejścia schematami zod z `@repo/shared`.
- Po każdej zmianie `schema.prisma`: `pnpm db:migrate --name <opis>` i commit migracji.

### `apps/web`
- Do API odwołuj się relatywnie (`fetch('/api/...')`) — Vite proxuje `/api` na `:3000`,
  więc CORS nie jest potrzebny.
- Odpowiedzi API parsuj schematami z `@repo/shared`.
- Komponenty UI: najpierw shadcn —
  `pnpm --filter @repo/web exec shadcn add <komponent>`; nie pisz ręcznie tego, co jest w rejestrze.
- Alias `@/` → `apps/web/src`. Ikony tylko z `lucide-react`.
- Stylowanie klasami Tailwind i tokenami motywu z `src/index.css` (`bg-background`,
  `text-muted-foreground`…), bez hardkodowanych kolorów.
- Next.js rozważamy tylko, jeśli zadanie będzie wymagało SSR — domyślnie zostaje Vite.
