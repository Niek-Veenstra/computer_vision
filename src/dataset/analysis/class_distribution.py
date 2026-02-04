import os

DATASET_DIR = "new_symbols_operators_dataset"

def main():
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(f"Dataset dir not found: {DATASET_DIR}")

    class_counts: dict[str, int] = {}

    for cls in sorted(os.listdir(DATASET_DIR)):
        cls_path = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(cls_path):
            continue

        files = [
            f for f in os.listdir(cls_path)
            if os.path.isfile(os.path.join(cls_path, f))
        ]
        class_counts[cls] = len(files)

    total = sum(class_counts.values())
    print(f"Dataset: {DATASET_DIR}")
    print(f"Total images: {total}\n")

    for cls, count in sorted(class_counts.items(), key=lambda x: x[0]):
        pct = (count / total * 100) if total else 0
        print(f"{cls:>12}: {count:>6}  ({pct:>6.2f}%)")

    if class_counts:
        min_cls, min_count = min(class_counts.items(), key=lambda kv: kv[1])
        max_cls, max_count = max(class_counts.items(), key=lambda kv: kv[1])
        print("\nMin class:", min_cls, min_count)
        print("Max class:", max_cls, max_count)

if __name__ == "__main__":
    main()
