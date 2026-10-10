# Dotknij obrazu

Projekt drużyny na hackathon BEST Hacks 2026 (Politechnika Wrocławska, 10–11.10.2026),
temat „Code For Culture”, kategoria Sztuka.

Aplikacja mobilna, dzięki której osoba niewidoma poznaje obraz, wodząc palcem po ekranie:
pod palcem gra dźwięk obiektu, na krawędziach obiektów telefon wibruje, a przytrzymanie
palca odczytuje nazwę obiektu.

## Jak to działa

```
obraz z domeny publicznej
        │  pipeline/ (Python)
        ├─ Depth Anything V2 ──────────► mapa głębi
        ├─ Claude (structured outputs) ► obiekty, nazwy, audiodeskrypcja, dźwięk
        ├─ SAM 2 / poligony kuratora ──► maski obiektów ► mapa id obiektów
        └─ skoki głębi + obrysy masek ─► mapa konturów (sylwetki do wodzenia palcem)
        ▼
apps/mobile/assets/artworks/<id>/   „paczka sensoryczna”: manifest.json, layers.json,
        │                           image.jpg, highlight-<n>.png
        ▼
aplikacja (Expo): palec ► piksel w mapie id ► dźwięk obiektu
                          piksel w mapie konturów ► wibracja, tym gęstsza, im bliżej linii
                          piksel w mapie głębi ► głośność (bliżej = głośniej)
```

Dźwięk mówi **co** jest pod palcem, a nie **gdzie** — położenie palca użytkownik zna
z dotyku. Dlatego nie ma tu sonaru ani panoramy, tylko jeden zapętlony dźwięk na obiekt.

Format paczki jest opisany typami w [`packages/shared/src/artwork-package.ts`](./packages/shared/src/artwork-package.ts).
Warstwy to surowe bajty (jeden na piksel, ok. 512 px na dłuższym boku) w base64, a nie PNG,
bo React Native nie ma canvasu, z którego dałoby się odczytać piksele.

## Stack

- **Mobile:** Expo SDK 57 (React Native), TypeScript, expo-router, expo-audio, expo-haptics,
  expo-speech, expo-screen-orientation — działa w Expo Go, bez własnych modułów natywnych
- **Pipeline:** Python, Hugging Face transformers (Depth Anything V2 Small, SAM 2.1), Claude API
- **Monorepo:** pnpm workspaces — `apps/mobile`, `packages/shared`, obok `pipeline/`

## Uruchomienie aplikacji

Wymagania: Node.js ≥ 22.12, pnpm 12, telefon z Androidem i aplikacją Expo Go
(ta sama sieć Wi-Fi co komputer).

```bash
pnpm install
pnpm dev          # zeskanuj kod QR w Expo Go
```

Gotowe paczki czterech dzieł są w repo, więc pipeline nie jest potrzebny do uruchomienia aplikacji.
Potrzebne są **słuchawki przewodowe** — Bluetooth opóźnia dźwięk względem palca.

## Obsługa

| Gest                      | Działanie                                         |
| ------------------------- | ------------------------------------------------- |
| wodzenie jednym palcem    | dźwięk obiektu pod palcem, tyknięcie przy zmianie obiektu |
| jazda palcem po konturze  | pulsująca wibracja, która gęstnieje na środku linii |
| przytrzymanie palca       | nazwa obiektu                                     |
| podwójne stuknięcie       | dłuższy opis obiektu                              |
| stuknięcie dwoma palcami  | opis całego obrazu albo przerwanie mowy           |

Szerokie obrazy obracają ekran do poziomu, żeby obiekty były jak największe. Na ekranie widać
obraz, białe linie konturów, kółko pod palcem, żółte podświetlenie dotykanego obiektu i jego podpis — to dla widowni,
która nie słyszy słuchawek.

### Trening

Kafelek „Trening” w galerii to plansza z trzema prostymi kształtami (koń, ptak, woda).
Przed założeniem opaski testujący ma ok. 20 s z otwartymi oczami na oswojenie się z zasadą
„dźwięk mówi co, nie gdzie”. Zakładka „Test” mierzy, czy osoba z zawiązanymi oczami znajdzie
wskazany obiekt po samym dźwięku (cel: mniej niż 20 s); panel pod planszą obsługuje ktoś z zespołu.

## Pipeline: dodawanie dzieła

Wymagania: Python 3.10–3.12 (na Macu z Intelem PyTorch nie ma wydań dla nowszych wersji).

```bash
cd pipeline
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env                       # wpisz ANTHROPIC_API_KEY (potrzebny tylko do nowych dzieł)

.venv/bin/python import_met.py 45434 wielka-fala   # opcjonalnie: źródło z API The Met (CC0)
.venv/bin/python build.py wielka-fala              # jedno dzieło
.venv/bin/python build.py --all                    # wszystkie
```

Wejście to `pipeline/artworks/<id>/source.json` (tytuł, autor, licencja, adres obrazu).
`build.py` wykonuje kroki:

1. pobiera obraz,
2. **opis** — Claude (`claude-opus-5-5`, structured outputs) wybiera 3–6 dużych obiektów
   i zwraca dla każdego polską nazwę, ramkę, opisy zgodne z zasadami audiodeskrypcji i dźwięk
   z listy plików w `apps/mobile/assets/sounds`; wynik trafia do `objects.json`,
3. **głębia** — Depth Anything V2 Small,
4. **maski i kontury** — SAM 2.1 z ramką obiektu daje mapę id obiektów; mapa konturów powstaje
   z nagłych skoków głębi (sylwetki) i obrysów masek, a każdy piksel pamięta odległość od linii,
