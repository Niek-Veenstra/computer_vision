import own_model
from own_model.dataset import get_dataset;

TARGET_SIZE = (128, 128)
train_set,validation_set = get_dataset("new_symbols_operators_dataset",TARGET_SIZE)
model = own_model.build_cnn();
