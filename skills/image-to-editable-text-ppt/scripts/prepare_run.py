#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

from normalize_inputs import normalize_inputs
from paddle_ocr import PaddleOCRClient
from textppt_common import load_paddle_token, page_dirs, read_json, write_json


TEXT_LABELS = {"text", "paragraph_title", "vision_footnote", "header", "footer", "number"}


def _clamp_box(box: list[float], width: int, height: int) -> list[int]:
    x1, y1, x2, y2 = box
    left = max(0, min(width - 1, int(round(x1))))
    top = max(0, min(height - 1, int(round(y1))))
    right = max(left + 1, min(width, int(round(x2))))
    bottom = max(top + 1, min(height, int(round(y2))))
    return [left, top, right - left, bottom - top]


def _luminance(rgb: np.ndarray | list[float]) -> float:
    red, green, blue = (float(value) / 255.0 for value in rgb)
    values = []
    for value in (red, green, blue):
        values.append(value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]


def _contrast(a: np.ndarray | list[float], b: np.ndarray | list[float]) -> float:
    first, second = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (first + 0.05) / (second + 0.05)


def _estimate_color(array: np.ndarray, box: list[int]) -> tuple[str, float]:
    x, y, width, height = box
    image_h, image_w = array.shape[:2]
    crop = array[y : y + height, x : x + width].reshape(-1, 3).astype(np.float32)
    margin = max(3, int(round(min(width, height) * 0.2)))
    rx1, ry1 = max(0, x - margin), max(0, y - margin)
    rx2, ry2 = min(image_w, x + width + margin), min(image_h, y + height + margin)
    ring = array[ry1:ry2, rx1:rx2]
    inner_x1, inner_y1 = x - rx1, y - ry1
    ring_mask = np.ones(ring.shape[:2], dtype=bool)
    ring_mask[inner_y1 : inner_y1 + height, inner_x1 : inner_x1 + width] = False
    ring_pixels = ring[ring_mask]
    background = np.median(ring_pixels, axis=0) if len(ring_pixels) else np.median(crop, axis=0)
    distances = np.linalg.norm(crop - background, axis=1)
    threshold = max(24.0, float(np.percentile(distances, 70)))
    candidates = crop[distances >= threshold]
    if len(candidates) >= 3:
        foreground = np.median(candidates, axis=0)
    else:
        black = np.array([0, 0, 0], dtype=np.float32)
        white = np.array([255, 255, 255], dtype=np.float32)
        foreground = black if _contrast(black, background) >= _contrast(white, background) else white
    foreground = np.clip(np.rint(foreground), 0, 255).astype(np.uint8)
    return "".join(f"{int(value):02X}" for value in foreground), round(_contrast(foreground, background), 2)


def _alignment(box: list[int], page_width: int) -> str:
    x, _, width, _ = box
    center = (x + width / 2) / page_width
    if abs(center - 0.5) <= 0.08:
        return "center"
    if x / page_width >= 0.55 and width / page_width <= 0.4:
        return "right"
    return "left"


def pruned_result_to_ocr(pruned: dict[str, Any], source: str | Path, *, slide_width_in: float) -> dict:
    source = Path(source)
    with Image.open(source) as image:
        rgb = image.convert("RGB")
        width, height = rgb.size
        array = np.asarray(rgb)
    scale_x = width / float(pruned.get("width") or width)
    scale_y = height / float(pruned.get("height") or height)
    slide_height_in = slide_width_in * height / width
    entries: list[dict[str, Any]] = []
    for block in pruned.get("parsing_res_list", []):
        if block.get("block_label") not in TEXT_LABELS:
            continue
        text = str(block.get("block_content") or "").strip()
        bbox = block.get("block_bbox")
        if not text or not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
            continue
        x1, y1, x2, y2 = (float(value) for value in bbox)
        box = _clamp_box([x1 * scale_x, y1 * scale_y, x2 * scale_x, y2 * scale_y], width, height)
        line_count = max(1, text.count("\n") + 1)
        box_height_pt = box[3] / height * slide_height_in * 72
        font_pt = max(6.0, min(96.0, box_height_pt / line_count * 0.72))
        color_hex, contrast = _estimate_color(array, box)
        confidence = block.get("score", block.get("confidence", 1.0))
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 1.0
        entries.append(
            {
                "id": f"T{len(entries) + 1:03d}",
                "text": text,
                "box_px": box,
                "confidence": round(confidence, 4),
                "font_pt": round(font_pt, 2),
                "color_hex": color_hex,
                "color_contrast": contrast,
                "alignment": _alignment(box, width),
                "block_label": str(block.get("block_label")),
            }
        )
    entries.sort(key=lambda item: (item["box_px"][1], item["box_px"][0]))
    for index, entry in enumerate(entries, start=1):
        entry["id"] = f"T{index:03d}"
    return {
        "schema_version": 1,
        "backend": "paddleocr-vl",
        "source": {"width_px": width, "height_px": height},
        "entries": entries,
    }


