from keras.utils import image_dataset_from_directory

def get_dataset(dir, size, batch_size=32):
    train_ds = image_dataset_from_directory(
        f"{dir}/train",
        image_size=size,
        batch_size=batch_size,
        seed=42,
        label_mode="int",
    )

    val_ds = image_dataset_from_directory(
        f"{dir}/val",
        image_size=size,
        batch_size=batch_size,
        class_names=train_ds.class_names,
        label_mode="int",
        shuffle=False,
    )
    return train_ds, val_ds


