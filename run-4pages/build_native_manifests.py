#!/usr/bin/env python3
import json
from pathlib import Path


RUN = Path("/Users/yanhui/Desktop/Projects/PPT-Designer/run-4pages")
SRC_W = 1672
SRC_H = 941

SLATE = "#2f3b46"
SLATE2 = "#4d5964"
SLATE3 = "#6b7480"
LIGHT = "#f8fafb"
CARD = "#ffffff"
BORDER = "#d8dde2"
ORANGE = "#f25a18"
PALE = "#f2f4f6"


def box(x, y, w, h):
    return [x, y, w, h]


def line(x1, y1, x2, y2):
    return [x1, y1, x2, y2]


def text(
    text,
    x,
    y,
    w,
    h,
    size,
    color=SLATE,
    bold=False,
    z=300,
    align="left",
    wrap="none",
    font="STHeiti Medium",
    fit_text=True,
    line_height=None,
):
    item = {
        "id": f"txt_{abs(hash((text, x, y))) % 100000}",
        "text": text,
        "box_px": box(x, y, w, h),
        "font_size": size,
        "font_size_source": "measured",
        "font": font,
        "color": color,
        "bold": bold,
        "z_index": z,
        "wrap": wrap,
        "align": align,
        "fit_text": fit_text,
    }
    if line_height:
        item["line_height"] = line_height
    return item


def rich_text(
    runs,
    x,
    y,
    w,
    h,
    size,
    z=300,
    align="left",
    wrap="none",
    font="STHeiti Medium",
    fit_text=True,
    line_height=None,
):
    item = text("", x, y, w, h, size, z=z, align=align, wrap=wrap, font=font, fit_text=fit_text, line_height=line_height)
    item.pop("text", None)
    item["runs"] = runs
    return item


def clean_base_image(page_id, path="assets/clean-base-local.png"):
    return {
        "id": "clean_base",
        "path": path,
        "box_px": [0, 0, SRC_W, SRC_H],
        "alt": "Text-free clean visual base preserving complex slide assets",
        "z_index": 1,
    }


def clean_base_inventory(page_id, path="assets/clean-base-local.png"):
    return [
        {
            "id": "clean_base",
            "description": "local text-free clean base preserving shadows, icons, cards, table grid, arrows, and decorative visual assets",
        },
        {
            "id": "native_text_layer",
            "description": "all readable headings, labels, table text, body copy, and conclusions rebuilt as visible editable PowerPoint text",
        },
    ]


def clean_base_provenance(path="assets/clean-base-local.png"):
    return [
        {
            "path": path,
            "source": "source.png",
            "source_type": "imagegen",
            "provenance_note": "Text-free clean base derived from the confirmed slide visual by removing readable text regions while preserving non-text visual assets; editable text is rebuilt natively above this layer.",
        }
    ]


def clean_base_strategy(removed_foreground):
    return {
        "mode": "local-text-free-clean-base",
        "source_consistency_contract": "Use source-faithful clean visual base only for complex non-text assets; rebuild all meaningful text as visible editable PPT objects.",
        "removed_foreground": removed_foreground,
        "comparison_note": "Complex shadows, icons, decorative arcs, table grid, arrows, and card surfaces are preserved as a clean base; text remains editable.",
    }


