#!/usr/bin/env python3
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


RUN = Path("/Users/yanhui/Desktop/Projects/PPT-Designer/run-4pages")
W, H = 1672, 941

SLATE = (79, 92, 104, 255)
SLATE_DARK = (70, 83, 95, 255)
ORANGE = (242, 90, 24, 255)
BG = (247, 248, 250, 255)
CARD = (252, 253, 254, 255)
BORDER = (220, 225, 230, 255)
PALE = (232, 235, 238, 255)
PALE_ORANGE = (255, 232, 222, 255)
LINE = (170, 178, 186, 255)


def layer() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def shadowed_round_rect(base, box, r=14, fill=CARD, outline=BORDER, shadow_alpha=38):
    x1, y1, x2, y2 = box
    sh = layer()
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([x1 + 8, y1 + 10, x2 + 8, y2 + 12], radius=r, fill=(20, 30, 40, shadow_alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    base.alpha_composite(sh)
    d = ImageDraw.Draw(base)
    rounded(d, box, r, fill, outline, 1)


def chevron_tab(draw, x, y, w, h, fill):
    pts = [
        (x, y),
        (x + w, y),
        (x + w, y + 42),
        (x + w // 2, y + h),
        (x, y + 42),
    ]
    draw.polygon(pts, fill=fill)
    # small top side tabs visible in source
    draw.rectangle([x - 8, y + 4, x + 12, y + 38], fill=fill)
    draw.rectangle([x + w - 12, y + 4, x + w + 8, y + 38], fill=fill)


def arrow(draw, cx, cy, scale=1.0):
    w = int(52 * scale)
    h = int(42 * scale)
    pts = [
        (cx - w // 2, cy - h // 2),
        (cx + 5, cy - h // 2),
        (cx + 5, cy - h),
        (cx + w // 2, cy),
        (cx + 5, cy + h),
        (cx + 5, cy + h // 2),
        (cx - w // 2, cy + h // 2),
    ]
    draw.polygon(pts, fill=(186, 192, 198, 180))


def icon_magnifier(draw, cx, cy):
    draw.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], outline=SLATE, width=7)
    draw.line([cx + 24, cy + 24, cx + 54, cy + 54], fill=SLATE, width=8)


def icon_target(draw, cx, cy):
    draw.ellipse([cx - 43, cy - 43, cx + 43, cy + 43], outline=SLATE, width=6)
    draw.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], outline=SLATE, width=6)
    draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=SLATE)
    draw.line([cx, cy - 58, cx, cy - 24], fill=SLATE, width=7)
    draw.line([cx, cy + 24, cx, cy + 58], fill=SLATE, width=7)
    draw.line([cx - 58, cy, cx - 24, cy], fill=SLATE, width=7)
    draw.line([cx + 24, cy, cx + 58, cy], fill=SLATE, width=7)


def icon_org(draw, cx, cy):
    o = ORANGE
    for bx, by in [(cx - 10, cy - 44), (cx - 46, cy + 32), (cx - 10, cy + 32), (cx + 26, cy + 32)]:
        rounded(draw, [bx, by, bx + 20, by + 20], 3, None, o, 5)
    draw.line([cx, cy - 24, cx, cy + 12], fill=o, width=5)
    draw.line([cx - 36, cy + 12, cx + 36, cy + 12], fill=o, width=5)
    draw.line([cx - 36, cy + 12, cx - 36, cy + 32], fill=o, width=5)
    draw.line([cx, cy + 12, cx, cy + 32], fill=o, width=5)
    draw.line([cx + 36, cy + 12, cx + 36, cy + 32], fill=o, width=5)


def icon_shield(draw, cx, cy):
    pts = [(cx, cy - 52), (cx + 50, cy - 30), (cx + 42, cy + 28), (cx, cy + 58), (cx - 42, cy + 28), (cx - 50, cy - 30)]
    draw.polygon(pts, fill=SLATE)
    draw.line([cx - 22, cy + 2, cx - 4, cy + 22, cx + 30, cy - 20], fill=(255, 255, 255, 255), width=8, joint="curve")


def icon_flag(draw, cx, cy):
    draw.line([cx - 16, cy - 26, cx - 16, cy + 28], fill=(255, 255, 255, 255), width=4)
    pts = [(cx - 12, cy - 24), (cx + 22, cy - 32), (cx + 22, cy), (cx - 12, cy + 6)]
    draw.polygon(pts, fill=(255, 255, 255, 255))


def main():
    img = Image.new("RGBA", (W, H), BG)
    # Subtle top/bottom atmosphere to match generated corporate background.
    haze = layer()
    hd = ImageDraw.Draw(haze)
    for i in range(12):
        alpha = max(0, 18 - i)
        hd.ellipse([420 + i * 18, 20 - i * 3, 1030 - i * 10, 160 + i * 3], fill=(255, 255, 255, alpha))
    img.alpha_composite(haze.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(img)

    # Header decoration.
    d.rectangle([36, 56, 41, 104], fill=ORANGE)
    d.rounded_rectangle([68, 133, 160, 139], radius=3, fill=ORANGE)

    card_boxes = [
        (84, 200, 410, 724),
        (474, 200, 800, 724),
        (866, 200, 1196, 724),
        (1260, 200, 1586, 724),
    ]
    tabs = [
        (112, 186, 262, 78, SLATE),
        (502, 186, 262, 78, SLATE),
        (904, 186, 262, 78, ORANGE),
        (1288, 186, 262, 78, SLATE),
    ]
    for i, box in enumerate(card_boxes):
        outline = ORANGE if i == 2 else BORDER
        shadowed_round_rect(img, box, 15, CARD, outline, shadow_alpha=42)
    d = ImageDraw.Draw(img)
    for x, y, w, h, fill in tabs:
        chevron_tab(d, x, y, w, h, fill)

    # Connecting arrows.
    for cx in (444, 836, 1228):
        arrow(d, cx, 416, 0.95)

    # Circle icon wells and icons.
    centers = [(248, 360), (638, 360), (1031, 360), (1425, 360)]
    for i, (cx, cy) in enumerate(centers):
        fill = PALE_ORANGE if i == 2 else PALE
        d.ellipse([cx - 66, cy - 66, cx + 66, cy + 66], fill=fill)
    icon_magnifier(d, 248, 360)
    icon_target(d, 638, 360)
    icon_org(d, 1031, 360)
    icon_shield(d, 1425, 360)

    # Small horizontal dividers below titles.
    for i, cx in enumerate((248, 638, 1031, 1425)):
        color = ORANGE if i == 2 else LINE
        d.rounded_rectangle([cx - 32, 508, cx + 32, 514], radius=3, fill=color)

    # Footer container.
    shadowed_round_rect(img, (86, 764, 1588, 890), 12, CARD, BORDER, shadow_alpha=36)
    d = ImageDraw.Draw(img)
    d.ellipse([118, 790, 204, 876], fill=SLATE)
    icon_flag(d, 161, 833)
    d.rectangle([232, 792, 234, 868], fill=ORANGE)

    out = RUN / "pages/page_002/assets/clean-base-procedural.png"
    out.parent.mkdir(exist_ok=True)
    img.convert("RGB").save(out)
    print(out)


if __name__ == "__main__":
    main()
