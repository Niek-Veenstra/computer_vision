from ai_scanner_client.inference.classifier import KerasSymbolClassifier, SymbolClassifier
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
