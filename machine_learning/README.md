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

`src/dataset/util/crop_from_labelstudio.py` zet de YOLO-annotaties in `symbols_and_operators/` om naar losse afbeeldingen in `new_symbols_operators_dataset/class_<index>/`. **Let op:** het script verwijdert die uitvoermap eerst als die al bestaat.

Voor training verwacht `src/symbol_classifier/own_train.py` een aparte map `symbols_operators/` met daaronder `train/class_0/` tot en met `train/class_14/` en dezelfde klassemappen onder `val/`. Die map staat momenteel niet in de repository; de uitsneden moeten dus nog over deze mappen worden verdeeld. De datalader gebruikt in beide mappen nog een `validation_split` van 20%, waardoor niet alle bestanden uit `train/` en `val/` in een training terechtkomen.

Het CNN gebruikt RGB-afbeeldingen van 128 × 128 pixels, batchgrootte 32 en maximaal 25 epochs. Het berekent klassegewichten en gebruikt early stopping, een checkpoint en een lagere leersnelheid bij stagnerende validatie. De scripts schakelen CUDA voor dit model uit.

Wanneer de verwachte datamap aanwezig is, start de training met:

```powershell
python -m symbol_classifier.own_train
```

Dit schrijft `class_mapping.json`, `symbol_classifier.keras` (beste checkpoint) en `symbol_classifier_final.keras`. De `.keras`-bestanden staan momenteel niet in de repository. Evaluatie met `python -m symbol_classifier.assess` en inferentie met `python -m symbol_classifier.own_inference` vereisen `symbol_classifier_final.keras`. De inferentiedemo gebruikt bovendien een vast afbeeldingspad onder `new_symbols_operators_dataset/`; pas dat pad aan voor je eigen afbeelding. Evaluatie schrijft `confusion_matrix.png` en toont een grafiek.

De scripts `src/dataset/analysis/` analyseren klasseverdeling, exacte dubbele bestanden, afbeeldingsgroottes en beeldverhoudingen in `new_symbols_operators_dataset/`.
