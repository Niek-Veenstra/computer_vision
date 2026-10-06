# AI Scanner Client

Lokale Raspberry Pi-client voor symboolherkenning en communicatie met de scanner-API.

## Installatie

Installeer alleen de classifierondersteuning met:

```powershell
uv sync --extra tensorflow
```

Installeer de volledige YOLO → CNN-pipeline met:

```powershell
uv sync --extra pipeline
```

## Model selecteren

Deployable modellen staan als bundles direct onder `models/`. Vernieuw de registry,
bekijk de geldige bundles en selecteer expliciet een model:

```powershell
uv run ai-scanner-client models refresh
uv run ai-scanner-client models select cnn_v1-baseline
```

De selectie wordt lokaal bewaard en nooit automatisch vervangen door een nieuwere run.

## Inference

Classificeer één al uitgesneden symbool:

```powershell
uv run ai-scanner-client predict path/to/symbol.png
```

Detecteer en classificeer alle symbolen op een volledige pagina:

```powershell
uv run ai-scanner-client predict-page path/to/page.jpg
```

De confidence-drempel komt standaard uit het modelmanifest. Een tijdelijke override kan
zonder het manifest te wijzigen:

```powershell
uv run ai-scanner-client predict-page path/to/page.jpg --confidence 0.4
```

Leg op een Raspberry Pi direct één cameraframe vast en voer daar de volledige pipeline
op uit met:

```powershell
uv run ai-scanner-client predict-camera
```

Deze opdracht gebruikt standaard `PI_CLIENT_CAMERA_BACKEND=picamera2` en de camera-,
resolutie- en warmupinstellingen uit `.env`. De camera wordt geopend, één keer op
volledige ingestelde resolutie getoond en ook bij een inferencefout weer gesloten.
Plaats één horizontale reeks volledig binnen het groene kader. Druk op spatie of Enter
om alleen het kader vast te leggen, of op Escape om te annuleren. De tijdelijke crop
wordt na afloop verwijderd. Gebruik `--no-preview` voor een directe headless capture.

De Textual-app heeft daarnaast bij **Sequence scanner** een knop **Open camera
preview**. Het resultaat verschijnt als een van links naar rechts opgebouwde sequence,
terwijl de JSON-uitvoer ook alle losse boxes en confidences behoudt. De breedte en
hoogte van het kader zijn instelbaar met
`PI_CLIENT_PREVIEW_GUIDE_WIDTH_RATIO` en
`PI_CLIENT_PREVIEW_GUIDE_HEIGHT_RATIO`.

De JSON-uitvoer bevat de gebruikte classifier- en detectorarchitectuur en run, de
afbeeldingsafmetingen en per detectie de bounding box, detector-confidence en
classificatievoorspelling.

Een pipelinebundle gebruikt dezelfde classifiergegevens als een gewone bundle en
voegt een detectorsectie aan `manifest.json` toe:

```json
{
  "detector": {
    "format": "ultralytics",
    "architecture": "yolo11n",
    "runId": "symbol-detector4",
    "modelFile": "detector.pt",
    "confidenceThreshold": 0.25,
    "imageSize": 960,
    "maxDetections": 500,
    "modelSha256": "<sha256>"
  }
}
```

Het detectorbestand moet, net als het Keras-model en de class mapping, in dezelfde
directe bundlemap staan.
