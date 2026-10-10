"""Step 4: one mask per object, merged into the object-id layer; plus the contour layer."""

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SAM_MODEL = "facebook/sam2.1-hiera-small"
MIN_REGION_SHARE = 0.002  # specks smaller than this share of the image are dropped
DEPTH_STEP = 4  # change of depth per pixel (on the 0-255 scale) that counts as a silhouette
MIN_CONTOUR_PX = 40  # shorter silhouette fragments are noise
CONTOUR_RADIUS_PX = 9  # the vibration fades out this far from a contour, about 3 mm on a phone
FAR_CONTOUR_STRENGTH = 0.5  # the most distant contour is felt at this share of the nearest one


def polygon_mask(polygons: list[list[list[float]]], size: tuple[int, int]) -> np.ndarray:
    """Rasterizes curator-drawn polygons; points are normalized to 0..1."""
    width, height = size
    canvas = Image.new("L", size, 0)
    draw = ImageDraw.Draw(canvas)
    for polygon in polygons:
        draw.polygon([(x * width, y * height) for x, y in polygon], fill=255)
    return np.asarray(canvas) > 0


def sam_masks(image: Image.Image, boxes: list[dict], size: tuple[int, int]) -> list[np.ndarray]:
    """Segments the object inside each box (normalized x0, y0, x1, y1) with SAM 2."""
    import torch
    from transformers import Sam2Model, Sam2Processor  # slow import, only needed for this step

    # torch 2.2 is the last release for Intel Macs and lacks this helper used by the processor
    if not hasattr(torch.compiler, "is_compiling"):
        torch.compiler.is_compiling = lambda: False

    processor = Sam2Processor.from_pretrained(SAM_MODEL)
    model = Sam2Model.from_pretrained(SAM_MODEL)
    pixel_boxes = [
        [box["x0"] * image.width, box["y0"] * image.height, box["x1"] * image.width, box["y1"] * image.height]
        for box in boxes
    ]
    inputs = processor(images=image, input_boxes=[pixel_boxes], return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs, multimask_output=False)
    masks = processor.post_process_masks(outputs.pred_masks, inputs["original_sizes"])[0]
    return [
        np.asarray(Image.fromarray(mask[0].numpy().astype(np.uint8) * 255).resize(size, Image.Resampling.NEAREST)) > 0
        for mask in masks
    ]


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """Fills holes and removes specks, so a finger does not fall in and out of the object."""
    mask = ndimage.binary_closing(mask, iterations=3)
    mask = ndimage.binary_fill_holes(mask)
    labels, count = ndimage.label(mask)
    if count == 0:
        return mask
    areas = ndimage.sum(mask, labels, range(1, count + 1))
    keep = [i + 1 for i, area in enumerate(areas) if area >= MIN_REGION_SHARE * mask.size]
    return np.isin(labels, keep)


def merge_masks(masks: list[np.ndarray]) -> np.ndarray:
    """Builds the object-id layer: mask i becomes id i + 1, 0 stays background."""
    object_ids = np.zeros(masks[0].shape, dtype=np.uint8)
    # Larger objects are painted first, so a smaller one overlapping them stays reachable
    for index in sorted(range(len(masks)), key=lambda i: -masks[i].sum()):
        object_ids[masks[index]] = index + 1
    return object_ids


def mask_outline(mask: np.ndarray) -> np.ndarray:
    return mask & ~ndimage.binary_erosion(mask)


def contour_layer(depth: np.ndarray, precise_masks: list[np.ndarray]) -> np.ndarray:
    """How close each pixel is to a contour worth tracing with a finger, 0 far away from any.

    Contours are silhouettes found as sudden changes of depth (a horse against the road)
    and outlines of the masks segmented by SAM. Hand-drawn polygons are too rough to trace.
    The value on a contour grows with depth, so the outline of a near thing feels stronger.
    """
    smooth = ndimage.gaussian_filter(depth.astype(float), 1.0)
    slope = np.hypot(ndimage.sobel(smooth, axis=0), ndimage.sobel(smooth, axis=1)) / 8
    silhouettes = slope > DEPTH_STEP
    labels, count = ndimage.label(silhouettes)
    sizes = ndimage.sum(silhouettes, labels, range(1, count + 1))
    contours = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size >= MIN_CONTOUR_PX])
    for mask in precise_masks:
        contours |= mask_outline(mask)

    # A silhouette belongs to the thing in front, so take the nearer side of the depth step
    nearness = ndimage.maximum_filter(depth, size=5) / 255
    strength = FAR_CONTOUR_STRENGTH + (1 - FAR_CONTOUR_STRENGTH) * nearness

    # Every pixel takes the strength of its nearest contour pixel, fading with the distance to it
    distance, (rows, columns) = ndimage.distance_transform_edt(~contours, return_indices=True)
    closeness = np.clip(1 - distance / CONTOUR_RADIUS_PX, 0, 1)
    return (closeness * strength[rows, columns] * 255).astype(np.uint8)
