"""Creates pipeline/artworks/<id>/source.json for an artwork from The Met Open Access API.

    python import_met.py 45434 wielka-fala
    python build.py wielka-fala

Only public domain objects are accepted (The Met releases their images under CC0).
"""

import argparse
import json
import urllib.request

from build import ARTWORKS_DIR, USER_AGENT

API = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("object_id", help="number from the artwork's URL on metmuseum.org")
    parser.add_argument("artwork_id", help="short folder name for the artwork, e.g. wielka-fala")
    args = parser.parse_args()

    request = urllib.request.Request(API.format(object_id=args.object_id), headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request) as response:
        record = json.load(response)

    if not record.get("isPublicDomain") or not record.get("primaryImage"):
        raise SystemExit("To dzieło nie jest w domenie publicznej albo nie ma zdjęcia - nie importuję.")

    source = {
        "id": args.artwork_id,
        "title": record["title"],
        "author": record["artistDisplayName"] or "autor nieznany",
        "year": record["objectDate"],
        "institution": "The Metropolitan Museum of Art, Nowy Jork",
        "license": "CC0 (The Met Open Access)",
        "source": record["objectURL"],
        "imageUrl": record["primaryImage"],
    }
    out_dir = ARTWORKS_DIR / args.artwork_id
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "source.json").write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")
    print(f"zapisano {out_dir / 'source.json'} - popraw tytuł na polski, potem: python build.py {args.artwork_id}")


if __name__ == "__main__":
    main()
