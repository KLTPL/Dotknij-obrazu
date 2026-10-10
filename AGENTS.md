# AGENTS.md

Instructions for AI agents (Claude Code, Codex, Cursor, etc.) working in this repo.
`CLAUDE.md` only imports this file — edit here.

## Context

A project for the **BEST Hacks 2026** hackathon (10–11 Oct 2026, 24 h, team of 2–4), theme
"Code For Culture", category **Art**.

**Dotknij obrazu** ("Touch the picture") is a mobile app in which a blind person explores a
picture by moving a finger across the screen. The sound of the object under the finger plays
(horse → hoofbeats), the phone vibrates on object edges, and a double tap reads out the object's
name and description. The sound says **what** is under the finger, not **where** — the user
knows the finger's position from touch.

The app runs **locally** — there is no deployment, so do not add CI/CD or hosting configuration.

### What follows from the rules (`Regulamin.pdf`)

- The whole project must be created during the hackathon and be our own work — do not copy
  other people's solutions; open source libraries are fine.
- Changes to the project after the deadline = disqualification. Do not commit or push after the deadline.
- The solution goes into a public repository — **no secrets in the repo** (`.env` is in `.gitignore`).
- No solutions that compromise security / exploit vulnerabilities, and no offensive, political,
  religious or vulgar content (this includes images, sounds, UI texts and names).
  When choosing artworks, avoid religious scenes.
- Copyright infringement = disqualification: only public domain artworks, CC0 or public domain
  sounds, or ones we generated ourselves.
- Judging criteria (this is the priority for every decision):
  1. **Degree of completion** (0–10) — working code, not a mockup; fit with the theme.
  2. **Technical aspect** (0–10) — sensible, scalable architecture; the team must be able to
     justify decisions in the Q&A, so the code must be simple and understandable.
  3. **Design and functionality** (0–10) — intuitive UX/UI, features that really solve the problem.
  4. **Creativity and innovation** (0–10).
  5. Stage 2: **usefulness / business potential** (0–10) and **presentation** (0–5, 5 minutes).

Takeaway: a working core first (finger → object → sound + vibration), polish later.
No needless abstractions, no features "just in case".

## Stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Monorepo | pnpm workspaces (`nodeLinker: hoisted` — required by Metro)    |
| Mobile   | Expo SDK 57 (React Native) + TypeScript + expo-router          |
| Audio    | expo-audio (loops play constantly, only the volume changes)    |
| Haptics  | expo-haptics                                                   |
| Speech   | expo-speech (system TTS, offline)                              |
| Shared   | `@repo/shared` — artwork package format types (types only)     |
| Pipeline | Python 3.10–3.12: transformers (Depth Anything V2, SAM 2.1), Claude API |

## Structure

```
apps/mobile/
  assets/artworks/<id>/   artwork packages — OUTPUT of the pipeline, do not edit by hand
  assets/sounds/          WAV loops — OUTPUT of pipeline/sounds.py (CC0 and public domain
                          recordings) and scripts/generate-sounds.mjs
  assets/cues/            object boundary cues — OUTPUT of scripts/generate-sounds.mjs
  src/app/                screens: index (gallery), artwork/[id] (exploration), training
  src/artworks/           package reader (layer decoding), registry.ts (generated)
  src/exploration/        ExplorationBoard + sound, speech and orientation hooks — shared
                          by artwork exploration and training
  src/readability-test/   training board and time measurement
packages/shared/          package contract: src/artwork-package.ts
pipeline/
  artworks/<id>/          source.json (source and license), objects.json (objects and descriptions)
  build.py                orchestration; steps in describe.py, depth.py, segment.py, pack.py
  import_met.py           source.json from The Met API
  sounds.py, sounds.json  sound loops cut from CC0 and public domain recordings
  work/                   cache (gitignored): downloaded images, depth, mask previews
```

## Commands (from the root)

```bash
pnpm install
pnpm dev              # Expo dev server — scan the QR code in Expo Go on a phone
pnpm lint | typecheck
pipeline/.venv/bin/python pipeline/sounds.py           # after changing sounds.json
pipeline/.venv/bin/python pipeline/build.py --all      # after changing objects.json or the pipeline
```

Checking the bundle without a phone: `npx expo export --platform android --output-dir <temp dir>`
in `apps/mobile`.

Adding dependencies to the app: `pnpm --filter @repo/mobile exec expo install <pkg>`
(picks the version compatible with the SDK). If a new package has an install script, pnpm
will block it — add the package to `allowBuilds` in `pnpm-workspace.yaml`.

## Artwork package

- Contract: `packages/shared/src/artwork-package.ts`. Changing the format means changing the
  types, `pipeline/pack.py` and `apps/mobile/src/artworks/artwork.ts` in a single commit.
- Layers (object id, depth, contours) are raw bytes in base64, not PNG. The contour layer is
  line proximity (0 a few pixels away from the contour, higher on the contour, the more so the
  closer to the viewer); it drives the vibration in `src/exploration/use-touch-haptics.ts`,
  which also holds the object textures.
- New sound: an entry in `pipeline/sounds.json` (a CC0 recording from bigsoundbank.com, or a
  public domain file with `url` and `license` fields, e.g. from Wikimedia Commons; start and
  length of the fragment) → `pipeline/sounds.py`, then an entry in `apps/mobile/src/audio/sounds.ts`.
  A loop must not contain silence longer than about 0.5 s, because a finger on an object must
  not land in a void. Only CC0 or public domain with attribution (`ATTRIBUTION.md` is generated
  automatically), or our own synthesis in `apps/mobile/scripts/generate-sounds.mjs`.
- New artwork: `source.json` → `build.py` → fixes in `objects.json` (the `polygons` field
  replaces the SAM mask, and with `"refine": true` SAM looks for exact silhouettes inside the
  polygon) → `build.py` → preview in `pipeline/work/<id>/preview.jpg`.
  Public domain / CC0 only, no religious or political scenes.
- An object must be at least the size of a fingertip on the phone screen.

## Conventions

- TypeScript strict, no `any` where it can be avoided.
- Code, names and commits in English; UI texts in Polish.
- After changes run `pnpm typecheck` and `pnpm lint`.
- Small commits, messages in the style `feat: ...`, `fix: ...`.
- The app must work in Expo Go (nobody on the team needs the Android SDK), so no native modules
  outside Expo Go.
- Gestures, haptics and audio latency can only be checked on a phone — after changes in
  `src/exploration/`, write down what has to be tested manually.
- Files under about 300 lines; comments explain "why", because the jury asks about the code.
- Python in `pipeline/`: user-facing messages in Polish, code and comments in English.
