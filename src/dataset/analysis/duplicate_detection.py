import os
import hashlib
from collections import defaultdict

DATASET_DIR = "new_symbols_operators_dataset"
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

def file_hash(path: str, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def main():
    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(f"Dataset dir not found: {DATASET_DIR}")

    hash_to_paths = defaultdict(list)
    total = 0

    for cls in sorted(os.listdir(DATASET_DIR)):
        cls_path = os.path.join(DATASET_DIR, cls)
        if not os.path.isdir(cls_path):
            continue

        for fname in os.listdir(cls_path):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in VALID_EXT:
                continue

            path = os.path.join(cls_path, fname)
            if not os.path.isfile(path):
                continue

            total += 1
            try:
                h = file_hash(path)
                hash_to_paths[h].append(path)
            except Exception as e:
                print("Failed hashing:", path, "->", e)

    dup_groups = {h: paths for h, paths in hash_to_paths.items() if len(paths) > 1}
    dup_count = sum(len(paths) - 1 for paths in dup_groups.values())

    print(f"Dataset: {DATASET_DIR}")
    print(f"Files hashed: {total}")
    print(f"Duplicate groups: {len(dup_groups)}")
    print(f"Duplicate files (excluding originals): {dup_count}\n")

    shown = 0
    for h, paths in list(dup_groups.items())[:20]:
        print(f"Hash: {h}  (count={len(paths)})")
        for p in paths:
            print("  -", p)
        print()
        shown += 1

    if len(dup_groups) > 20:
        print(f"... and {len(dup_groups) - 20} more duplicate groups.")

if __name__ == "__main__":
    main()
