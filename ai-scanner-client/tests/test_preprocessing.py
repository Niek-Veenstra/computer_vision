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
