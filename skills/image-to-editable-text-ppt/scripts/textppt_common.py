#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import stat
import tempfile
from pathlib import Path
from typing import Any


SKILL_NAME = "image-to-editable-text-ppt"
DEFAULT_CONFIG_PATH = Path("~/.image-to-editable-text-ppt/config.json").expanduser()
PADDLE_ENV = "PADDLE_OCR_TOKEN"


def read_json(path: str | Path) -> dict[str, Any]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return data


def write_json(path: str | Path, data: dict[str, Any]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    )
    tmp = Path(handle.name)
    try:
        with handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def write_private_config(path: str | Path, values: dict[str, str]) -> None:
    path = Path(path).expanduser()
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        path.parent.chmod(0o700)
    except OSError:
        pass
    fd, raw_tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    tmp = Path(raw_tmp)
    try:
        os.fchmod(fd, stat.S_IRUSR | stat.S_IWUSR)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(values, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp, path)
        path.chmod(0o600)
    finally:
        tmp.unlink(missing_ok=True)


def load_paddle_token(config_path: str | Path = DEFAULT_CONFIG_PATH) -> str:
    env_value = os.getenv(PADDLE_ENV, "").strip()
    if env_value:
        return env_value
    path = Path(config_path).expanduser()
    if not path.exists():
        return ""
    try:
        value = read_json(path).get(PADDLE_ENV, "")
    except (OSError, ValueError, json.JSONDecodeError):
        return ""
    return str(value).strip()


def page_dirs(run_dir: str | Path) -> list[Path]:
    run = read_json(Path(run_dir) / "run.json")
    return [Path(run_dir) / "pages" / str(page["id"]) for page in run.get("pages", [])]


def box_xyxy(box: list[float] | tuple[float, ...]) -> tuple[float, float, float, float]:
    if len(box) != 4:
        raise ValueError(f"Expected [x, y, width, height], got {box!r}")
    x, y, width, height = (float(value) for value in box)
    return x, y, x + width, y + height


def intersection_over_smaller(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = box_xyxy(a)
    bx1, by1, bx2, by2 = box_xyxy(b)
    width = max(0.0, min(ax2, bx2) - max(ax1, bx1))
    height = max(0.0, min(ay2, by2) - max(ay1, by1))
    intersection = width * height
    smaller = min(max(0.0, (ax2 - ax1) * (ay2 - ay1)), max(0.0, (bx2 - bx1) * (by2 - by1)))
    return intersection / smaller if smaller else 0.0

