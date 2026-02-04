from keras.utils import image_dataset_from_directory

TARGET_SIZE = (128, 128)

def get_dataset(dir, size, batch_size=32):
    train_ds = image_dataset_from_directory(
        dir,
        image_size=size,
        batch_size=batch_size,
        validation_split=0.2,
        subset="training",
        seed=42,
        label_mode="int",
    )

    val_ds = image_dataset_from_directory(
        dir,
        image_size=size,
        batch_size=batch_size,
        validation_split=0.2,
        subset="validation",
        seed=42,
        label_mode="int",
    )
    return train_ds, val_ds