def build_mask(ocr: dict, destination: str | Path, *, margin_px: int = 6) -> None:
    width = int(ocr["source"]["width_px"])
    height = int(ocr["source"]["height_px"])
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for entry in ocr.get("entries", []):
        x, y, box_width, box_height = entry["box_px"]
        left = max(0, x - margin_px)
        top = max(0, y - margin_px)
        right = min(width - 1, x + box_width + margin_px)
        bottom = min(height - 1, y + box_height + margin_px)
        draw.rectangle((left, top, right, bottom), fill=255)
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    mask.save(destination)


def draw_overlay(source: Path, ocr: dict, destination: Path) -> None:
    with Image.open(source) as image:
        overlay = image.convert("RGB")
    draw = ImageDraw.Draw(overlay)
    for entry in ocr.get("entries", []):
        x, y, width, height = entry["box_px"]
        draw.rectangle((x, y, x + width, y + height), outline=(255, 0, 0), width=2)
        draw.text((x + 2, y + 2), entry["id"], fill=(255, 0, 0))
    overlay.save(destination)


def clean_base_prompt(page_id: str, attempt: int = 1) -> str:
    strict = " The white mask is deliberately expanded; remove every glyph edge, outline, shadow, glow, and watermark inside it." if attempt > 1 else ""
    return f"""Edit the first image, which is slide {page_id}. The second image is a binary guide mask: white marks all text that must be removed and black marks content to preserve.{strict}

Create a text-free clean base with exactly the same pixel dimensions and aspect ratio as the source. Remove every visible letter, number, punctuation mark, word, label, caption, title, footer, and watermark from the masked regions. Reconstruct the natural background beneath the removed text.

Preserve every non-text element exactly: canvas, layout, photographs, illustrations, charts, diagrams, icons, lines, shapes, object positions, object sizes, colors, gradients, lighting, textures, borders, and whitespace. Do not move, resize, recolor, simplify, restyle, add, or remove any non-text object. Do not add replacement text or pseudo-text. Output only the cleaned slide image.
"""


def prepare_run(inputs: list[str | Path], run_dir: str | Path, *, token: str, dpi: int = 144) -> dict:
    run_dir = Path(run_dir).expanduser().resolve()
    if (run_dir / "run.json").exists():
        manifest = read_json(run_dir / "run.json")
        recorded_inputs: list[str] = []
        for page in manifest.get("pages", []):
            value = str(page.get("source_input", ""))
            if value and value not in recorded_inputs:
                recorded_inputs.append(value)
        requested_inputs = [str(Path(value).expanduser().resolve()) for value in inputs]
        if recorded_inputs != requested_inputs:
            raise ValueError("Existing run inputs do not match the requested inputs.")
    else:
        manifest = normalize_inputs(inputs, run_dir, dpi=dpi)
    client = PaddleOCRClient(token)
    for page_dir in page_dirs(run_dir):
        ocr_path = page_dir / "ocr.json"
        if ocr_path.exists():
            ocr = read_json(ocr_path)
        else:
            pruned = client.recognize(page_dir / "source.png")
            ocr = pruned_result_to_ocr(pruned, page_dir / "source.png", slide_width_in=manifest["slide_width_in"])
            write_json(ocr_path, ocr)
        if not (page_dir / "text-mask.png").exists():
            build_mask(ocr, page_dir / "text-mask.png")
        if not (page_dir / "ocr-overlay.png").exists():
            draw_overlay(page_dir / "source.png", ocr, page_dir / "ocr-overlay.png")
        if not (page_dir / "clean-base-prompt.md").exists():
            (page_dir / "clean-base-prompt.md").write_text(clean_base_prompt(page_dir.name), encoding="utf-8")
        if not ocr["entries"]:
            if not (page_dir / "clean_base.png").exists():
                shutil.copy2(page_dir / "source.png", page_dir / "clean_base.png")
            if not (page_dir / "clean-base-check.json").exists():
                write_json(
                    page_dir / "clean-base-check.json",
                    {"schema_version": 1, "passed": True, "attempt": 0, "residual_count": 0, "next_action": "build"},
                )
    manifest = read_json(run_dir / "run.json")
    manifest["stage"] = "needs_clean_bases"
    write_json(run_dir / "run.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize inputs, call PaddleOCR, and prepare text-removal artifacts.")
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--dpi", type=int, default=144)
    args = parser.parse_args()
    token = load_paddle_token()
    if not token:
        raise SystemExit("Missing PaddleOCR token. Set PADDLE_OCR_TOKEN or run configure_token.py.")
    manifest = prepare_run(args.inputs, args.run_dir, token=token, dpi=args.dpi)
    print(f"Prepared {len(manifest['pages'])} page(s). Next: generate clean_base.png for each page.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
