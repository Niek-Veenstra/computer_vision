from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ScannerIdentity(ApiModel):
    id: UUID
    owner_id: UUID
    name: str
    created_at: datetime
    last_seen_at: datetime | None
    revoked_at: datetime | None


class MarkerContent(ApiModel):
    type: str = Field(pattern="^(text|inlineMath)$")
    value: str


class DocumentMarker(ApiModel):
    id: UUID
    label: str | None
    content: list[MarkerContent]


class DocumentMarkers(ApiModel):
    document_id: UUID
    version: int = Field(gt=0)
    markers: list[DocumentMarker]


class MarkerUpdateResult(ApiModel):
    operation_id: UUID
    document_id: UUID
    marker_id: UUID
    version: int = Field(gt=0)
    applied: bool


class ScanSession(ApiModel):
    id: UUID
    document_id: UUID
    scanner_id: UUID
    status: str = Field(pattern="^(active|completed|cancelled)$")
    created_at: datetime
    completed_at: datetime | None


class Prediction(ApiModel):
    model_id: str
    architecture: str
    run_id: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    class_index: int = Field(ge=0)


class BoundingBox(ApiModel):
    left: float = Field(ge=0)
    top: float = Field(ge=0)
    right: float = Field(ge=0)
    bottom: float = Field(ge=0)


class DetectedSymbol(ApiModel):
    box: BoundingBox
    detection_confidence: float = Field(ge=0.0, le=1.0)
    prediction: Prediction


class PagePrediction(ApiModel):
    model_id: str
    classifier_architecture: str
    classifier_run_id: str
    detector_architecture: str
    detector_run_id: str
    image_width: int = Field(gt=0)
    image_height: int = Field(gt=0)
    sequence: str | None = None
    detections: list[DetectedSymbol]


class RecognitionResult(ApiModel):
    prediction: Prediction
    update: MarkerUpdateResult
