from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image


class ImagePreprocessor:
    """Apply the exact preprocessing used by the trained CNN baseline."""

    def __init__(self, image_size: tuple[int, int] = (128, 128)) -> None:
        self._image_size = image_size

    def prepare(self, image_path: Path) -> NDArray[np.float32]:
        if not image_path.is_file():
            raise FileNotFoundError(f"Image does not exist: {image_path}")
        with Image.open(image_path) as image:
            return self.prepare_images([image])

    def prepare_images(self, images: list[Image.Image]) -> NDArray[np.float32]:
        if not images:
            return np.empty((0, *self._image_size[::-1], 3), dtype=np.float32)
        arrays = []
        for image in images:
            resized = image.convert("RGB").resize(
                self._image_size,
                resample=Image.Resampling.BILINEAR,
            )
            arrays.append(np.asarray(resized, dtype=np.float32))
        return np.stack(arrays)
