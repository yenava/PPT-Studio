#!/usr/bin/env python3
"""Create a page clean base through Codex OAuth or an OpenAI-compatible Images API.

The Codex OAuth request shape follows the MIT-licensed image backend in
ningzimu/image-to-editable-ppt-skill, reduced here to one masked edit command.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import math
import mimetypes
import os
import random
import socket
import time
from pathlib import Path
from typing import Any
from urllib import error, request

from PIL import Image


CODEX_AUTH = Path("~/.codex/auth.json").expanduser()
CODEX_ENDPOINT = "https://chatgpt.com/backend-api/codex/images/edits"
AUTH_CLAIM = "https://api.openai.com/auth"
MODEL = "gpt-image-2"
MAX_RESPONSE_BYTES = 64 * 1024 * 1024


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) < 2:
        return {}
    payload = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        value = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def _codex_auth(path: Path = CODEX_AUTH) -> tuple[str, str | None] | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        tokens = data["tokens"]
        access_token = str(tokens["access_token"]).strip()
    except (KeyError, TypeError, ValueError, OSError, json.JSONDecodeError):
        return None
    account_id = tokens.get("account_id")
    if not account_id and tokens.get("id_token"):
        claim = _decode_jwt_payload(str(tokens["id_token"])).get(AUTH_CLAIM, {})
        if isinstance(claim, dict):
            account_id = claim.get("chatgpt_account_id")
    return access_token, str(account_id).strip() if account_id else None


def _data_url(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def _api_mask_bytes(path: Path) -> bytes:
    with Image.open(path) as image:
        guide = image.convert("L")
        rgba = Image.new("RGBA", guide.size, (0, 0, 0, 255))
        rgba.putalpha(guide.point(lambda value: 255 - value))
        buffer = io.BytesIO()
        rgba.save(buffer, format="PNG")
    return buffer.getvalue()


def _api_mask_data_url(path: Path) -> str:
    return f"data:image/png;base64,{base64.b64encode(_api_mask_bytes(path)).decode('ascii')}"


def _requested_size(source: Path) -> str:
    with Image.open(source) as image:
        width, height = image.size
    scale = min(1.0, 3840 / max(width, height))
    width = max(16, int(math.ceil(width * scale / 16) * 16))
    height = max(16, int(math.ceil(height * scale / 16) * 16))
    if width * height < 655_360:
        grow = math.sqrt(655_360 / (width * height))
        width = int(math.ceil(width * grow / 16) * 16)
        height = int(math.ceil(height * grow / 16) * 16)
    if width * height > 8_294_400:
        shrink = math.sqrt(8_294_400 / (width * height))
        width = max(16, int(math.floor(width * shrink / 16) * 16))
        height = max(16, int(math.floor(height * shrink / 16) * 16))
    return f"{width}x{height}"


def _codex_edit(source: Path, mask: Path, prompt: str, *, timeout: int, model: str) -> bytes:
    auth = _codex_auth(Path(os.getenv("CODEX_AUTH_FILE", str(CODEX_AUTH))).expanduser())
    if not auth:
        raise RuntimeError("Codex OAuth credentials are unavailable. Run `codex login` or set OPENAI_API_KEY.")
    token, account_id = auth
    body = {
        "prompt": prompt,
        "model": model,
        "size": _requested_size(source),
        "quality": "high",
        "background": "auto",
        "images": [{"image_url": _data_url(source)}],
        "mask": {"image_url": _api_mask_data_url(mask)},
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "originator": "image-to-editable-text-ppt",
        "User-Agent": "image-to-editable-text-ppt/0.1.0",
    }
    if account_id:
        headers["ChatGPT-Account-ID"] = account_id
    raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            req = request.Request(CODEX_ENDPOINT, data=raw, method="POST", headers=headers)
            with request.urlopen(req, timeout=timeout) as response:
                payload = json.loads(response.read(MAX_RESPONSE_BYTES).decode("utf-8"))
            encoded = payload["data"][0]["b64_json"]
            return base64.b64decode(encoded)
        except error.HTTPError as exc:
            detail = exc.read(2048).decode("utf-8", errors="replace")
            if exc.code < 500 or attempt == 3:
                raise RuntimeError(f"Codex image edit failed (HTTP {exc.code}): {detail}") from exc
            last_error = exc
        except (error.URLError, TimeoutError, socket.timeout, KeyError, ValueError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt == 3:
                break
        time.sleep((2**attempt) * random.uniform(0.8, 1.2))
    raise RuntimeError(f"Codex image edit failed after retries: {last_error}")


def _api_edit(source: Path, mask: Path, prompt: str, *, model: str) -> bytes:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError("The API fallback requires the `openai` Python package.") from exc
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), base_url=os.getenv("OPENAI_BASE_URL") or None)
    mask_handle = io.BytesIO(_api_mask_bytes(mask))
    mask_handle.name = "mask.png"
    with source.open("rb") as image_handle, mask_handle:
        response = client.images.edit(
            model=model,
            image=image_handle,
            mask=mask_handle,
            prompt=prompt,
            size=_requested_size(source),
            quality="high",
        )
    return base64.b64decode(response.data[0].b64_json)


def edit_page(page_dir: str | Path, *, attempt: int = 1, timeout: int = 600) -> Path:
    page_dir = Path(page_dir)
    source = page_dir / "source.png"
    mask = page_dir / ("retry-mask.png" if attempt == 2 else "text-mask.png")
    prompt_path = page_dir / ("retry-clean-base-prompt.md" if attempt == 2 else "clean-base-prompt.md")
    for required in (source, mask, prompt_path):
        if not required.exists():
            raise FileNotFoundError(f"Missing required page artifact: {required}")
    prompt = prompt_path.read_text(encoding="utf-8")
    model = os.getenv("IMAGE_TO_EDITABLE_TEXT_PPT_IMAGE_MODEL", MODEL)
    if _codex_auth(Path(os.getenv("CODEX_AUTH_FILE", str(CODEX_AUTH))).expanduser()):
        content = _codex_edit(source, mask, prompt, timeout=timeout, model=model)
    elif os.getenv("OPENAI_API_KEY"):
        content = _api_edit(source, mask, prompt, model=model)
    else:
        raise RuntimeError("No image backend credentials. Run `codex login` or set OPENAI_API_KEY.")
    output = page_dir / "clean_base.png"
    output.write_bytes(content)
    with Image.open(source) as source_image, Image.open(output) as generated:
        if generated.size != source_image.size:
            generated.convert("RGB").resize(source_image.size, Image.Resampling.LANCZOS).save(output)
        elif generated.mode != "RGB":
            generated.convert("RGB").save(output)
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove all OCR text from one slide page using a masked image edit.")
    parser.add_argument("page_dir")
    parser.add_argument("--attempt", type=int, choices=(1, 2), default=1)
    parser.add_argument("--timeout", type=int, default=600)
    args = parser.parse_args()
    output = edit_page(args.page_dir, attempt=args.attempt, timeout=args.timeout)
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
