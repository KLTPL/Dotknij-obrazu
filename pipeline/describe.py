"""Step 2: Claude picks the objects of an artwork and writes their audio descriptions."""

import base64
import io
import json
import os

from PIL import Image

MODEL = "claude-opus-5-5"
MAX_IMAGE_SIDE = 1568  # larger images are downscaled by the API anyway

SYSTEM_PROMPT = """\
Jesteś audiodeskryptorem dzieł sztuki. Przygotowujesz obraz dla aplikacji, w której osoba \
niewidoma wodzi palcem po ekranie telefonu: pod palcem gra dźwięk obiektu, a aplikacja \
odczytuje jego nazwę i opis.

Wybierz od 3 do 6 obiektów:
- duże: każdy zajmuje co najmniej kilka procent powierzchni obrazu, bo musi dać się trafić palcem,
- wyraźnie oddzielone od siebie, razem pokrywające najważniejsze części kompozycji,
- takie, które da się skojarzyć z dźwiękiem; grupę podobnych elementów (np. zaprzęg koni) \
potraktuj jako jeden obiekt.

Dla każdego obiektu podaj:
- label: nazwę po polsku, 1-3 słowa, małą literą,
- segmentationPrompt: krótką frazę po angielsku dla modelu segmentacji (np. "four horses"),
- box: ciasny prostokąt wokół obiektu, współrzędne od 0 do 1 względem szerokości i wysokości \
obrazu, punkt (0, 0) to lewy górny róg,
- shortDescription: jedno zdanie, najwyżej 12 słów,
- longDescription: 2-4 zdania,
- sound: jeden z dostępnych dźwięków, najlepiej pasujący do obiektu; każdy obiekt inny dźwięk,
- texture: fakturę powierzchni wyczuwaną wibracją pod palcem: smooth (gładka: szkło, lód, niebo), \
soft (miękka: tkanina, spokojna woda), grainy (drobnoziarnista: sierść, drewno), rough (szorstka: \
skała, błoto, kora); sąsiadujące obiekty powinny mieć różne faktury.

Zasady audiodeskrypcji dla wszystkich opisów:
- opisuj to, co widać, w czasie teraźniejszym; bez interpretacji, ocen i wiedzy spoza obrazu,
- od ogółu do szczegółu, proste zdania, konkretne rzeczowniki, nazwy kolorów,
- położenie podawaj względem obrazu: po lewej, po prawej, u góry, na dole, na pierwszym planie, w tle,
- nie pisz "widzimy" ani "obraz przedstawia" w opisach obiektów.

description to opis całego dzieła: 3-5 zdań, najpierw co to za scena, potem układ kompozycji \
(co jest gdzie), na końcu kolorystyka i światło.

story to osobna warstwa dla ciekawskich, czytana dopiero na życzenie: dla całego dzieła i dla \
każdego obiektu 2-4 zdania historii i ciekawostek spoza obrazu - kim jest przedstawiona osoba, \
jak i dlaczego dzieło powstało, co mówi o swojej epoce. Tylko pewne, powszechnie znane fakty; \
gdy o obiekcie nie ma nic pewnego do powiedzenia, zostaw pusty tekst.
"""


def output_schema(sounds: list[str]) -> dict:
    coordinate = {"type": "number"}
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["description", "story", "objects"],
        "properties": {
            "description": {"type": "string"},
            "story": {"type": "string"},
            "objects": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "label",
                        "segmentationPrompt",
                        "box",
                        "shortDescription",
                        "longDescription",
                        "story",
                        "sound",
                        "texture",
                    ],
                    "properties": {
                        "label": {"type": "string"},
                        "segmentationPrompt": {"type": "string"},
                        "box": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["x0", "y0", "x1", "y1"],
                            "properties": {"x0": coordinate, "y0": coordinate, "x1": coordinate, "y1": coordinate},
                        },
                        "shortDescription": {"type": "string"},
                        "longDescription": {"type": "string"},
                        "story": {"type": "string"},
                        "sound": {"type": "string", "enum": sounds},
                        "texture": {"type": "string", "enum": ["smooth", "soft", "grainy", "rough"]},
                    },
                },
            },
        },
    }


def encode_image(image: Image.Image) -> str:
    image = image.copy()
    image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return base64.standard_b64encode(buffer.getvalue()).decode()


def describe_artwork(image: Image.Image, source: dict, sounds: list[str]) -> dict:
    """Returns {"description": str, "story": str, "objects": [...]} as defined by output_schema()."""
    import anthropic  # imported here so the other steps work without the SDK configured

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("Brak ANTHROPIC_API_KEY. Skopiuj pipeline/.env.example do pipeline/.env i wpisz klucz.")

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/jpeg", "data": encode_image(image)},
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Dzieło: {source['author']}, „{source['title']}”, {source['year']}.\n"
                            f"Dostępne dźwięki: {', '.join(sounds)}."
                        ),
                    },
                ],
            }
        ],
        output_config={"format": {"type": "json_schema", "schema": output_schema(sounds)}},
    )
    if response.stop_reason != "end_turn":
        raise SystemExit(f"Claude nie dokończył odpowiedzi (stop_reason: {response.stop_reason}).")
    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)
