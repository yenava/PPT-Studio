#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

from textppt_common import write_json


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
PRESENTATION_EXTENSIONS = {".ppt", ".pptx"}


def _save_rgb(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        ImageOps.exif_transpose(image).convert("RGB").save(destination, "PNG")


def _render_pdf(pdf: Path, output_dir: Path, dpi: int) -> list[Path]:
    executable = shutil.which("pdftoppm")
    if not executable:
        raise RuntimeError("PDF input requires pdftoppm (Poppler), but it was not found on PATH.")
    prefix = output_dir / "rendered"
    subprocess.run(
        [executable, "-png", "-r", str(dpi), str(pdf), str(prefix)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    outputs = sorted(output_dir.glob("rendered-*.png"))
    if not outputs:
        raise RuntimeError(f"PDF renderer produced no pages: {pdf}")
    return outputs


def _presentation_to_pdf(source: Path, output_dir: Path) -> Path:
    executable = shutil.which("soffice") or shutil.which("libreoffice")
    if not executable:
        raise RuntimeError("PPT/PPTX input requires LibreOffice (`soffice`) on PATH.")
    subprocess.run(
        [executable, "--headless", "--convert-to", "pdf", "--outdir", str(output_dir), str(source)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    output = output_dir / f"{source.stem}.pdf"
    if not output.exists():
        raise RuntimeError(f"LibreOffice did not create the expected PDF: {output}")
    return output


def _expanded_sources(source: Path, scratch: Path, dpi: int) -> list[Path]:
    suffix = source.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return [source]
    if suffix == ".pdf":
        return _render_pdf(source, scratch, dpi)
    if suffix in PRESENTATION_EXTENSIONS:
        pdf = _presentation_to_pdf(source, scratch)
        return _render_pdf(pdf, scratch / "slides", dpi)
    raise ValueError(f"Unsupported input type: {source}")


def normalize_inputs(
    inputs: list[str | Path],
    run_dir: str | Path,
    *,
    dpi: int = 144,
    slide_width_in: float = 13.333,
) -> dict:
    run_dir = Path(run_dir).expanduser().resolve()
    if (run_dir / "run.json").exists():
        raise FileExistsError(f"Run already exists: {run_dir}")
    pages_dir = run_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    pages: list[dict] = []
    expected_ratio: float | None = None

    with tempfile.TemporaryDirectory(prefix="textppt-normalize-") as tmp:
        scratch_root = Path(tmp)
        for source_index, raw in enumerate(inputs, start=1):
            source = Path(raw).expanduser().resolve()
            if not source.exists() or not source.is_file():
                raise FileNotFoundError(f"Input not found: {source}")
            scratch = scratch_root / f"input-{source_index:03d}"
            scratch.mkdir(parents=True)
            for source_page_index, rendered in enumerate(_expanded_sources(source, scratch, dpi), start=1):
                page_id = f"page_{len(pages) + 1:03d}"
                output = pages_dir / page_id / "source.png"
                _save_rgb(rendered, output)
                with Image.open(output) as image:
                    width, height = image.size
                ratio = width / height
                if expected_ratio is None:
                    expected_ratio = ratio
                elif abs(ratio - expected_ratio) / expected_ratio > 0.01:
                    raise ValueError("All input pages must use the same aspect ratio (within 1%).")
                pages.append(
                    {
                        "id": page_id,
                        "source_input": str(source),
                        "source_page_index": source_page_index,
                        "width_px": width,
                        "height_px": height,
                    }
                )

    if not pages:
        raise ValueError("No pages were produced from the inputs.")
    first = pages[0]
    slide_height_in = slide_width_in * first["height_px"] / first["width_px"]
    manifest = {
        "schema_version": 1,
        "stage": "normalized",
        "slide_width_in": round(slide_width_in, 6),
        "slide_height_in": round(slide_height_in, 6),
        "dpi": dpi,
        "pages": pages,
    }
    write_json(run_dir / "run.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize images, PDFs, or PowerPoint files into page PNGs.")
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--dpi", type=int, default=144)
    args = parser.parse_args()
    manifest = normalize_inputs(args.inputs, args.run_dir, dpi=args.dpi)
    print(f"Normalized {len(manifest['pages'])} page(s) into {Path(args.run_dir).resolve()}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

