# Dotknij obrazu

"Touch the picture" — a team project for the BEST Hacks 2026 hackathon (Wrocław University of
Science and Technology, 10–11 Oct 2026), theme "Code For Culture", category Art.

A mobile app in which a blind person explores a picture by moving a finger across the screen:
the sound of the object under the finger plays, the phone vibrates on object edges, and a double
tap reads out the object's name and description.

## How it works

```
public domain picture
        │  pipeline/ (Python)
        ├─ Depth Anything V2 ──────────► depth map
        ├─ Claude (structured outputs) ► objects, names, audio description, sound
        ├─ SAM 2 / curator polygons ───► object masks ► object id map
        └─ depth jumps + mask outlines ► contour map (silhouettes to trace with a finger)
        ▼
apps/mobile/assets/artworks/<id>/   "sensory package": manifest.json, layers.json,
        │                           image.jpg, highlight-<n>.png
        ▼
app (Expo): finger ► pixel in the id map ► object sound
                     pixel in the contour map ► vibration, denser the closer to the line
                     pixel in the depth map ► volume (closer = louder)
```

The sound says **what** is under the finger, not **where** — the user knows the finger's
position from touch. That is why there is no sonar or panning, just one looping sound per object.

The package format is described by types in [`packages/shared/src/artwork-package.ts`](./packages/shared/src/artwork-package.ts).
The layers are raw bytes (one per pixel, about 512 px on the longer side) in base64, not PNG,
because React Native has no canvas from which pixels could be read.

## Stack

- **Mobile:** Expo SDK 57 (React Native), TypeScript, expo-router, expo-audio, expo-haptics,
  expo-speech, expo-screen-orientation — runs in Expo Go, with no custom native modules
- **Pipeline:** Python, Hugging Face transformers (Depth Anything V2 Small, SAM 2.1), Claude API
- **Monorepo:** pnpm workspaces — `apps/mobile`, `packages/shared`, with `pipeline/` alongside

## Running the app

Requirements: Node.js ≥ 22.12, pnpm 12, an Android phone with the Expo Go app
(on the same Wi-Fi network as the computer).

```bash
pnpm install
pnpm dev          # scan the QR code in Expo Go
```

Ready-made packages of the four artworks are in the repo, so the pipeline is not needed to run the app.
**Wired headphones** are required — Bluetooth delays the sound relative to the finger.

## Controls

| Gesture                   | Action                                            |
| ------------------------- | ------------------------------------------------- |
| moving one finger         | sound of the object under the finger; the object's boundary is marked by a cue and a vibration |
| tracing a contour         | pulsing vibration that gets denser in the middle of the line; contours of closer things are stronger |
| moving a finger inside an object | texture: smooth, soft, grainy or rough     |
| double tap                | name and description of the object                |
| two-finger tap            | description of the whole picture, or interrupting speech |

Entering an object is two rising tones and two vibration taps, leaving it for the background is two
falling tones and one tap. Object sounds crossfade smoothly, so only this cue tells exactly where
the boundary is.

When nobody is touching the screen, you hear the **soundscape**: all objects play at once, the closer
ones louder. Touching the screen mutes it and only the sound under the finger remains; the soundscape
returns a moment after the finger is lifted. The app does not speak names on its own — an object is
recognized by its sound and vibration, and its name and description are given only on a double tap.

Wide pictures rotate the screen to landscape so that objects are as large as possible. The screen
shows the picture, white contour lines, a circle under the finger, a yellow highlight of the touched
object and its caption — this is for an audience that cannot hear the headphones.

### Languages

The gallery has a Polish / English switch; the app starts in Polish on a phone set to Polish and
in English on any other. The switch changes the screens, the spoken instructions, the speech
engine's voice and the texts of the artworks. Each package carries its Polish texts and an
optional `en` copy of them, so an artwork without a translation still works, in Polish.

### Training

The "Trening" tile in the gallery is a board with three simple shapes (horse, bird, water).
Before putting on the blindfold, the tester has about 20 s with open eyes to get used to the
principle "the sound says what, not where". The "Test" tab measures whether a blindfolded person
finds the indicated object by sound alone (target: under 20 s); the panel below the board is
operated by a team member.

## Pipeline: adding an artwork

Requirements: Python 3.10–3.12 (on an Intel Mac PyTorch has no releases for newer versions).

```bash
cd pipeline
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                       # set ANTHROPIC_API_KEY (needed only for new artworks)

.venv/bin/python import_met.py 45434 wielka-fala   # optional: source from The Met API (CC0)
.venv/bin/python build.py wielka-fala              # one artwork
.venv/bin/python build.py --all                    # all of them
```

The input is `pipeline/artworks/<id>/source.json` (title, author, license, image URL).
`build.py` performs these steps:

1. downloads the image,
2. **description** — Claude (`claude-opus-5-5`, structured outputs) picks 3–6 large objects
   and returns for each a Polish name, a bounding box, descriptions following audio description
   guidelines, a texture and a sound from the list of files in `apps/mobile/assets/sounds`;
   the result goes into `objects.json`,
