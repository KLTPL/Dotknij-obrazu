# BEST Hacks 2026

Projekt drużyny na hackathon BEST Hacks 2026 (Politechnika Wrocławska, 10–11.10.2026).

> Opis projektu zostanie uzupełniony po ogłoszeniu zadania.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide
- **Backend:** NestJS, Prisma ORM 7.9, PostgreSQL
- **Monorepo:** pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`

## Uruchomienie lokalne

Wymagania: Node.js ≥ 22.12, pnpm 12, Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # PostgreSQL w dockerze na localhost:5433
pnpm db:migrate   # migracje bazy
pnpm dev          # web: http://localhost:5173, api: http://localhost:3000/api
```

Po starcie strona główna pokazuje status API i bazy (`GET /api/health`).

## Przydatne komendy

| Komenda             | Opis                                   |
| ------------------- | -------------------------------------- |
| `pnpm dev`          | wszystko w trybie watch                |
| `pnpm build`        | build wszystkich paczek                |
| `pnpm lint`         | lint (oxlint w web, eslint w api)      |
| `pnpm typecheck`    | sprawdzenie typów                      |
| `pnpm test`         | testy jednostkowe                      |
| `pnpm db:studio`    | Prisma Studio                          |
| `pnpm db:reset`     | wyczyszczenie bazy i ponowne migracje  |
| `pnpm db:down`      | zatrzymanie bazy                       |

Konwencje i szczegóły architektury: [AGENTS.md](./AGENTS.md).
