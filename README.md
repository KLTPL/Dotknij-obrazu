# Dotknij obrazu

Projekt drużyny na hackathon BEST Hacks 2026 (Politechnika Wrocławska, 10–11.10.2026),
temat „Code For Culture”, kategoria Sztuka.

Aplikacja mobilna, dzięki której osoba niewidoma poznaje obraz, wodząc palcem po ekranie:
pod palcem gra dźwięk obiektu, na krawędziach obiektów telefon wibruje, a przytrzymanie
palca odczytuje nazwę obiektu.

## Stack

- **Mobile:** Expo (React Native), TypeScript, expo-audio, expo-haptics, expo-speech
- **Monorepo:** pnpm workspaces — `apps/mobile`, `packages/shared`

## Uruchomienie lokalne

Wymagania: Node.js ≥ 22.12, pnpm 12, telefon z aplikacją Expo Go (ta sama sieć Wi-Fi co komputer).

```bash
pnpm install
pnpm dev          # zeskanuj kod QR w Expo Go
```

Do testu potrzebne są **słuchawki przewodowe** — Bluetooth opóźnia dźwięk względem palca.

## Przydatne komendy

| Komenda          | Opis                      |
| ---------------- | ------------------------- |
| `pnpm dev`       | serwer deweloperski Expo  |
| `pnpm lint`      | lint                      |
| `pnpm typecheck` | sprawdzenie typów         |

Konwencje i szczegóły architektury: [AGENTS.md](./AGENTS.md).
