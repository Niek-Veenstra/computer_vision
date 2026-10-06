from ai_scanner_client.inference.classifier import KerasSymbolClassifier, SymbolClassifier
from ai_scanner_client.inference.detector import YoloSymbolDetector
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.inference.preprocessing import ImagePreprocessor
from ai_scanner_client.model_management.bundle import ModelBundle, ModelFormat


class UnsupportedModelFormatError(ValueError):
    pass


class ClassifierFactory:
    def create(self, bundle: ModelBundle) -> SymbolClassifier:
        manifest = bundle.manifest
        if manifest.format is not ModelFormat.KERAS:
            raise UnsupportedModelFormatError(f"Unsupported model format: {manifest.format}")
        preprocessing = manifest.preprocessing
        return KerasSymbolClassifier(
            bundle.model_path,
            bundle.class_mapping_path,
            model_id=manifest.id,
            architecture=manifest.architecture,
            run_id=manifest.run_id,
            preprocessor=ImagePreprocessor((preprocessing.width, preprocessing.height)),
        )


class PipelineFactory:
    def __init__(self, classifier_factory: ClassifierFactory | None = None) -> None:
        self._classifier_factory = classifier_factory or ClassifierFactory()

    def create(self, bundle: ModelBundle) -> SymbolRecognitionPipeline:
        detector_manifest = bundle.manifest.detector
        if detector_manifest is None or bundle.detector_path is None:
            raise ValueError(f"Model bundle '{bundle.manifest.id}' does not contain a detector")
        detector = YoloSymbolDetector(
            bundle.detector_path,
            confidence_threshold=detector_manifest.confidence_threshold,
            image_size=detector_manifest.image_size,
            max_detections=detector_manifest.max_detections,
        )
        return SymbolRecognitionPipeline(
            detector,
            self._classifier_factory.create(bundle),
            model_id=bundle.manifest.id,
            classifier_architecture=bundle.manifest.architecture,
            classifier_run_id=bundle.manifest.run_id,
            detector_architecture=detector_manifest.architecture,
            detector_run_id=detector_manifest.run_id,
        )
