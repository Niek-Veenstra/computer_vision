from pathlib import Path


DATASET_DIR = Path("symbols_and_operators/classifier")
CLASS_FILE = Path("symbols_and_operators/classes.txt")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".gif"}


def count_images(directory: Path) -> int:
    if not directory.is_dir():
        raise FileNotFoundError(f"Class directory not found: {directory}")
    return sum(path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS for path in directory.iterdir())


def percentage(count: int, total: int) -> float:
    return count / total * 100 if total else 0.0


def main() -> None:
    if not DATASET_DIR.is_dir():
        raise FileNotFoundError(f"Dataset dir not found: {DATASET_DIR}")

    class_names = CLASS_FILE.read_text(encoding="utf-8").splitlines()
    counts = []
    for class_index, symbol in enumerate(class_names):
        folder = f"class_{class_index}"
        train_count = count_images(DATASET_DIR / "train" / folder)
        val_count = count_images(DATASET_DIR / "val" / folder)
        counts.append((folder, symbol, train_count, val_count))

    train_total = sum(row[2] for row in counts)
    val_total = sum(row[3] for row in counts)
    overall_total = train_total + val_total
    print(f"Dataset: {DATASET_DIR}")
    print(f"Training images: {train_total}")
    print(f"Validation images: {val_total}")
    print(f"Total images: {overall_total}\n")
    print("Percentages show each class's share of its column.")
    print(f"{'Class':>10}  {'Symbol':>6}  {'Train':>6}  {'Train %':>7}  {'Val':>6}  {'Val %':>7}  {'Total':>6}  {'Total %':>7}")
    for folder, symbol, train_count, val_count in counts:
        class_total = train_count + val_count
        print(
            f"{folder:>10}  {symbol:>6}  "
            f"{train_count:>6}  {percentage(train_count, train_total):>6.2f}%  "
            f"{val_count:>6}  {percentage(val_count, val_total):>6.2f}%  "
            f"{class_total:>6}  {percentage(class_total, overall_total):>6.2f}%"
        )

if __name__ == "__main__":
    main()