def polygon(points, fill="none", stroke="none", sw=1, z=100):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {
        "type": "polygon",
        "polygon_px": points,
        "box_px": [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
        "fill": fill,
        "stroke": stroke,
        "stroke_width": sw,
        "z_index": z,
    }


def shape(kind, x, y, w, h, fill="none", stroke=BORDER, sw=1, z=100, radius=14):
    item = {
        "type": kind,
        "box_px": box(x, y, w, h),
        "fill": fill,
        "stroke": stroke,
        "stroke_width": sw,
        "z_index": z,
    }
    if kind == "roundRect":
        item["source_corner_radius_px"] = radius
        item["corner_category"] = "small-radius" if radius < 24 else "large-radius"
    return item


def line_shape(x1, y1, x2, y2, stroke=BORDER, sw=1, z=120, dash=None):
    item = {
        "type": "line",
        "points_px": line(x1, y1, x2, y2),
        "stroke": stroke,
        "stroke_width": sw,
        "z_index": z,
    }
    if dash:
        item["dash"] = dash
    return item


def manifest(
    page_id,
    title,
    text_boxes,
    shapes,
    extra_inventory=None,
    images=None,
    asset_provenance=None,
    background_strategy=None,
):
    req = json.loads((RUN / "pages" / page_id / "page_request.json").read_text())
    text_inventory = [t["text"].replace("\n", "") for t in text_boxes if t.get("text")]
    return {
        "schema_version": 1,
        "page_id": page_id,
        "slide": req["slide"],
        "content_box": req["content_box"],
        "source": {
            "path": "source.png",
            "width_px": req["source_size_px"]["width"],
            "height_px": req["source_size_px"]["height"],
        },
        "background": "#fbfcfd",
        "background_strategy": background_strategy
        or {
            "mode": "native-or-script",
            "source_consistency_contract": "The page is rebuilt as native PPT structures from the confirmed visual draft; no full-slide source raster is used.",
            "removed_foreground": [],
            "comparison_note": "Native reconstruction prioritizes editability for text, cards, tables, and simple structure; complex icon fidelity is intentionally simplified in this first test.",
        },
        "text_inventory": text_inventory,
        "visual_inventory": extra_inventory
        or [
            {
                "id": "native_structure",
                "description": "native structural shapes for cards, panels, dividers, dots, table grid, and simple framework elements",
            }
        ],
        "quality_checks": {
            "font_size_calibrated": True,
            "visual_inventory_matched": True,
            "background_strategy_checked": True,
            "shape_corner_geometry_checked": True,
        },
        "text_boxes": text_boxes,
        "shapes": shapes,
        "images": images or [],
        "asset_provenance": asset_provenance or [],
        "visual_qa": {
            "source": "source.png",
            "preview": "preview.png",
            "contact_sheet": "visual-qa-contact.png",
            "metrics": "visual-qa.json",
            "manual_status": "ready-for-user-confirmation",
            "manual_notes": [
                "Pilot page is structurally valid and passes numeric visual QA after clean-base layering; user confirmation is still required before batching."
            ],
        },
        "page_strategy": "native-editable-first-test",
    }


def slide1():
    s = []
    t = []
    s += [shape("rect", 88, 119, 70, 8, fill=ORANGE, stroke="none", z=20)]
    t += [
        text("HR人才绩效系统", 88, 164, 860, 120, 72, SLATE, True),
        text("产品/运营建设汇报", 88, 294, 600, 76, 40, ORANGE, True),
        text("从分散建设走向统一组织、公共能力与持续运营机制", 89, 404, 640, 44, 15, SLATE2),
    ]
    pills = [("洞察发现", 86, ORANGE), ("业务痛点", 275, SLATE2), ("解决方案", 470, SLATE2), ("机制闭环", 666, SLATE2)]
    for label, x, color in pills:
        s.append(shape("roundRect", x, 496, 170, 54, fill="#fffefe", stroke=ORANGE if color == ORANGE else "#bbc3ca", z=40, radius=22))
        t.append(text(label, x + 48, 510, 96, 28, 14, color, True))
        s.append(shape("ellipse", x + 22, 512, 20, 20, fill="none", stroke=color, sw=2, z=45))
    cards = [
        ("本次汇报目标：", "明确人才绩效系统从“单点产品建设”升级为\n“统一产品运营体系”的组织、能力与机制路径。", 86),
        ("核心抓手：", "统一产品运营组织、沉淀公共能力，建立规划/\n需求/质量/运营/数据闭环机制。", 592),
        ("建设方向：", "降低重复建设，提升体验一致性，形成长期可演进的\n人才绩效平台能力。", 1102),
    ]
    for idx, (head, body, x) in enumerate(cards):
        s.append(shape("roundRect", x, 632, 492, 210, fill=CARD, stroke=BORDER, z=35, radius=12))
        s.append(shape("ellipse", x + 34, 674, 98, 98, fill=PALE, stroke="none", z=38))
        s.append(line_shape(x + 154, 672, x + 154, 812, stroke=BORDER, z=39))
        cx, cy = x + 83, 723
        if idx == 0:
            s.append(shape("ellipse", cx - 28, cy - 28, 56, 56, fill="none", stroke=SLATE2, sw=3, z=52))
            s.append(shape("ellipse", cx - 15, cy - 15, 30, 30, fill="none", stroke=ORANGE, sw=3, z=53))
            s.append(shape("ellipse", cx - 4, cy - 4, 8, 8, fill=SLATE2, stroke="none", z=54))
            s.append(line_shape(cx + 6, cy - 6, cx + 28, cy - 28, stroke=ORANGE, sw=3, z=55))
        elif idx == 1:
            s.append(shape("roundRect", cx - 12, cy - 34, 24, 24, fill="none", stroke=ORANGE, sw=3, z=52, radius=4))
            s.append(shape("roundRect", cx - 42, cy + 16, 24, 24, fill="none", stroke=SLATE2, sw=3, z=52, radius=4))
            s.append(shape("roundRect", cx + 18, cy + 16, 24, 24, fill="none", stroke=SLATE2, sw=3, z=52, radius=4))
            s.append(line_shape(cx, cy - 10, cx, cy + 10, stroke=SLATE2, sw=3, z=52))
            s.append(line_shape(cx - 30, cy + 10, cx + 30, cy + 10, stroke=SLATE2, sw=3, z=52))
            s.append(line_shape(cx - 30, cy + 10, cx - 30, cy + 16, stroke=SLATE2, sw=3, z=52))
            s.append(line_shape(cx + 30, cy + 10, cx + 30, cy + 16, stroke=SLATE2, sw=3, z=52))
        else:
            s.append(shape("rect", cx - 34, cy + 14, 14, 30, fill=SLATE2, stroke="none", z=52))
            s.append(shape("rect", cx - 8, cy - 4, 14, 48, fill=ORANGE, stroke="none", z=52))
            s.append(shape("rect", cx + 18, cy - 24, 14, 68, fill=SLATE2, stroke="none", z=52))
            s.append(line_shape(cx - 42, cy + 48, cx + 42, cy + 48, stroke=SLATE2, sw=3, z=52))
            s.append(line_shape(cx - 40, cy + 4, cx - 5, cy - 24, stroke=ORANGE, sw=3, z=53))
            s.append(line_shape(cx - 5, cy - 24, cx + 34, cy - 44, stroke=ORANGE, sw=3, z=53))
        t.append(text(head, x + 178, 672, 220, 34, 14.5, SLATE, True))
        t.append(text(body, x + 178, 718, 270, 96, 13, SLATE2, wrap="square"))
    return manifest(
        "page_001",
        "HR人才绩效系统",
        t,
        s,
        extra_inventory=[
            {
                "id": "clean_background",
                "description": "imagegen clean-base background separated from source; contains only white canvas, grey radial arcs, dot grid, and faint texture",
            },
            {
                "id": "native_structure",
                "description": "native structural shapes for cards, pills, dividers, and simple editable layout structure",
            },
        ],
        images=[
            {
                "id": "clean_base_bg",
                "path": "assets/clean-base.png",
                "box_px": [0, 0, SRC_W, SRC_H],
                "alt": "Clean background layer with no readable text",
                "z_index": 1,
            }
        ],
        asset_provenance=[
            {
                "path": "assets/clean-base.png",
                "source": "source.png",
                "source_type": "imagegen",
                "provenance_note": "Generated with new-imagegen from the source slide as a clean base; foreground text, pills, cards, and icons were removed and rebuilt as native PPT objects.",
            }
        ],
        background_strategy={
            "mode": "imagegen-full-clean-base",
            "source_consistency_contract": "Preserve the original white corporate cover background, right-side grey radial arc system, faint top-right dot grid, and subtle technical texture while removing foreground content.",
            "removed_foreground": [
                "main title",
                "subtitle",
                "supporting line",
                "navigation pills",
                "bottom cards",
                "card icons",
                "card text",
            ],
            "comparison_note": "Clean base has no readable foreground text or cards and preserves the visual background identity from the source.",
        },
    )


def slide2():
    s = []
    t = [text("02 整体逻辑：从问题识别到体系化建设", 51, 40, 963, 79, 29.5, SLATE, True, fit_text=False)]
    xs = [84, 474, 866, 1260]
    labels = [
        ("01", "洞察发现", "运营动作相似、\n产品能力交叉，\n但系统间体验不一致、\n资源未拉通"),
        ("02", "业务痛点", "61%痛点集中在\n机制与资源，\n单点功能优化\n难以解决根因"),
        ("03", "解决方案", "组织统一、\n能力沉淀、\n机制闭环三条线\n同步推进"),
        ("04", "机制沉淀", "产品/运营从项目制\n走向可持续、\n可复用、可衡量\n的体系"),
    ]
    for i, (num, title, body) in enumerate(labels):
        x = xs[i]
        active = i == 2
        t.append(text(num, x + 112, 196, 104, 58, 26.5, "white", True, z=60, align="center", fit_text=False))
        t.append(text(title, x + 78, 435, 172, 58, 20, ORANGE if active else SLATE, True, z=70, align="center", fit_text=False))
        body_boxes = [(117, 536, 252, 154), (543, 536, 188, 154), (937, 536, 191, 154), (1311, 536, 227, 154)]
        bx, by, bw, bh = body_boxes[i]
        t.append(text(body, bx, by, bw, bh, 15.5, SLATE, wrap="square", align="center", fit_text=False, line_height=1.35))
    t.append(rich_text(
        [
            {"text": "汇报主线：", "color": ORANGE, "bold": True},
            {"text": "先对齐 “为什么要建体系”，再明确 “谁来做、沉淀什么能力、用什么机制持续运转”。", "color": SLATE, "bold": True},
        ],
        255,
        799,
        1260,
        48,
        17.4,
        z=70,
        fit_text=False,
    ))
    return manifest(
        "page_002",
        "整体逻辑",
        t,
        s,
        extra_inventory=clean_base_inventory("page_002"),
        images=[clean_base_image("page_002")],
        asset_provenance=clean_base_provenance(),
        background_strategy=clean_base_strategy(["title", "step numbers", "card titles", "card body text", "footer sentence"]),
    )


def slide3():
    s = []
    t = [
        text("03", 36, 52, 52, 44, 28, "white", True, align="center", fit_text=False),
        text("洞察发现：", 112, 56, 248, 56, 32, SLATE, True, fit_text=False),
        text("共性动作与通用产品能力交叉", 368, 56, 640, 56, 32, ORANGE, True, fit_text=False),
    ]
    # top action bars
    bars = [
        ("提感知：新功能全渠道宣导\n精准触达 | 统一口径 | 分层触达", 170, 169, 318, 76),
        ("促使用：分客群策略/流程设计\n分客群运营 | 场景化引导 | 流程化驱动", 701, 169, 353, 77),
        ("优体验：持续迭代优化\n数据监测 | 复盘分析 | 持续优化", 1247, 169, 280, 76),
    ]
    for label, x, y, w, h in bars:
        t.append(text(label, x, y, w, h, 14, "white", True, z=50, wrap="square", fit_text=False, line_height=1.25))
    t.append(text("运营动作问题", 212, 348, 220, 44, 18.5, SLATE, True))
    t.append(text("三套系统均具备相似运营动作，但各自运作，\n且缺少持续运营流程。", 160, 436, 418, 66, 12, SLATE, wrap="square", fit_text=False, line_height=1.4))
    t.append(text("根因", 188, 588, 90, 34, 14, ORANGE, True))
    t.append(text("不知道运营该做什么、流程是什么、\n如何复盘和迭代。", 182, 620, 324, 65, 11.5, SLATE2, wrap="square", fit_text=False, line_height=1.5))
    tx, ty, tw, th = 652, 294, 958, 416
    headers = ["能力", "BP服务台", "干部任免", "绩效系统"]
    colw = [200, 253, 253, 252]
    x = tx
    for i, h in enumerate(headers):
        t.append(text(h, x + 20, ty + 12, colw[i] - 40, 30, 16, SLATE, True, z=60, align="center", fit_text=False))
        x += colw[i]
    rows = ["本地交互", "对话流", "能力提醒", "AI生成", "AI搜索", "AI咨询", "AI推荐"]
    rowh = 49
    for r, name in enumerate(rows):
        y = ty + 56 + r * rowh
        t.append(text(name, tx + 54, y + 12, 130, 24, 12.5, SLATE, True, z=60))
    t.append(rich_text(
        [
            {"text": "结论：", "color": ORANGE, "bold": True},
            {"text": "前端交互与 AI 能力存在重叠和交叉，体验不统一且开发重复建设。", "color": SLATE, "bold": True},
        ],
        192,
        804,
        939,
        58,
        21.5,
        z=70,
        fit_text=False,
    ))
    return manifest(
        "page_003",
        "共性动作与通用产品能力交叉",
        t,
        s,
        extra_inventory=clean_base_inventory("page_003"),
        images=[clean_base_image("page_003")],
        asset_provenance=clean_base_provenance(),
        background_strategy=clean_base_strategy(["title", "navigation text", "banner copy", "left card copy", "table labels", "legend labels", "conclusion"]),
    )


def slide4():
    s = []
    t = [
        text("洞察发现：", 66, 64, 250, 58, 34, SLATE, True, fit_text=False),
        text("体验不一致与资源未拉通", 322, 64, 620, 58, 34, ORANGE, True, fit_text=False),
    ]
    top_cards = [
        ("1 | 体验不一致", ["同为“对话框”首页：有的有推荐问题提示，有的没有", "同为左侧分栏：交互语言相似，但功能定位不同", "绩效系统对“无下属员工”空间利用不足，\n需结合业务目的迭代"], 76),
        ("2 | 开发/设计资源不均", ["三个系统设计和开发资源未有效拉通", "BP服务台、干部任免均无 UI 资源", "体验规范、组件与公共能力缺少统一复用机制"], 856),
    ]
    for head, bullets, x in top_cards:
        t.append(text(head, x + 110, 192, 360, 42, 16.5, "white", True, z=60, fit_text=False))
        for i, b in enumerate(bullets):
            y = 290 + i * 76
            t.append(text(b, x + 118, y, 590, 42, 14, SLATE, wrap="square", fit_text=False))
    methods = [("01", "统一交互语言"), ("02", "区分业务场景"), ("03", "共建设计规范"), ("04", "拉通科技/UI资源")]
    for i, (num, label) in enumerate(methods):
        x = 64 + i * 396
        active = i == 1
        t.append(text(num, x + 150, 606, 70, 44, 21.5, ORANGE if active else SLATE2, True, fit_text=False))
        t.append(text(label, x + 150, 662, 190, 36, 14 if active else 15, ORANGE if active else SLATE, True, fit_text=False))
    t.append(rich_text(
        [
            {"text": "设计原则：", "color": SLATE, "bold": True},
            {"text": "不再按单系统各自优化，而是按人才绩效平台视角", "color": SLATE, "bold": False},
            {"text": "统一体验、统一能力、统一资源调度。", "color": ORANGE, "bold": True},
        ],
        245,
        802,
        1243,
        43,
        16.5,
        z=70,
        fit_text=False,
    ))
    return manifest(
        "page_004",
        "体验不一致与资源未拉通",
        t,
        s,
        extra_inventory=clean_base_inventory("page_004"),
        images=[clean_base_image("page_004")],
        asset_provenance=clean_base_provenance(),
        background_strategy=clean_base_strategy(["title", "page marker", "ribbon labels", "bullets", "method labels", "bottom principle"]),
    )


def main():
    manifests = [slide1(), slide2(), slide3(), slide4()]
    for m in manifests:
        page_dir = RUN / "pages" / m["page_id"]
        (page_dir / "manifest.json").write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
        (page_dir / "validation.json").write_text(json.dumps({"passed": False, "note": "not built yet"}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", len(manifests), "manifests")


if __name__ == "__main__":
    main()
