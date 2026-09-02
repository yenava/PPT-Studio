#!/usr/bin/env python3
"""Compose a generated content image into a deterministic 16:9 PPT shell."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps


CANVAS_SIZE = (1920, 1080)
CONTENT_BOX = (104, 194, 1816, 964)
BACKGROUND = (248, 250, 252)
PAPER = (255, 255, 255)
INK = (31, 41, 51)
MUTED = (104, 116, 132)
LINE = (216, 222, 230)
ACCENT = (241, 90, 36)

FONT_FILES = {
    "黑体": "/System/Library/Fonts/STHeiti Medium.ttc",
    "微软雅黑": "/System/Library/Fonts/STHeiti Medium.ttc",
    "思源黑体": "/System/Library/Fonts/STHeiti Medium.ttc",
    "华文楷体": "/System/Library/Fonts/Supplemental/Kaiti.ttc",
    "宋体": "/System/Library/Fonts/Supplemental/Songti.ttc",
    "华文中宋": "/System/Library/Fonts/Supplemental/Songti.ttc",
    "苹方": "/System/Library/Fonts/STHeiti Medium.ttc",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--content", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--project", default="")
    parser.add_argument("--page-number", type=int, required=True)
    parser.add_argument("--page-count", type=int, required=True)
    parser.add_argument("--font", default="黑体")
    parser.add_argument("--manifest")
    parser.add_argument("--source-is-full-slide", action="store_true")
    return parser.parse_args()


def font_file(font_name: str) -> str:
    selected = FONT_FILES.get(font_name, FONT_FILES["黑体"])
    if Path(selected).exists():
        return selected
    return "/System/Library/Fonts/STHeiti Medium.ttc"


def load_font(font_name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(font_file(font_name), size=size)


def fitted_font(draw: ImageDraw.ImageDraw, text: str, font_name: str, max_width: int) -> ImageFont.FreeTypeFont:
    for size in range(58, 35, -2):
        candidate = load_font(font_name, size)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return load_font(font_name, 34)


def crop_full_slide_content(image: Image.Image) -> Image.Image:
    width, height = image.size
    return image.crop((int(width * 0.045), int(height * 0.19), int(width * 0.955), int(height * 0.90)))


def edge_mask(size: tuple[int, int], feather: int = 12) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    pixels = mask.load()
    for y in range(height):
        for x in range(width):
            distance = min(x, y, width - 1 - x, height - 1 - y)
            if distance < feather:
                pixels[x, y] = int(255 * max(0, distance) / feather)
    return mask


def normalize_outer_background(image: Image.Image) -> Image.Image:
    """Replace only the edge-connected near-white canvas with the shell background."""
    normalized = image.convert("RGB")
    width, height = normalized.size
    marked = normalized.copy()
    sentinel = (1, 2, 3)
    x_step = max(1, width // 32)
    y_step = max(1, height // 18)
    seeds = (
        [(x, 0) for x in range(0, width, x_step)]
        + [(x, height - 1) for x in range(0, width, x_step)]
        + [(0, y) for y in range(0, height, y_step)]
        + [(width - 1, y) for y in range(0, height, y_step)]
        + [(width - 1, height - 1)]
    )
    for seed in seeds:
        pixel = marked.getpixel(seed)
        if pixel != sentinel and min(pixel) >= 232:
            ImageDraw.floodfill(marked, seed, sentinel, thresh=24)
    red, green, blue = marked.split()
    red_mask = red.point(lambda value: 255 if value == sentinel[0] else 0)
    green_mask = green.point(lambda value: 255 if value == sentinel[1] else 0)
    blue_mask = blue.point(lambda value: 255 if value == sentinel[2] else 0)
    outer_background = ImageChops.multiply(ImageChops.multiply(red_mask, green_mask), blue_mask)
    normalized.paste(BACKGROUND, (0, 0, width, height), outer_background)
    return normalized


def prepare_content(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = normalize_outer_background(image)
    contained = ImageOps.contain(image, size, method=Image.Resampling.LANCZOS)
    board = Image.new("RGB", size, BACKGROUND)
    board.paste(contained, ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2))
    return board


def draw_background(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((0, 0, CANVAS_SIZE[0], CANVAS_SIZE[1]), fill=BACKGROUND)


def compose(args: argparse.Namespace) -> dict:
    content_path = Path(args.content)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    content_source = Image.open(content_path)
    original_size = content_source.size
    if args.source_is_full_slide:
        content_source = crop_full_slide_content(content_source)

    canvas = Image.new("RGB", CANVAS_SIZE, BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw_background(draw)

    left, top, right, bottom = CONTENT_BOX
    content_size = (right - left, bottom - top)
    content = prepare_content(content_source, content_size)
    canvas.paste(content, (left, top), edge_mask(content_size))

    # Repaint the fixed chrome after content placement so generated pixels can never drift into it.
    draw.rectangle((0, 0, 1920, 184), fill=BACKGROUND)
    draw.rectangle((0, 970, 1920, 1080), fill=BACKGROUND)
    badge = (104, 68, 164, 128)
    draw.rounded_rectangle(badge, radius=5, fill=ACCENT)
    badge_font = load_font(args.font, 28)
    page_text = f"{args.page_number:02d}"
    page_bounds = draw.textbbox((0, 0), page_text, font=badge_font)
    draw.text(
        ((badge[0] + badge[2] - page_bounds[2]) / 2, (badge[1] + badge[3] - page_bounds[3]) / 2 - 2),
        page_text,
        font=badge_font,
        fill=PAPER,
    )

    title_font = fitted_font(draw, args.title, args.font, 1460)
    draw.text((192, 64), args.title, font=title_font, fill=INK)
    draw.rounded_rectangle((192, 148, 254, 154), radius=3, fill=ACCENT)

    footer_y = 1008
    draw.line((104, footer_y, 1816, footer_y), fill=LINE, width=2)
    footer_font = load_font(args.font, 18)
    project_label = args.project.strip() or "PPT Studio"
    draw.text((104, 1028), project_label, font=footer_font, fill=MUTED)
    counter = f"{args.page_number:02d} / {args.page_count:02d}"
    counter_width = draw.textbbox((0, 0), counter, font=footer_font)[2]
    draw.text((1816 - counter_width, 1028), counter, font=footer_font, fill=INK)
    draw.rounded_rectangle((1784, 1005, 1816, 1011), radius=3, fill=ACCENT)

    canvas.save(output_path, format="PNG", optimize=True)
    manifest = {
        "mode": "hybrid-code-shell",
        "canvas": {"width": 1920, "height": 1080},
        "contentBox": {"x": left, "y": top, "width": content_size[0], "height": content_size[1]},
        "contentSource": str(content_path),
        "contentSourceSize": {"width": original_size[0], "height": original_size[1]},
        "background": "#F8FAFC",
        "outerBackgroundNormalized": True,
        "title": args.title,
        "font": args.font,
        "pageNumber": args.page_number,
        "pageCount": args.page_count,
    }
    if args.manifest:
        manifest_path = Path(args.manifest)
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    args = parse_args()
    manifest = compose(args)
    print(json.dumps(manifest, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