5. zapisuje paczkę do `apps/mobile/assets/artworks/<id>/` i odświeża listę dzieł
   w `apps/mobile/src/artworks/registry.ts`.

### Tryb kuratora

`objects.json` powstaje raz i zostaje w repo, więc człowiek może go poprawić: zmienić opis,
dźwięk, ramkę albo dodać do obiektu pole `polygons` (lista wielokątów, współrzędne 0–1),
które zastępuje maskę z SAM. Po każdej zmianie wystarczy ponownie uruchomić `build.py`
i obejrzeć `pipeline/work/<id>/preview.jpg`. `--redo describe` generuje opis od nowa
i nadpisuje poprawki.

Stan na teraz: opisy i obiekty czterech dzieł w repo zostały przygotowane ręcznie w tym trybie
(obszary takie jak niebo czy grupa koni łatwiej obrysować niż wysegmentować automatycznie).
Krok z Claude jest zaimplementowany, ale nie był jeszcze uruchomiony z prawdziwym kluczem API.
SAM 3 z promptem tekstowym nie jest używany — wymaga nowszego PyTorcha niż dostępny na naszym sprzęcie,
dlatego maski liczy SAM 2.1 z ramką.

## Dzieła i licencje

| Dzieło                                   | Źródło obrazu                                  | Licencja          |
| ---------------------------------------- | ---------------------------------------------- | ----------------- |
| Józef Chełmoński, „Czwórka”, 1880        | Muzeum Narodowe w Warszawie / Wikimedia Commons | domena publiczna  |
| Johannes Vermeer, „Mleczarka”, ok. 1660  | Rijksmuseum / Wikimedia Commons                | domena publiczna  |
| Pieter Bruegel st., „Myśliwi na śniegu”, 1565 | Kunsthistorisches Museum / Wikimedia Commons | domena publiczna  |
| Katsushika Hokusai, „Wielka fala w Kanagawie”, ok. 1830–1832 | The Met Open Access         | CC0               |

Dokładne adresy są w `pipeline/artworks/<id>/source.json` i w `manifest.json` każdej paczki.

Dźwięki obiektów to zapętlone fragmenty nagrań z [BigSoundBank](https://bigsoundbank.com/licenses.html)
udostępnionych na licencji CC0; listę nagrań z autorami zawiera
[`apps/mobile/assets/sounds/ATTRIBUTION.md`](./apps/mobile/assets/sounds/ATTRIBUTION.md).
Fragmenty wycina `pipeline/sounds.py` według `pipeline/sounds.json` (wymaga ffmpeg).
Jedyny dźwięk bez nagrania, nucenie, syntezujemy sami: `pnpm --filter @repo/mobile sounds`.

## Pytania, które mogą paść

**Co z TalkBack i VoiceOver?** Czytniki ekranu przechwytują dotyk (eksploracja przez dotyk),
więc w trakcie wodzenia palcem po obrazie nasz ekran nie dostałby zdarzeń. Galeria jest zwykłą
listą z etykietami dla czytnika. Ekran eksploracji to świadomie włączany tryb bezpośredniego
dotyku: użytkownik wstrzymuje czytnik, a mówienie przejmuje aplikacja (expo-speech). Na iOS
istnieje do tego cecha dostępności „allows direct interaction”, która przepuszcza dotyk do
wskazanego widoku bez wyłączania VoiceOver — to naturalny następny krok w natywnym buildzie.

**Jak działa wodzenie po konturach?** Telefon nie potrafi wibrować z zadaną siłą, więc siłę
udajemy rytmem: na skraju konturu są rzadkie, krótkie impulsy, a na środku linii zlewają się
w ciągłe brzęczenie. Zjechanie z linii od razu słychać w palcu, więc da się obrysować sylwetkę
konia albo pień drzewa.

**Dlaczego głębia steruje tylko głośnością?** expo-audio nie ma panoramy ani filtrów.
Panorama stereo i filtr zależny od głębi wymagają `react-native-audio-api`, czyli własnego
builda natywnego zamiast Expo Go.

**Dlaczego wszystkie pętle grają cały czas?** Start odtwarzania po dotknięciu dodaje słyszalne
opóźnienie. Każdy obiekt ma odtwarzacz grający z głośnością 0, a dotknięcie tylko go podgłaśnia
(w ok. 140 ms), więc dźwięk nadąża za palcem. Poprzedni obiekt wycisza się wolniej, więc na granicy
dźwięki przenikają się zamiast przeskakiwać.

**Kto za to zapłaci?** Muzea i galerie: publiczne instytucje kultury obowiązuje ustawa
o zapewnianiu dostępności z 2019 r. Reliefy dotykowe są drogie i powstają dla pojedynczych dzieł,
a audioprzewodniki dają tylko liniową audiodeskrypcję. Tu przygotowanie dzieła to jedno
uruchomienie pipeline'u i korekta kuratora.

## Przydatne komendy

| Komenda                               | Opis                              |
| ------------------------------------- | --------------------------------- |
| `pnpm dev`                            | serwer deweloperski Expo          |
| `pnpm lint`                           | lint                              |
| `pnpm typecheck`                      | sprawdzenie typów                 |
| `pnpm --filter @repo/mobile sounds`   | synteza dźwięku nucenia           |
| `pipeline/.venv/bin/python pipeline/sounds.py` | pętle z nagrań CC0       |
| `pipeline/.venv/bin/python pipeline/build.py --all` | przebudowa paczek dzieł |

Konwencje i szczegóły architektury: [AGENTS.md](./AGENTS.md).
