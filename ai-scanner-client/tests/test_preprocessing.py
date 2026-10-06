from pathlib import Path

import numpy as np
from PIL import Image

from ai_scanner_client.inference.preprocessing import ImagePreprocessor


def test_preprocessor_matches_classifier_input_shape(tmp_path: Path) -> None:
    image_path = tmp_path / "symbol.png"
    Image.new("L", (32, 64), color=128).save(image_path)

    result = ImagePreprocessor().prepare(image_path)

    assert result.shape == (1, 128, 128, 3)
    assert result.dtype == np.float32
    assert np.all(result == 128.0)


def test_preprocessor_batches_in_memory_crops() -> None:
    images = [
        Image.new("RGB", (10, 20), color=(1, 2, 3)),
        Image.new("L", (20, 10), color=64),
    ]

    result = ImagePreprocessor().prepare_images(images)

    assert result.shape == (2, 128, 128, 3)
    assert result.dtype == np.float32
    assert np.all(result[0] == [1.0, 2.0, 3.0])
    assert np.all(result[1] == 64.0)
