import json
import os
from collections.abc import Callable, Sequence
from pathlib import Path
from threading import Lock
from typing import Protocol

import numpy as np
from numpy.typing import NDArray
from PIL import Image

from ai_scanner_client.inference.preprocessing import ImagePreprocessor
from ai_scanner_client.models import Prediction


class PredictiveModel(Protocol):
    def predict(self, inputs: NDArray[np.float32], *, verbose: int = 0) -> object: ...


class SymbolClassifier(Protocol):
    def predict(self, image_path: Path) -> Prediction: ...

    def predict_images(self, images: list[Image.Image]) -> list[Prediction]: ...


ModelLoader = Callable[[Path], PredictiveModel]


class KerasSymbolClassifier:
    """Reusable classifier that loads a Keras model once during construction."""

    def __init__(
        self,
        model_path: Path,
        class_mapping_path: Path,
        *,
        model_id: str = "unmanaged",
        architecture: str = "unknown",
        run_id: str = "unknown",
        preprocessor: ImagePreprocessor | None = None,
        model_loader: ModelLoader | None = None,
    ) -> None:
        self._model_id = model_id
        self._architecture = architecture
        self._run_id = run_id
        self._class_names = self._load_class_names(class_mapping_path)
        self._preprocessor = preprocessor or ImagePreprocessor()
        self._model = (model_loader or self._load_keras_model)(model_path)
        self._prediction_lock = Lock()

    def predict(self, image_path: Path) -> Prediction:
        inputs = self._preprocessor.prepare(image_path)
        return self._predict_batch(inputs)[0]

    def predict_images(self, images: list[Image.Image]) -> list[Prediction]:
        if not images:
            return []
        return self._predict_batch(self._preprocessor.prepare_images(images))

    def _predict_batch(self, inputs: NDArray[np.float32]) -> list[Prediction]:
        with self._prediction_lock:
            raw_predictions = self._model.predict(inputs, verbose=0)
        scores = np.asarray(raw_predictions, dtype=np.float32)
        if scores.ndim != 2 or scores.shape != (inputs.shape[0], len(self._class_names)):
            raise ValueError(
                "Model output does not match the class mapping: "
                f"shape={scores.shape}, classes={len(self._class_names)}"
            )
        if not np.all(np.isfinite(scores)):
            raise ValueError("Model output contains non-finite values")
        predictions = []
        for row in scores:
            class_index = int(np.argmax(row))
            predictions.append(
                Prediction(
                    model_id=self._model_id,
                    architecture=self._architecture,
                    run_id=self._run_id,
                    label=self._class_names[class_index],
                    confidence=float(row[class_index]),
                    class_index=class_index,
                )
            )
        return predictions

    @staticmethod
    def _load_class_names(path: Path) -> Sequence[str]:
        if not path.is_file():
            raise FileNotFoundError(f"Class mapping does not exist: {path}")
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, list) or not value or not all(isinstance(x, str) for x in value):
            raise ValueError("Class mapping must be a non-empty JSON array of strings")
        return value

    @staticmethod
    def _load_keras_model(path: Path) -> PredictiveModel:
        if not path.is_file():
            raise FileNotFoundError(f"Keras model does not exist: {path}")
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
        try:
            import keras
        except ImportError as error:
            raise RuntimeError(
                "TensorFlow support is not installed; run `uv sync --extra tensorflow`"
            ) from error
        return keras.models.load_model(path)
