"""Create a stratified crop split from the original symbol annotations."""

import random
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image


SOURCE = Path("symbols_and_operators")
DESTINATION = SOURCE / "classifier"
VALIDATION_RATIO = 0.2
RANDOM_SEED = 42


def main() -> None:
    if DESTINATION.exists():
        raise FileExistsError(f"Destination already exists: {DESTINATION}")

    class_count = len((SOURCE / "classes.txt").read_text(encoding="utf-8").splitlines())
    crops = defaultdict(list)

    for label_path in sorted((SOURCE / "labels").glob("*.txt")):
        image_path = next(
            (path for extension in (".png", ".jpg", ".jpeg")
             if (path := SOURCE / "images" / f"{label_path.stem}{extension}").exists()),
            None,
        )
        if image_path is None:
            raise FileNotFoundError(f"No image for {label_path}")

        with Image.open(image_path) as source_image:
            image = source_image.convert("RGB")
        width, height = image.size

        for index, line in enumerate(label_path.read_text(encoding="utf-8").splitlines()):
            class_text, x_text, y_text, w_text, h_text = line.split()
            class_index = int(class_text)
            if not 0 <= class_index < class_count:
                raise ValueError(f"Invalid class {class_index} in {label_path}")

            x, y, box_width, box_height = map(float, (x_text, y_text, w_text, h_text))
            left = max(0, round((x - box_width / 2) * width))
            top = max(0, round((y - box_height / 2) * height))
            right = min(width, round((x + box_width / 2) * width))
            bottom = min(height, round((y + box_height / 2) * height))
            if right <= left or bottom <= top:
                raise ValueError(f"Empty crop at line {index + 1} in {label_path}")

            crops[class_index].append((f"{label_path.stem}_{index}.png", image.crop((left, top, right, bottom))))

    counts = Counter()
    random_generator = random.Random(RANDOM_SEED)
    for class_index in range(class_count):
        items = crops[class_index]
        if len(items) < 2:
            raise ValueError(f"Class {class_index} needs at least two crops for both splits")
        random_generator.shuffle(items)
        validation_count = max(1, min(len(items) - 1, round(len(items) * VALIDATION_RATIO)))

        for split, selected in (("val", items[:validation_count]), ("train", items[validation_count:])):
            output_dir = DESTINATION / split / f"class_{class_index}"
            output_dir.mkdir(parents=True)
            for filename, crop in selected:
                crop.save(output_dir / filename)
                counts[split] += 1

    print(f"Created {counts['train']} train and {counts['val']} validation crops in {DESTINATION}")


if __name__ == "__main__":
    main()
