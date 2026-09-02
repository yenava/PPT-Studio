#!/usr/bin/env python3
"""Manage reusable PPT visual style templates."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
DEFAULT_LIBRARY = SKILL_DIR / "assets" / "style-templates"
INDEX_NAME = "index.json"


def now_iso() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", value)
    value = value.strip("-")
    if not value:
        value = "ppt-style"
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:6]
    date = dt.datetime.now().strftime("%Y%m%d")
    ascii_part = re.sub(r"[^a-z0-9-]+", "", value)
    ascii_part = ascii_part[:42].strip("-") or "ppt-style"
    return f"{date}-{ascii_part}-{digest}"


def ensure_library(library: Path) -> dict[str, Any]:
    library.mkdir(parents=True, exist_ok=True)
    index_path = library / INDEX_NAME
    if not index_path.exists():
        index = {"version": 1, "templates": []}
        write_json(index_path, index)
        return index
    return read_json(index_path)


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def read_text(path: Path | None) -> str:
    if not path:
        return ""
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")
    return path.read_text(encoding="utf-8", errors="ignore")


def copy_file(
    src: Path,
    dest_dir: Path,
    preferred_name: str | None = None,
    relative_to: Path | None = None,
) -> str:
    if not src.exists():
        raise SystemExit(f"Missing file: {src}")
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = preferred_name or src.name
    dest = dest_dir / name
    if dest.exists():
        stem = dest.stem
        suffix = dest.suffix
        digest = hashlib.sha1(src.read_bytes()).hexdigest()[:8]
        dest = dest_dir / f"{stem}-{digest}{suffix}"
    shutil.copy2(src, dest)
    return dest.relative_to(relative_to or dest_dir).as_posix()


def flatten(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return " ".join(flatten(v) for v in value.values())
    if isinstance(value, list):
        return " ".join(flatten(v) for v in value)
    return str(value)


def cjk_ngrams(text: str) -> list[str]:
    groups = re.findall(r"[\u4e00-\u9fff]+", text)
    grams: list[str] = []
    for group in groups:
        grams.extend(group)
        grams.extend(group[i : i + 2] for i in range(max(0, len(group) - 1)))
    return grams


def tokenize(text: str) -> set[str]:
    text = text.lower()
    words = re.findall(r"[a-z0-9]+", text)
    tokens = {w for w in words if len(w) > 1}
    tokens.update(cjk_ngrams(text))
    return tokens


def load_manifest(library: Path, template_id: str) -> dict[str, Any]:
    manifest_path = library / template_id / "manifest.json"
    if not manifest_path.exists():
        return {}
    return read_json(manifest_path)


def manifest_search_text(manifest: dict[str, Any], library: Path) -> str:
    prompt_path = manifest.get("prompt_path")
    prompt_text = ""
    if prompt_path:
        manifest_dir = library / manifest.get("id", "")
        candidate = manifest_dir / prompt_path
        if candidate.exists():
            prompt_text = read_text(candidate)
    fields = [
        manifest.get("name", ""),
        manifest.get("description", ""),
        flatten(manifest.get("tags", [])),
        flatten(manifest.get("source_profile", {})),
        flatten(manifest.get("visual_system", {})),
        prompt_text[:4000],
    ]
    return " ".join(fields)


def parse_profile(args: argparse.Namespace) -> dict[str, Any]:
    profile: dict[str, Any] = {}
    if getattr(args, "profile", None):
        profile = read_json(Path(args.profile))
    if getattr(args, "query", None):
        profile["query"] = args.query
    if getattr(args, "page_count", None):
        profile["page_count"] = args.page_count
    return profile


def score_manifest(manifest: dict[str, Any], profile: dict[str, Any], library: Path) -> float:
    query_text = flatten(profile)
    query_tokens = tokenize(query_text)
    if not query_tokens:
        return 0.0

    candidate_tokens = tokenize(manifest_search_text(manifest, library))
    if not candidate_tokens:
        return 0.0

    overlap = len(query_tokens & candidate_tokens)
    score = overlap / max(8, len(query_tokens))

    query_lower = query_text.lower()
    for tag in manifest.get("tags", []):
        tag_text = str(tag).lower()
        if tag_text and tag_text in query_lower:
            score += 0.08

    profile_page_count = profile.get("page_count")
    manifest_page_count = manifest.get("page_count")
    if profile_page_count and manifest_page_count:
        try:
            diff = abs(int(profile_page_count) - int(manifest_page_count))
            score += max(0.0, 0.12 - diff * 0.02)
        except (TypeError, ValueError):
            pass

    return round(min(score, 1.0), 4)


def command_search(args: argparse.Namespace) -> int:
    library = Path(args.library)
    index = ensure_library(library)
    profile = parse_profile(args)
    matches: list[dict[str, Any]] = []

    for item in index.get("templates", []):
        template_id = item.get("id")
        if not template_id:
            continue
        manifest = load_manifest(library, template_id)
        if not manifest:
            continue
        score = score_manifest(manifest, profile, library)
        if score < args.min_score:
            continue
        matches.append(
            {
                "score": score,
                "id": template_id,
                "name": manifest.get("name"),
                "description": manifest.get("description"),
                "tags": manifest.get("tags", []),
                "page_count": manifest.get("page_count"),
                "prompt": str((library / template_id / manifest.get("prompt_path", "prompt.md")).resolve()),
                "collage_image": str((library / template_id / manifest.get("collage_image", "collage.png")).resolve()),
                "manifest": str((library / template_id / "manifest.json").resolve()),
            }
        )

    matches.sort(key=lambda item: item["score"], reverse=True)
    matches = matches[: args.limit]

    if args.json:
        print(json.dumps({"matches": matches}, ensure_ascii=False, indent=2))
    else:
        if not matches:
            print("No suitable templates found.")
            return 0
        for match in matches:
            tags = ", ".join(match["tags"])
            print(f"{match['score']:.2f}  {match['id']}  {match['name']}  [{tags}]")
            print(f"      prompt: {match['prompt']}")
            print(f"      collage: {match['collage_image']}")
    return 0


def command_add(args: argparse.Namespace) -> int:
    library = Path(args.library)
    index = ensure_library(library)

    template_id = args.id or slugify(args.name)
    template_dir = library / template_id
    template_dir.mkdir(parents=True, exist_ok=True)

    profile = read_json(Path(args.profile)) if args.profile else {}
    prompt_src = Path(args.prompt_file)
    collage_src = Path(args.collage_image)
    prompt_rel = copy_file(prompt_src, template_dir, "prompt.md", relative_to=template_dir)
    collage_suffix = collage_src.suffix or ".png"
    collage_rel = copy_file(collage_src, template_dir, f"collage{collage_suffix}", relative_to=template_dir)

    asset_rels: list[str] = []
    for asset in args.asset or []:
        asset_rels.append(copy_file(Path(asset), template_dir / "assets", relative_to=template_dir))

    existing_manifest = load_manifest(library, template_id)
    created_at = existing_manifest.get("created_at") or now_iso()
    prompt_text = read_text(template_dir / prompt_rel)
    tags = [tag.strip() for tag in args.tags.split(",") if tag.strip()]

    manifest = {
        "id": template_id,
        "name": args.name,
        "description": args.description,
        "tags": tags,
        "created_at": created_at,
        "updated_at": now_iso(),
        "page_count": args.page_count,
        "source_profile": profile,
        "visual_system": extract_visual_system(prompt_text),
        "prompt_path": prompt_rel,
        "collage_image": collage_rel,
        "assets": asset_rels,
    }
    write_json(template_dir / "manifest.json", manifest)

    index_templates = [item for item in index.get("templates", []) if item.get("id") != template_id]
    index_templates.append(
        {
            "id": template_id,
            "name": args.name,
            "description": args.description,
            "tags": tags,
            "updated_at": manifest["updated_at"],
            "page_count": args.page_count,
        }
    )
    index["templates"] = sorted(index_templates, key=lambda item: item.get("updated_at", ""), reverse=True)
    write_json(library / INDEX_NAME, index)

    print(json.dumps({"saved": str(template_dir.resolve()), "id": template_id}, ensure_ascii=False, indent=2))
    return 0


def extract_visual_system(prompt_text: str) -> dict[str, str]:
    labels = {
        "layout": ["layout", "版式", "网格", "布局"],
        "typography": ["typography", "字体", "字阶", "字体层级"],
        "color": ["color", "palette", "色彩", "配色"],
        "background": ["background", "背景"],
        "charts": ["chart", "图表"],
        "icons": ["icon", "图标"],
        "modules": ["card", "module", "卡片", "模块"],
        "header_footer": ["header", "footer", "页眉", "页脚"],
    }
    lines = [line.strip(" -\t") for line in prompt_text.splitlines() if line.strip()]
    result: dict[str, str] = {}
    for key, needles in labels.items():
        for line in lines:
            lower = line.lower()
            if any(needle.lower() in lower for needle in needles):
                result[key] = line[:300]
                break
    return result


def command_list(args: argparse.Namespace) -> int:
    library = Path(args.library)
    index = ensure_library(library)
    if args.json:
        print(json.dumps(index, ensure_ascii=False, indent=2))
        return 0
    templates = index.get("templates", [])
    if not templates:
        print("No templates saved yet.")
        return 0
    for item in templates:
        tags = ", ".join(item.get("tags", []))
        print(f"{item.get('id')}  {item.get('name')}  [{tags}]")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage reusable PPT style templates.")
    parser.add_argument("--library", default=str(DEFAULT_LIBRARY), help="Style template library path.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search = subparsers.add_parser("search", help="Search reusable styles.")
    search.add_argument("--profile", help="Project profile JSON path.")
    search.add_argument("--query", help="Free-text query.")
    search.add_argument("--page-count", type=int, help="Current deck page count.")
    search.add_argument("--limit", type=int, default=3)
    search.add_argument("--min-score", type=float, default=0.0)
    search.add_argument("--json", action="store_true")
    search.set_defaults(func=command_search)

    add = subparsers.add_parser("add", help="Save a reusable style.")
    add.add_argument("--id", help="Optional stable template id.")
    add.add_argument("--name", required=True)
    add.add_argument("--description", required=True)
    add.add_argument("--profile", help="Project profile JSON path.")
    add.add_argument("--prompt-file", required=True)
    add.add_argument("--collage-image", required=True)
    add.add_argument("--page-count", type=int)
    add.add_argument("--tags", default="")
    add.add_argument("--asset", action="append", help="Representative high-resolution slide image.")
    add.set_defaults(func=command_add)

    list_cmd = subparsers.add_parser("list", help="List saved styles.")
    list_cmd.add_argument("--json", action="store_true")
    list_cmd.set_defaults(func=command_list)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
