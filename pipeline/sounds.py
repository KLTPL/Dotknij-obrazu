"""Cuts seamless loops out of CC0 recordings for the mobile app.

    python sounds.py            # every sound listed in sounds.json
    python sounds.py horse dogs # only the named ones

Each entry of sounds.json names a recording and the fragment to loop. Recordings come from
bigsoundbank.com (all released under CC0); an entry with "url" and "license" points straight at
a public domain file elsewhere, e.g. on Wikimedia Commons. Requires ffmpeg. Also writes
ATTRIBUTION.md next to the sounds.
"""

import json
import re
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path

import numpy as np

from build import PIPELINE_DIR, SOUNDS_DIR, USER_AGENT, WORK_DIR

SAMPLE_RATE = 22050
CROSSFADE_SECONDS = 0.25
TARGET_RMS = 0.18
PEAK_LIMIT = 0.9


def audio_url(entry: dict) -> str:
    if "url" in entry:
        return entry["url"]
    # Page ".../horse-gallop-s0611.html" has its audio at ".../UPLOAD/mp3/0611.mp3"
    number = re.search(r"-s(\d+)\.html$", entry["page"]).group(1)
    return f"https://bigsoundbank.com/UPLOAD/mp3/{number}.mp3"


def download(entry: dict) -> Path:
    url = audio_url(entry)
    path = WORK_DIR / "sounds" / Path(url).name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request) as response:
            path.write_bytes(response.read())
    return path


def decode(path: Path) -> np.ndarray:
    """Any audio file to mono float samples at SAMPLE_RATE."""
    command = ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(command, capture_output=True, check=True).stdout, dtype=np.float32)


def seamless_loop(samples: np.ndarray, start: float, duration: float) -> np.ndarray:
    """Takes the fragment and crossfades the audio right after it into its beginning."""
    first = round(start * SAMPLE_RATE)
    length = round(duration * SAMPLE_RATE)
    fade = round(CROSSFADE_SECONDS * SAMPLE_RATE)
    fragment = samples[first : first + length + fade].astype(np.float64)
    if len(fragment) < length + fade:
        raise SystemExit(f"Fragment {start}-{start + duration} s wychodzi poza nagranie.")
    loop = fragment[:length].copy()
    ramp = np.linspace(0, 1, fade)
    loop[:fade] = fragment[:fade] * ramp + fragment[length:] * (1 - ramp)
    return loop


def normalize(samples: np.ndarray) -> np.ndarray:
    """Same perceived loudness for every sound, without clipping the loudest peaks."""
    rms = np.sqrt(np.mean(samples**2))
    return samples * min(TARGET_RMS / rms, PEAK_LIMIT / np.abs(samples).max())


def write_wav(path: Path, samples: np.ndarray) -> None:
    with wave.open(str(path), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(SAMPLE_RATE)
        file.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())


def write_attribution(entries: list[dict]) -> None:
    rows = "".join(
        f"| `{entry['name']}.wav` | [{entry['title']}]({entry['page']}) | {entry['author']} "
        f"| {entry.get('license', 'CC0')} |\n"
        for entry in entries
    )
    (SOUNDS_DIR / "ATTRIBUTION.md").write_text(
        "# Źródła dźwięków\n\n"
        "Generowane przez `pipeline/sounds.py` - nie edytować ręcznie.\n\n"
        "Nagrania pochodzą z [BigSoundBank](https://bigsoundbank.com/licenses.html), gdzie są udostępnione\n"
        "na licencji CC0, albo z Wikimedia Commons, gdzie są w domenie publicznej.\n"
        "Wycięliśmy z nich zapętlone fragmenty.\n\n"
        "| Plik | Nagranie | Autor | Licencja |\n| --- | --- | --- | --- |\n"
        f"{rows}\n"
        "Pozostałe pliki w tym katalogu są syntezowane przez `apps/mobile/scripts/generate-sounds.mjs`.\n"
    )


def main() -> None:
    entries = json.loads((PIPELINE_DIR / "sounds.json").read_text())
    wanted = set(sys.argv[1:])
    for entry in entries:
        if wanted and entry["name"] not in wanted:
            continue
        loop = normalize(seamless_loop(decode(download(entry)), entry["start"], entry["duration"]))
        write_wav(SOUNDS_DIR / f"{entry['name']}.wav", loop)
        print(f"{entry['name']}.wav  {entry['duration']} s  z „{entry['title']}”")
    write_attribution(entries)


if __name__ == "__main__":
    main()
