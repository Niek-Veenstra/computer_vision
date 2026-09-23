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
python -m dataset.util.prepare_classifier_dataset
```

De huidige annotaties leveren 808 trainingsuitsneden en 202 validatie-uitsneden op. Alle 15 klassen hebben voorbeelden in beide sets. Uitsneden uit dezelfde bronafbeelding kunnen wel in beide sets terechtkomen; validatiescores meten daardoor niet betrouwbaar hoe het model op volledig nieuwe bronafbeeldingen presteert. Het oudere script `src/dataset/util/crop_from_labelstudio.py` maakt een andere, ongesplitste map (`new_symbols_operators_dataset/`). **Let op:** dat script verwijdert zijn uitvoermap eerst als die al bestaat.

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

### Visueel prestatiedashboard

Het Streamlit-dashboard evalueert het huidige eindmodel en toont accuracy, balanced accuracy, macro-F1, precision en recall per klasse, normaliseerbare confusion matrices voor training en validatie, de verkeerd geclassificeerde afbeeldingen en inference op een uitsnede. De dataset-tab toont de klassebalans als cirkeldiagram en tabel voor de trainingsset, validatieset of beide samen. De learning-curve-tab visualiseert experimenten met verschillende hoeveelheden trainingsdata. In de inference-tab kun je direct uit relevante projectmappen kiezen of zelf een bestand uploaden:

```powershell
python -m streamlit run src/symbol_classifier/dashboard.py
```

Nieuwe trainingen schrijven daarnaast `history.csv` en TensorBoard-logs onder `runs/classifier/<tijdstip>/`. Het dashboard toont de curves van de laatste run. Voor het volledige TensorBoard-overzicht gebruik je:

```powershell
python -m tensorboard.main --logdir runs/classifier
```

### Learning-curve-experiment

Het learning-curve-experiment traint steeds een nieuw model op 25%, 50%, 75% en 100% van de trainingsset. Het gebruikt standaard drie seeds en houdt de volledige validatieset voor iedere run gelijk. De selectie gebeurt per klasse en is binnen iedere seed genest: de kleinere subset maakt steeds deel uit van de grotere subset. Daardoor meet het experiment vooral het effect van de totale hoeveelheid trainingsdata terwijl de klasseverhouding ongeveer gelijk blijft.

Controleer eerst de aantallen zonder modellen te trainen:

```powershell
python -m symbol_classifier.experiments.learning_curve --dry-run
```

Start daarna het volledige experiment met twaalf trainingen:

```powershell
python -m symbol_classifier.experiments.learning_curve
```

De resultaten komen in `runs/learning_curve/<tijdstip>/`. `results.csv` bevat de algemene metrics, `per_class.csv` bevat precision, recall en F1 per klasse en iedere submap bevat de trainingshistorie en TensorBoard-logs. Individuele modellen worden standaard niet bewaard. Voeg `--save-models` toe als die ook nodig zijn. Een onderbroken experiment kan met `--output-dir runs/learning_curve/<tijdstip>` worden hervat; reeds voltooide combinaties worden dan overgeslagen.

De learning-curve-tab van het dashboard leest automatisch het nieuwste resultaatbestand. De huidige train- en validatie-uitsneden komen wel uit dezelfde twee bronafbeeldingen. Het experiment meet daardoor interne verbetering op deze afbeeldingen en nog geen generalisatie naar nieuw handschrift of nieuwe foto’s.

De klasseverdeling van de actuele trainingsdataset (`symbols_and_operators/classifier/`) kun je vanuit de projecthoofdmap zo bekijken:

```powershell
python -m dataset.analysis.class_distribution
```

### Mogelijke verbeteringen aan de classifier

De volgende punten zijn geschikte experimenten om de prestaties en generalisatie van het huidige model te verbeteren:

1. **Behoud de beeldverhouding van uitsneden.** De datalader schaalt iedere uitsnede direct naar 128 × 128 pixels. Daardoor worden smalle symbolen zoals `1` en brede symbolen zoals `=` vervormd. Vul de uitsnede eerst aan tot een vierkant met de achtergrondkleur en verklein hem daarna.
2. **Voeg meer onafhankelijke bronafbeeldingen toe.** De huidige 1.010 uitsneden komen uit slechts twee bronafbeeldingen. Nieuwe afbeeldingen voegen variatie toe in handschrift, pennen, belichting en papier. Dit levert waarschijnlijk de grootste verbetering op en maakt een validatieset per bronafbeelding mogelijk.
3. **Experimenteer met `GlobalAveragePooling2D`.** De huidige `Flatten()` zet de laatste feature maps om in veel invoerwaarden voor de dense laag, waardoor een groot deel van de modelgewichten daar zit en het risico op overfitting toeneemt. Vergelijk deze architectuur met een variant die `GlobalAveragePooling2D()` gebruikt.
4. **Voeg lichte helderheids- en contrastvariatie toe.** Kleine variaties maken het model minder gevoelig voor scans en wisselende belichting. Houd de grenzen klein, zodat de inkt zichtbaar en het label geldig blijft.
5. **Bied klassen evenwichtiger aan tijdens training.** Klassegewichten corrigeren de loss, maar vaak voorkomende klassen worden nog steeds vaker aan het model getoond. Vergelijk de huidige aanpak met balanced sampling of extra augmentatie voor minder voorkomende klassen.

Een logisch eerste experiment combineert ongeveer 10% extra ruimte rond ieder begrenzingskader, behoud van de beeldverhouding en een willekeurige rotatie van maximaal 5 graden. Pas augmentatie alleen op de trainingsset toe. Gebruik geen horizontale of verticale spiegeling en vermijd grote rotaties, omdat daarmee de betekenis van symbolen kan veranderen. Houd de bestaande validatieset ongewijzigd tijdens een vergelijking, zodat het effect van iedere aanpassing meetbaar blijft.

`dataset.analysis.duplicate_detection` en `dataset.analysis.image_sizes_aspect_ratios` gebruiken nog de oudere, ongesplitste map `new_symbols_operators_dataset/` als invoer.
