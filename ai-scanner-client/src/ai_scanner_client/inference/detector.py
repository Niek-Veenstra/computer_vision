import os
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Protocol

import numpy as np
from PIL import Image


@dataclass(frozen=True, slots=True)
class DetectionCandidate:
    left: float
    top: float
    right: float
    bottom: float
    confidence: float


class DetectorModel(Protocol):
    def predict(self, **kwargs: object) -> object: ...


DetectorLoader = Callable[[Path], DetectorModel]


class YoloSymbolDetector:
    """Reusable YOLO detector that loads its weights once."""

    def __init__(
        self,
        model_path: Path,
        *,
        confidence_threshold: float = 0.25,
        image_size: int = 960,
        max_detections: int = 500,
        model_loader: DetectorLoader | None = None,
    ) -> None:
        self._confidence_threshold = confidence_threshold
        self._image_size = image_size
        self._max_detections = max_detections
        self._model = (model_loader or self._load_yolo_model)(model_path)
        self._prediction_lock = Lock()

    def detect(
        self,
        image: Image.Image,
        *,
        confidence_threshold: float | None = None,
    ) -> list[DetectionCandidate]:
        confidence = (
            self._confidence_threshold if confidence_threshold is None else confidence_threshold
        )
        if not 0 < confidence <= 1:
            raise ValueError("confidence_threshold must be greater than 0 and at most 1")
        with self._prediction_lock:
            raw_results = self._model.predict(
                source=np.asarray(image.convert("RGB")),
                conf=confidence,
                imgsz=self._image_size,
                max_det=self._max_detections,
                verbose=False,
            )
        result = raw_results[0]  # type: ignore[index]
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            return []
        coordinates = boxes.xyxy.cpu().numpy()
        confidences = boxes.conf.cpu().numpy()
        return [
            DetectionCandidate(
                left=float(box[0]),
                top=float(box[1]),
                right=float(box[2]),
                bottom=float(box[3]),
                confidence=float(score),
            )
            for box, score in zip(coordinates, confidences, strict=True)
        ]

    @staticmethod
    def _load_yolo_model(path: Path) -> DetectorModel:
        if not path.is_file():
            raise FileNotFoundError(f"YOLO model does not exist: {path}")
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
        try:
            from ultralytics import YOLO
        except ImportError as error:
            raise RuntimeError(
                "Pipeline support is not installed; run `uv sync --extra pipeline`"
            ) from error
        return YOLO(path)
