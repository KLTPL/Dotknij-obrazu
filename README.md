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

## Test czytelności

Ekran startowy sprawdza, czy osoba z zawiązanymi oczami znajdzie obiekt po samym dźwięku.
Osoba testowana dotyka tylko planszy, panel pod nią obsługuje ktoś z zespołu.

1. **Trening** (~20 s, oczy otwarte): wodzenie palcem po kolorowych prostokątach.
   Pod palcem gra dźwięk obiektu (koń: tętent, ptak: ćwierkanie, woda: szum),
   na krawędzi telefon wibruje, przytrzymanie palca odczytuje nazwę.
2. **Test**: zawiązujemy oczy, „Nowa próba” losuje układ i cel, telefon mówi, czego szukać.
   Czas liczy się od pierwszego dotknięcia, podwójne stuknięcie potwierdza wybór.
3. Kryterium: obiekt znaleziony w mniej niż 20 s. Przełącznik „Nazwy po przytrzymaniu”
   pozwala sprawdzić, czy wystarczą same dźwięki.

Dźwięki są syntezowane przez `pnpm --filter @repo/mobile sounds`.

## Przydatne komendy

| Komenda          | Opis                      |
| ---------------- | ------------------------- |
| `pnpm dev`       | serwer deweloperski Expo  |
| `pnpm lint`      | lint                      |
| `pnpm typecheck` | sprawdzenie typów         |

Konwencje i szczegóły architektury: [AGENTS.md](./AGENTS.md).
