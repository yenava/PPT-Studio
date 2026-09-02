#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from paddle_ocr import PaddleOCRClient
from prepare_run import build_mask, clean_base_prompt, pruned_result_to_ocr
from textppt_common import intersection_over_smaller, load_paddle_token, read_json, write_json


def residual_entries(original_ocr: dict, clean_ocr: dict, *, overlap_threshold: float = 0.25) -> list[dict]:
    original_boxes = [entry["box_px"] for entry in original_ocr.get("entries", [])]
    residual: list[dict] = []
    for entry in clean_ocr.get("entries", []):
        if any(intersection_over_smaller(entry["box_px"], box) >= overlap_threshold for box in original_boxes):
            residual.append(entry)
    return residual


def check_dimensions(source: Path, clean_base: Path) -> tuple[int, int]:
    if not clean_base.exists():
        raise FileNotFoundError(f"Missing clean base: {clean_base}")
    with Image.open(source) as source_image, Image.open(clean_base) as clean_image:
        if source_image.size != clean_image.size:
            raise ValueError(
                f"Clean base dimensions {clean_image.size} do not match source dimensions {source_image.size}."
            )
        return source_image.size


def evaluate_page(
    page_dir: str | Path,
    clean_ocr: dict,
    *,
    attempt: int,
    overlap_threshold: float = 0.25,
) -> dict:
    page_dir = Path(page_dir)
    check_dimensions(page_dir / "source.png", page_dir / "clean_base.png")
    original = read_json(page_dir / "ocr.json")
    residual = residual_entries(original, clean_ocr, overlap_threshold=overlap_threshold)
    passed = not residual
    report = {
        "schema_version": 1,
        "passed": passed,
        "attempt": attempt,
        "residual_count": len(residual),
        "residual_entries": residual,
        "overlap_threshold": overlap_threshold,
        "next_action": "build" if passed else ("retry_image_edit" if attempt < 2 else "blocked"),
    }
    write_json(page_dir / "clean-base-ocr.json", clean_ocr)
    write_json(page_dir / "clean-base-check.json", report)
    if residual and attempt < 2:
        build_mask(original, page_dir / "retry-mask.png", margin_px=14)
        (page_dir / "retry-clean-base-prompt.md").write_text(
            clean_base_prompt(page_dir.name, attempt=2), encoding="utf-8"
        )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="OCR a clean base and verify that source text was removed.")
    parser.add_argument("page_dir")
    parser.add_argument("--attempt", type=int, choices=(1, 2), default=1)
    parser.add_argument("--overlap-threshold", type=float, default=0.25)
    args = parser.parse_args()
    page_dir = Path(args.page_dir).expanduser().resolve()
    token = load_paddle_token()
    if not token:
        raise SystemExit("Missing PaddleOCR token. Set PADDLE_OCR_TOKEN or run configure_token.py.")
    check_dimensions(page_dir / "source.png", page_dir / "clean_base.png")
    original = read_json(page_dir / "ocr.json")
    client = PaddleOCRClient(token)
    pruned = client.recognize(page_dir / "clean_base.png")
    clean_ocr = pruned_result_to_ocr(
        pruned,
        page_dir / "clean_base.png",
        slide_width_in=13.333,
    )
    report = evaluate_page(
        page_dir,
        clean_ocr,
        attempt=args.attempt,
        overlap_threshold=args.overlap_threshold,
    )
    print(
        f"{page_dir.name}: {'passed' if report['passed'] else report['next_action']} "
        f"(residual text blocks={report['residual_count']})."
    )
    return 0 if report["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

