from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ManifestModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ModelFormat(StrEnum):
    KERAS = "keras"


class DetectorFormat(StrEnum):
    ULTRALYTICS = "ultralytics"


class PreprocessingManifest(ManifestModel):
    color_mode: Literal["RGB"] = "RGB"
    width: int = Field(default=128, gt=0)
    height: int = Field(default=128, gt=0)
    resize: Literal["bilinear"] = "bilinear"
    normalization: Literal["none"] = "none"


class DetectorManifest(ManifestModel):
    format: DetectorFormat
    architecture: str = Field(min_length=1, max_length=100)
    run_id: str = Field(min_length=1, max_length=150)
    model_file: str = Field(min_length=1)
    confidence_threshold: float = Field(default=0.25, gt=0, le=1)
    image_size: int = Field(default=960, ge=128, le=4096)
    max_detections: int = Field(default=500, gt=0, le=5000)
    model_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


class ModelManifest(ManifestModel):
    schema_version: Literal[1] = 1
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{0,99}$")
    architecture: str = Field(min_length=1, max_length=100)
    run_id: str = Field(min_length=1, max_length=150)
    format: ModelFormat
    model_file: str = Field(min_length=1)
    class_mapping_file: str = Field(min_length=1)
    preprocessing: PreprocessingManifest = Field(default_factory=PreprocessingManifest)
    deployable: bool = True
    model_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    detector: DetectorManifest | None = None


@dataclass(frozen=True, slots=True)
class ModelBundle:
    manifest: ModelManifest
    directory: Path
    model_path: Path
    class_mapping_path: Path
    detector_path: Path | None = None
