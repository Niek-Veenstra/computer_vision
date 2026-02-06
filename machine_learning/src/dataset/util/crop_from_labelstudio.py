import os
import cv2
import shutil

YOLO_IMAGES = "symbols_and_operators/images"
YOLO_LABELS = "symbols_and_operators/labels"
OUT_DIR = "new_symbols_operators_dataset"

if os.path.exists(OUT_DIR):
    shutil.rmtree(OUT_DIR)
os.makedirs(OUT_DIR)

def yolo_to_xyxy(cls, x, y, w, h, img_w, img_h):
    """YOLO coords -> pixel coords"""
    x_center = x * img_w
    y_center = y * img_h
    box_w = w * img_w
    box_h = h * img_h

    x1 = int(x_center - box_w / 2)
    y1 = int(y_center - box_h / 2)
    x2 = int(x_center + box_w / 2)
    y2 = int(y_center + box_h / 2)
    return cls, x1, y1, x2, y2

for label_file in os.listdir(YOLO_LABELS):
    if not label_file.endswith(".txt"):
        continue

    image_name = label_file.replace(".txt", ".png")
    image_path = os.path.join(YOLO_IMAGES, image_name)

    if not os.path.exists(image_path):
        image_name = image_name.replace(".png", ".jpg")
        image_path = os.path.join(YOLO_IMAGES, image_name)

    img = cv2.imread(image_path)
    if img is None:
        print("Could not read", image_path)
        continue

    h, w = img.shape[:2]

    with open(os.path.join(YOLO_LABELS, label_file)) as f:
        lines = f.readlines()

    for idx, line in enumerate(lines):
        parts = list(map(float, line.split()))
        cls = int(parts[0])
        x, y, bw, bh = parts[1:]

        cls, x1, y1, x2, y2 = yolo_to_xyxy(cls, x, y, bw, bh, w, h)

        crop = img[y1:y2, x1:x2]

        if crop.size == 0:
            print("Empty crop in", label_file)
            continue

        class_dir = os.path.join(OUT_DIR, f"class_{cls}")
        os.makedirs(class_dir, exist_ok=True)
        out_path = os.path.join(class_dir, f"{label_file[:-4]}_{idx}.png")
        cv2.imwrite(out_path, crop)

print("Dataset ready in:", OUT_DIR)
