"""Step 3: monocular depth with Depth Anything V2 Small."""

import numpy as np
from PIL import Image

MODEL = "depth-anything/Depth-Anything-V2-Small-hf"


def estimate_depth(image: Image.Image, size: tuple[int, int]) -> np.ndarray:
    """Returns a uint8 array of shape (height, width): 0 = far, 255 = near."""
    from transformers import pipeline  # slow import, only needed for this step

    # CPU is fast enough for one image and avoids operators missing on some GPUs (e.g. MPS)
    estimator = pipeline("depth-estimation", model=MODEL, device="cpu")
    # The model predicts relative inverse depth, so larger values are already closer
    predicted = estimator(image)["predicted_depth"].squeeze().numpy()
    low, high = predicted.min(), predicted.max()
    normalized = (predicted - low) / max(high - low, 1e-6)
    depth = Image.fromarray((normalized * 255).astype(np.uint8)).resize(size, Image.Resampling.BILINEAR)
    return np.asarray(depth)
