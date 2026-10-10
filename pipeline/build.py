"""Builds the sensory package of an artwork for the mobile app.

    python build.py czworka            # build one artwork
    python build.py --all              # build every artwork in pipeline/artworks
    python build.py czworka --redo describe depth
    python build.py --all --texts      # only rewrite the texts, after editing descriptions

Inputs live in pipeline/artworks/<id>/:
    source.json   title, author, licence and the image URL (written by hand or by import_met.py)
    objects.json  objects and descriptions; created by Claude on the first run, then kept,
                  so a curator can correct the texts, boxes or add "polygons" by hand
                  ("refine": true makes SAM find the exact things inside the polygons)

Slow intermediate results (downloaded image, depth map) are cached in pipeline/work/<id>/.
"""

import argparse
import json
import urllib.request
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from PIL import Image

from depth import estimate_depth
from describe import describe_artwork
from pack import build_manifest, write_manifest, write_package, write_preview, write_registry
from segment import clean_mask, contour_layer, merge_masks, polygon_mask, sam_masks, things_inside

PIPELINE_DIR = Path(__file__).parent
ARTWORKS_DIR = PIPELINE_DIR / "artworks"
WORK_DIR = PIPELINE_DIR / "work"
MOBILE_DIR = PIPELINE_DIR.parent / "apps" / "mobile"
PACKAGES_DIR = MOBILE_DIR / "assets" / "artworks"
SOUNDS_DIR = MOBILE_DIR / "assets" / "sounds"
REGISTRY_FILE = MOBILE_DIR / "src" / "artworks" / "registry.ts"

LAYER_SIDE = 512
USER_AGENT = "dotknij-obrazu/0.1 (BEST Hacks 2026 student project)"


def fetch_image(source: dict, work_dir: Path) -> Image.Image:
    path = work_dir / "original.jpg"
    if not path.exists():
        print(f"  pobieram {source['imageUrl']}")
        request = urllib.request.Request(source["imageUrl"], headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request) as response:
            path.write_bytes(response.read())
    return Image.open(path).convert("RGB")


def layer_size(image: Image.Image) -> tuple[int, int]:
    scale = LAYER_SIDE / max(image.size)
    return round(image.width * scale), round(image.height * scale)


def object_masks(image: Image.Image, objects: list[dict], size: tuple[int, int]) -> list[np.ndarray]:
    """Curator polygons win; every other object is segmented by SAM inside its box.

    A polygon marked "refine" only says where to look: SAM finds the exact things inside it.
    """
    automatic = [item for item in objects if not item.get("polygons")]
    segmented = iter(sam_masks(image, [item["box"] for item in automatic], size) if automatic else [])
    masks = []
    for item in objects:
        if not item.get("polygons"):
            mask = clean_mask(next(segmented))
        else:
            mask = polygon_mask(item["polygons"], size)
            if item.get("refine"):
                mask = things_inside(image, mask, size)
        masks.append(mask)
        print(f"  {item['label']}: {mask.mean():.1%} obrazu")
    return masks


def is_precise(item: dict) -> bool:
    """Whether the mask follows the real outline of the object, so its edge is worth tracing."""
    return not item.get("polygons") or bool(item.get("refine"))


def build(artwork_id: str, redo: set[str]) -> None:
    print(f"[{artwork_id}]")
    artwork_dir = ARTWORKS_DIR / artwork_id
    work_dir = WORK_DIR / artwork_id
    work_dir.mkdir(parents=True, exist_ok=True)

    source = json.loads((artwork_dir / "source.json").read_text())
    image = fetch_image(source, work_dir)
    size = layer_size(image)

    objects_file = artwork_dir / "objects.json"
    if "describe" in redo or not objects_file.exists():
        print("  opisuję obiekty (Claude)")
        described = describe_artwork(image, source, sorted(path.stem for path in SOUNDS_DIR.glob("*.wav")))
        objects_file.write_text(json.dumps(described, ensure_ascii=False, indent=2) + "\n")
    described = json.loads(objects_file.read_text())
    sounds = {path.stem for path in SOUNDS_DIR.glob("*.wav")}
    for item in described["objects"]:
        if item["sound"] not in sounds:
            raise SystemExit(f"Obiekt „{item['label']}” używa nieznanego dźwięku: {item['sound']}")

    depth_file = work_dir / "depth.npy"
    if "depth" in redo or not depth_file.exists():
        print("  liczę głębię (Depth Anything V2)")
        np.save(depth_file, estimate_depth(image, size))
    depth = np.load(depth_file)

    print("  segmentuję obiekty")
    masks = object_masks(image, described["objects"], size)
    object_ids = merge_masks(masks)
    precise = [mask for item, mask in zip(described["objects"], masks) if is_precise(item)]
    contours = contour_layer(depth, precise)

    write_package(PACKAGES_DIR / artwork_id, source, described, image, object_ids, depth, contours)
    write_preview(work_dir / "preview.jpg", image, object_ids, depth, contours)
    print(f"  zapisano {PACKAGES_DIR / artwork_id}, podgląd masek: {work_dir / 'preview.jpg'}")


def rebuild_texts(artwork_id: str) -> None:
    """Rewrites manifest.json from the curator's files and leaves the layers as they are."""
    artwork_dir = ARTWORKS_DIR / artwork_id
    manifest_file = PACKAGES_DIR / artwork_id / "manifest.json"
    if not manifest_file.exists():
        raise SystemExit(f"Dzieło „{artwork_id}” nie ma jeszcze paczki. Zbuduj je najpierw bez --texts.")
    source = json.loads((artwork_dir / "source.json").read_text())
    described = json.loads((artwork_dir / "objects.json").read_text())
    layers = json.loads(manifest_file.read_text())["layers"]
    write_manifest(manifest_file.parent, build_manifest(source, described, (layers["width"], layers["height"])))
    print(f"[{artwork_id}] zapisano teksty")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("artworks", nargs="*", help="ids of folders in pipeline/artworks")
    parser.add_argument("--all", action="store_true", help="build every artwork")
    parser.add_argument("--redo", nargs="+", default=[], choices=["describe", "depth"], help="ignore cached steps")
    parser.add_argument("--texts", action="store_true", help="only rewrite the texts, keep the layers")
    args = parser.parse_args()

    load_dotenv(PIPELINE_DIR / ".env")
    ids = sorted(path.parent.name for path in ARTWORKS_DIR.glob("*/source.json")) if args.all else args.artworks
    if not ids:
        parser.error("podaj id dzieła albo --all")
    for artwork_id in ids:
        if args.texts:
            rebuild_texts(artwork_id)
        else:
            build(artwork_id, set(args.redo))
    write_registry(PACKAGES_DIR, REGISTRY_FILE)
    print(f"zaktualizowano {REGISTRY_FILE.relative_to(PIPELINE_DIR.parent)}")


if __name__ == "__main__":
    main()
