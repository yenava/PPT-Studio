#!/usr/bin/env python3
from pathlib import Path
import subprocess

import cv2
import numpy as np


RUN = Path("/Users/yanhui/Desktop/Projects/PPT-Designer/run-4pages")


def add_rect_mask(mask, box, pad=0):
    x, y, w, h = [int(v) for v in box]
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(mask.shape[1], x + w + pad)
    y2 = min(mask.shape[0], y + h + pad)
    mask[y1:y2, x1:x2] = 255


def add_ink_mask(src, mask, box, pad=2, include_white=False, dark_thresh=190):
    x, y, w, h = [int(v) for v in box]
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(src.shape[1], x + w + pad)
    y2 = min(src.shape[0], y + h + pad)
    roi = src[y1:y2, x1:x2]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    # Dark grey CJK text, orange accent text, and optional white text on dark ribbons.
    ink = (gray < dark_thresh) | ((saturation > 80) & (value > 110))
    if include_white:
        ink |= ((gray > 205) & (saturation < 70))
    ink = ink.astype(np.uint8) * 255
    kernel = np.ones((3, 3), np.uint8)
    ink = cv2.dilate(ink, kernel, iterations=2)
    ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, kernel, iterations=1)
    mask[y1:y2, x1:x2] = np.maximum(mask[y1:y2, x1:x2], ink)


def inpaint_page(page_id, ink_boxes, solid_boxes=None, radius=4):
    src = cv2.imread(str(RUN / f"pages/{page_id}/source.png"), cv2.IMREAD_COLOR)
    if src is None:
        raise FileNotFoundError(page_id)
    mask = np.zeros(src.shape[:2], dtype=np.uint8)
    for item in ink_boxes:
        if len(item) == 3:
            box, pad, white = item
            dark_thresh = 190
        else:
            box, pad, white, dark_thresh = item
        add_ink_mask(src, mask, box, pad=pad, include_white=white, dark_thresh=dark_thresh)
    for box, pad in solid_boxes or []:
        add_rect_mask(mask, box, pad=pad)
    repaired = cv2.inpaint(src, mask, radius, cv2.INPAINT_TELEA)
    out = RUN / f"pages/{page_id}/assets/clean-base-local.png"
    out.parent.mkdir(exist_ok=True)
    cv2.imwrite(str(out), repaired)


def main():
    subprocess.run(["python3", str(RUN / "make_page002_clean_base.py")], check=True)
    inpaint_page(
        "page_003",
        [
            ([18, 35, 950, 92], 4, False),
            ([1330, 30, 320, 42], 3, False),
            ([166, 166, 330, 86], 4, True, 70),
            ([696, 166, 370, 86], 4, True, 70),
            ([1238, 166, 310, 86], 4, True, 70),
            ([198, 324, 240, 64], 4, False),
            ([154, 426, 440, 88], 4, False),
            ([172, 570, 82, 52], 3, False),
            ([178, 616, 340, 82], 4, False),
            ([650, 298, 958, 50], 3, False),
            ([712, 352, 120, 348], 3, False),
            ([956, 718, 330, 34], 3, False),
            ([186, 796, 980, 74], 4, False),
        ],
        radius=4,
    )
    inpaint_page(
        "page_004",
        [
            ([42, 42, 890, 92], 4, False),
            ([1518, 28, 112, 44], 3, False),
            ([172, 190, 260, 54], 4, True, 70),
            ([958, 190, 330, 54], 4, True, 70),
            ([190, 286, 580, 52], 4, False),
            ([190, 362, 540, 52], 4, False),
            ([190, 438, 510, 82], 4, False),
            ([960, 286, 460, 52], 4, False),
            ([960, 362, 420, 52], 4, False),
            ([960, 438, 540, 52], 4, False),
            ([210, 600, 190, 110], 4, False),
            ([604, 600, 190, 110], 4, False),
            ([990, 600, 190, 110], 4, False),
            ([1382, 600, 210, 110], 4, False),
            ([240, 792, 1270, 62], 4, False),
        ],
        radius=4,
    )
    print("wrote ink-inpainted clean bases for pages 002-004")


if __name__ == "__main__":
    main()
