import os, random, shutil

base_dir = "dataset"
images_dir = os.path.join(base_dir, "images")
labels_dir = os.path.join(base_dir, "labels")

train_ratio = 0.8

images = [f for f in os.listdir(images_dir) if f.lower().endswith((".jpg", ".png"))]
random.shuffle(images)

split_index = int(len(images) * train_ratio)
train_images = images[:split_index]
val_images = images[split_index:]

def copy_files(image_list, subset):
    for f in image_list:
        name, _ = os.path.splitext(f)
        lbl = f"{name}.txt"
        os.makedirs(os.path.join(base_dir, "images", subset), exist_ok=True)
        os.makedirs(os.path.join(base_dir, "labels", subset), exist_ok=True)

        shutil.copy(os.path.join(images_dir, f), os.path.join(base_dir, "images", subset, f))
        shutil.copy(os.path.join(labels_dir, lbl), os.path.join(base_dir, "labels", subset, lbl))

copy_files(train_images, "train")
copy_files(val_images, "val")