3. **depth** — Depth Anything V2 Small,
4. **masks and contours** — SAM 2.1 with the object's bounding box produces the object id map;
   the contour map is built from sudden depth jumps (silhouettes) and mask outlines, and each
   pixel remembers its distance from the line,
5. writes the package to `apps/mobile/assets/artworks/<id>/` and refreshes the artwork list
   in `apps/mobile/src/artworks/registry.ts`.

### Curator mode

`objects.json` is created once and stays in the repo, so a human can correct it: change the
description, sound or bounding box, or add a `polygons` field to an object (a list of polygons,
coordinates 0–1), which replaces the SAM mask. With `"refine": true` the polygon only says where
to look: SAM gets a grid of points inside it and returns the exact silhouettes of whatever is
there (e.g. each horse of a team), and whatever spills outside the polygon is discarded as
background. After each change it is enough to run `build.py` again and look at
`pipeline/work/<id>/preview.jpg`. `--redo describe` generates the description from scratch
and overwrites the corrections.

English texts live next to the Polish ones, in `en` fields of `source.json` and `objects.json`.
After editing only texts, `build.py --all --texts` rewrites the manifests in a second, without
running any model.

Current state: the descriptions and objects of the four artworks in the repo were prepared by
hand in this mode (areas such as the sky are easier to outline than to segment; horses, dogs,
hunters and boats are outlined roughly and SAM finds their silhouettes).
The Claude step is implemented but has not yet been run with a real API key.
SAM 3 with a text prompt is not used — it needs a newer PyTorch than is available on our hardware,
so the masks are computed by SAM 2.1 with a bounding box.

## Artworks and licenses

| Artwork                                  | Image source                                   | License           |
| ---------------------------------------- | ---------------------------------------------- | ----------------- |
| Józef Chełmoński, "Czwórka" (Four-in-hand), 1880 | National Museum in Warsaw / Wikimedia Commons | public domain |
| Johannes Vermeer, "The Milkmaid", c. 1660 | Rijksmuseum / Wikimedia Commons               | public domain     |
| Pieter Bruegel the Elder, "Hunters in the Snow", 1565 | Kunsthistorisches Museum / Wikimedia Commons | public domain |
| Katsushika Hokusai, "The Great Wave off Kanagawa", c. 1830–1832 | The Met Open Access | CC0               |

The exact URLs are in `pipeline/artworks/<id>/source.json` and in each package's `manifest.json`.

The object sounds are looped fragments of recordings from [BigSoundBank](https://bigsoundbank.com/licenses.html)
released under the CC0 license; the list of recordings with their authors is in
[`apps/mobile/assets/sounds/ATTRIBUTION.md`](./apps/mobile/assets/sounds/ATTRIBUTION.md).
The fragments are cut by `pipeline/sounds.py` according to `pipeline/sounds.json` (requires ffmpeg).
The only sound without a recording, the humming, we synthesize ourselves: `pnpm --filter @repo/mobile sounds`.

## Questions that may come up

**What about TalkBack and VoiceOver?** Screen readers capture touch (explore by touch), so while
a finger moves across the picture our screen would not receive any events. The gallery is a plain
list with labels for the screen reader. The exploration screen is a deliberately enabled
direct-touch mode: the user pauses the screen reader and the app takes over speaking (expo-speech).
On iOS there is the "allows direct interaction" accessibility trait, which passes touch through to
a given view without turning VoiceOver off — a natural next step in a native build.

**How does tracing contours work?** A phone cannot vibrate with a set strength, so we fake strength
with rhythm: at the edge of a contour there are sparse, short pulses, and in the middle of the line
they merge into a continuous buzz. Slipping off the line is felt in the finger immediately, so you
can trace the silhouette of a horse or a tree trunk. The contour of something close to the viewer
vibrates more strongly than the contour of the background. Inside an object you feel its texture:
one pulse per dozen or so points of finger movement, so a still finger feels nothing — just like
on a real surface.

**Why does depth control only the volume?** expo-audio has no panning or filters.
Stereo panning and a depth-dependent filter require `react-native-audio-api`, that is, a custom
native build instead of Expo Go.

**Why do all the loops play all the time?** Starting playback on touch adds an audible delay.
Every object has a player running at volume 0, and a touch only raises it (in about 140 ms), so
the sound keeps up with the finger. The previous object fades out more slowly, so at the boundary
the sounds crossfade instead of jumping.

**Who will pay for it?** Museums and galleries: public cultural institutions in Poland are bound
by the 2019 Act on ensuring accessibility. Tactile reliefs are expensive and are made for single
artworks, and audio guides give only a linear audio description. Here, preparing an artwork is one
pipeline run and a curator's correction.

## Useful commands

| Command                               | Description                       |
| ------------------------------------- | --------------------------------- |
| `pnpm dev`                            | Expo dev server                   |
| `pnpm lint`                           | lint                              |
| `pnpm typecheck`                      | type check                        |
| `pnpm --filter @repo/mobile sounds`   | synthesize the humming sound      |
| `pipeline/.venv/bin/python pipeline/sounds.py` | loops from CC0 recordings |
| `pipeline/.venv/bin/python pipeline/build.py --all` | rebuild artwork packages |

Conventions and architecture details: [AGENTS.md](./AGENTS.md).
