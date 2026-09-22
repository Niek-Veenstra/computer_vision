# Machine learning voor wiskundesymbolen

Dit project bevat twee modellen voor beelden met wiskundige symbolen:

1. Een **YOLO11n-detector** vindt symbolen in een afbeelding. De detectiedataset heeft één klasse: `symbol`.
2. Een **eigen CNN-classificatiemodel** herkent een uitgesneden symbool als een van 15 klassen: `*`, `+`, `-`, `/`, `0` tot en met `9` en `=`.

De modellen hebben aparte datasets en scripts. De detector levert begrenzingskaders; de classifier werkt op losse uitsneden. Er is momenteel geen script dat beide modellen automatisch achter elkaar uitvoert.

## Installatie

Voer de opdrachten uit vanuit de hoofdmap van dit project. Onderstaand voorbeeld maakt een virtuele omgeving met Python 3.12 aan:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
```

`pyproject.toml` is de enige bron voor de Python-dependencies: PyTorch, torchvision, Ultralytics, TensorFlow, OpenCV, NumPy, Pillow en Matplotlib. De bewerkbare installatie installeert die dependencies en maakt het pakket `symbol_classifier` onder `src/` importeerbaar.

De `src`-indeling en package discovery staan ook in `pyproject.toml` (`[tool.setuptools.packages.find]`). Zo zijn imports zoals `from symbol_classifier.dataset import get_dataset` mogelijk na `python -m pip install -e .`. Een map als `src/myapp.egg-info/` is gegenereerde installatiemetadata, geen broncode; setuptools kan die bij een volgende installatie opnieuw aanmaken. De map hoort daarom niet in Git en wordt door `.gitignore` genegeerd.

## Bestanden en datasets

| Pad | Inhoud |
| --- | --- |
| `source_images/` | Oorspronkelijke afbeeldingen van wiskundige opgaven. |
| `clipped_images/` | Handmatig uitgesneden afbeeldingen. |
| `dataset_yolo/` | YOLO-detectiedataset met `images/train`, `images/val`, bijbehorende `labels/` en `dataset.yaml`. |
| `symbols_and_operators/` | Afbeeldingen en YOLO-annotaties voor de 15 afzonderlijke symboolklassen. |
| `src/dataset/` | Script voor het maken van uitsneden uit annotaties en scripts voor datasetanalyse. |
| `src/training/` | Scripts voor handmatig uitsnijden en een willekeurige 80/20 train/validatieverdeling. |
| `src/yolo/` | Training en inferentie met YOLO. |
| `src/symbol_classifier/` | CNN-architectuur, datalader, training, inferentie en evaluatie. |
| `runs/detect/` | Opgeslagen YOLO-trainingsruns, grafieken en gewichten. |

De annotaties zijn tekstbestanden in YOLO-formaat: per object een klasse-index gevolgd door genormaliseerde `x_center y_center breedte hoogte`. `dataset_yolo/dataset.yaml` definieert de ene detectieklasse. `symbols_and_operators/classes.txt` en `symbols_and_operators/notes.json` definiëren de 15 classificatieklassen. `class_mapping.json` bevat de volgorde van de klassemappen die de classifier gebruikt.

## YOLO-detector

De bestaande run `runs/detect/symbol-detector4/` is getraind met `yolo11n.pt`, 100 epochs, afbeeldingen van 640 pixels en batchgrootte 16. Het beste gewicht staat in `runs/detect/symbol-detector4/weights/best.pt`; metrics en grafieken staan in dezelfde runmap.

Een nieuwe training kan vanuit de projecthoofdmap met de Ultralytics-CLI worden gestart:

```powershell
yolo detect train model=yolo11n.pt data=dataset_yolo/dataset.yaml epochs=100 imgsz=640 batch=16 name=symbol-detector
```

Een bestaande inferentiedemo staat in `src/yolo/yolo_inference.py`. Die leest één voorbeeldafbeelding, toont de detecties in een OpenCV-venster en schrijft `output.jpg`:

```powershell
python src/yolo/yolo_inference.py
```

Hiervoor is een grafische omgeving nodig. De afbeelding en het modelpad zijn in het script vastgelegd. Het trainingsscript `src/yolo/yolo_train.py` verwijst nog naar `dataset/dataset.yaml`, terwijl de huidige dataset onder `dataset_yolo/` staat. Het initialiseert YOLO ook zonder expliciet modelbestand. Pas beide punten aan voordat je dat script gebruikt.

## Eigen CNN-classifier

`src/dataset/util/prepare_classifier_dataset.py` maakt eerst uitsneden uit beide afbeeldingen en hun annotaties in `symbols_and_operators/images/` en `symbols_and_operators/labels/`. Daarna verdeelt het de uitsneden per klasse met een vaste seed in 80% training en 20% validatie. De uitvoer staat in `symbols_and_operators/classifier/train/class_<index>/` en `symbols_and_operators/classifier/val/class_<index>/`. De originele YOLO-bestanden blijven intact. De gegenereerde map staat niet in Git. Het voorbereidingsscript stopt als de uitvoermap al bestaat, zodat bestaande uitsneden niet worden overschreven.

```powershell
python src/dataset/util/prepare_classifier_dataset.py
```

De huidige annotaties leveren 808 trainingsuitsneden en 202 validatie-uitsneden op. Alle 15 klassen hebben voorbeelden in beide sets. Uitsneden uit dezelfde bronafbeelding kunnen wel in beide sets terechtkomen; validatiescores meten daardoor niet betrouwbaar hoe het model op volledig nieuwe bronafbeeldingen presteert. Het oudere script `src/dataset/util/crop_from_labelstudio.py` maakt een andere, ongesplitste map (`new_symbols_operators_dataset/`) voor de analysescripts. **Let op:** dat script verwijdert zijn uitvoermap eerst als die al bestaat.

Het CNN gebruikt RGB-afbeeldingen van 128 × 128 pixels, batchgrootte 32 en maximaal 25 epochs. Het berekent klassegewichten en gebruikt early stopping, een checkpoint en een lagere leersnelheid bij stagnerende validatie. De scripts schakelen CUDA voor dit model uit.

Wanneer de datamap aanwezig is, start de training met:

```powershell
python -m symbol_classifier.own_train
```

Dit schrijft `class_mapping.json`, `symbol_classifier.keras` (beste checkpoint) en `symbol_classifier_final.keras`. De `.keras`-bestanden worden lokaal opgeslagen en door Git genegeerd. Voor inferentie geef je een uitsnede als argument mee:

```powershell
python -m symbol_classifier.own_inference symbols_and_operators/classifier/val/class_5/b4b8af9d-IMG_2129_101.png
```

Evaluatie met `python -m symbol_classifier.assess` vereist ook `symbol_classifier_final.keras`. Het script schrijft `confusion_matrix.png` en toont een grafiek.

De scripts `src/dataset/analysis/` analyseren klasseverdeling, exacte dubbele bestanden, afbeeldingsgroottes en beeldverhoudingen in `new_symbols_operators_dataset/`.
