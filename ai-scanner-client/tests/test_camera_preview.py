from pathlib import Path

import numpy as np
from PIL import Image

from ai_scanner_client.camera.preview import GuidedCameraPreview, guide_box


class FakeCamera:
    name = "Preview camera"

    def read_frame(self) -> np.ndarray:
        frame = np.zeros((100, 200, 3), dtype=np.uint8)
        frame[..., 0] = 123
        return frame


class FakeCv2:
    COLOR_RGB2BGR = 1
    FONT_HERSHEY_SIMPLEX = 2
    LINE_AA = 3
    WND_PROP_VISIBLE = 4

    def __init__(self) -> None:
        self.destroyed = False

    def cvtColor(self, frame: np.ndarray, code: int) -> np.ndarray:
        assert code == self.COLOR_RGB2BGR
        return frame.copy()

    def rectangle(self, *args: object) -> None:
        pass

    def putText(self, *args: object) -> None:
        pass

    def imshow(self, title: str, frame: np.ndarray) -> None:
        assert title
        assert frame.shape == (100, 200, 3)

    def waitKey(self, delay: int) -> int:
        assert delay == 1
        return 32

    def getWindowProperty(self, title: str, property_id: int) -> float:
        return 1.0

    def destroyWindow(self, title: str) -> None:
        self.destroyed = True


def test_guide_box_is_centered() -> None:
    assert guide_box(200, 100, 0.8, 0.4) == (20, 30, 180, 70)


def test_guided_preview_saves_only_the_guide_crop(tmp_path: Path) -> None:
    destination = tmp_path / "capture.png"
    cv2 = FakeCv2()
    preview = GuidedCameraPreview(
        width_ratio=0.8,
        height_ratio=0.4,
        cv2_module=cv2,  # type: ignore[arg-type]
    )

    preview.capture(FakeCamera(), destination)  # type: ignore[arg-type]

    with Image.open(destination) as image:
        assert image.size == (160, 40)
        assert image.getpixel((0, 0)) == (123, 0, 0)
    assert cv2.destroyed is True
