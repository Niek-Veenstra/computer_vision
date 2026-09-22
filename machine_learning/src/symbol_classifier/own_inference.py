"""Run the trained classifier on a single image crop."""

import argparse
import json
import os
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import keras
import numpy as np
from PIL import Image


def predict_image(image_path: Path) -> tuple[str, float]:
    model = keras.models.load_model("symbol_classifier_final.keras")
    class_names = json.loads(Path("class_mapping.json").read_text(encoding="utf-8"))

    with Image.open(image_path) as image:
        array = np.asarray(image.convert("RGB").resize((128, 128)), dtype=np.float32)

    predictions = model.predict(array[None, ...], verbose=0)[0]
    class_index = int(np.argmax(predictions))
    return class_names[class_index], float(predictions[class_index])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path, help="Path to an image crop")
    args = parser.parse_args()

    label, confidence = predict_image(args.image)
    print(f"Predicted class: {label} (confidence: {confidence:.3f})")


if __name__ == "__main__":
    main()
