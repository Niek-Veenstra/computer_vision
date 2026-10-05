import json
from pathlib import Path

import numpy as np
import pytest
from numpy.typing import NDArray
from PIL import Image

from ai_scanner_client.inference.classifier import KerasSymbolClassifier


class FakeModel:
    def predict(self, inputs: NDArray[np.float32], *, verbose: int = 0) -> object:
        assert inputs.shape == (1, 128, 128, 3)
        assert verbose == 0
        return np.array([[0.1, 0.8, 0.1]], dtype=np.float32)


def test_classifier_returns_highest_scoring_class(tmp_path: Path) -> None:
    image_path = tmp_path / "symbol.png"
    mapping_path = tmp_path / "class_mapping.json"
    Image.new("RGB", (10, 20), color="white").save(image_path)
    mapping_path.write_text(json.dumps(["*", "+", "-"]), encoding="utf-8")

    classifier = KerasSymbolClassifier(
        tmp_path / "unused.keras",
        mapping_path,
        model_loader=lambda _: FakeModel(),
    )

    prediction = classifier.predict(image_path)

    assert prediction.label == "+"
    assert prediction.class_index == 1
    assert prediction.confidence == pytest.approx(0.8)
