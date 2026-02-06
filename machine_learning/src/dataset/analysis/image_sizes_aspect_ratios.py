import os
from PIL import Image
import math

DATASET_DIR = "new_symbols_operators_dataset"
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

def safe_open_size(path: str):
    try:
        with Image.open(path) as im:
            w, h = im.size
        return w, h
    except Exception:
        return None

def main():
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(f"Dataset dir not found: {DATASET_DIR}")

    widths = []
    heights = []
    aspect_ratios = []
    per_class = {}

    total_files = 0
    bad_files = 0

    for clazz in sorted(os.listdir(DATASET_DIR)):
        cls_path = os.path.join(DATASET_DIR, clazz)
        if not os.path.isdir(cls_path):
            continue

        per_class[clazz] = {"count": 0, "w": [], "h": [], "ar": []}

        for file_name in os.listdir(cls_path):
            file_extension = os.path.splitext(file_name)[1].lower()
            if file_extension not in VALID_EXT:
                continue

            total_files += 1
            path = os.path.join(cls_path, file_name)
            size = safe_open_size(path)
            if size is None:
                bad_files += 1
                continue

            width, height = size
            if width <= 0 or height <= 0:
                bad_files += 1
                continue

            ar = width / height

            widths.append(width)
            heights.append(height)
            aspect_ratios.append(ar)

            per_class[clazz]["count"] += 1
            per_class[clazz]["w"].append(width)
            per_class[clazz]["h"].append(height)
            per_class[clazz]["ar"].append(ar)

    if not widths:
        print("No images found.")
        return

    def stats(arr):
        arr_sorted = sorted(arr)
        n = len(arr_sorted)
        def pct(p):
            i = min(n - 1, max(0, int(math.floor(p * (n - 1)))))
            return arr_sorted[i]
        return {
            "min": arr_sorted[0],
            "p10": pct(0.10),
            "p50": pct(0.50),
            "p90": pct(0.90),
            "max": arr_sorted[-1],
        }

    w_stats = stats(widths)
    h_stats = stats(heights)
    ar_stats = stats(aspect_ratios)

    print(f"Dataset: {DATASET_DIR}")
    print(f"Images scanned: {len(widths)} (bad/unreadable: {bad_files}, total candidates: {total_files})\n")

    print("Width stats (px): ", w_stats)
    print("Height stats (px):", h_stats)
    print("Aspect ratio stats (w/h):", {k: round(v, 3) for k, v in ar_stats.items()})

    print("\nPer-class summary (count, median w/h):")
    for clazz, info in per_class.items():
        if info["count"] == 0:
            print(f"{clazz:>12}: 0")
            continue
        ar_med = sorted(info["ar"])[len(info["ar"]) // 2]
        print(f"{clazz:>12}: {info['count']:>6}  median_ar={ar_med:.3f}")

if __name__ == "__main__":
    main()
