#!/usr/bin/env python3
"""Generate or edit images with apiopencc.com's gpt-image-2 image routes."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import socket
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_BASE_URL = "https://apiopencc.com"
DEFAULT_MODEL = "gpt-image-2"
DEFAULT_FORMAT = "png"
SUPPORTED_REFERENCE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate or edit images through apiopencc.com's OpenAI-compatible "
            "image endpoints. Text-to-image uses /v1/images/generations by "
            "default; reference-image generation uses /v1/images/edits by default."
        )
    )
    parser.add_argument("prompt", help="Image prompt.")
    parser.add_argument(
        "-o",
        "--output",
        default="apiopencc_gpt_image_2.png",
        help="Output image path. Default: %(default)s",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("APIOPENCC_API_KEY") or os.environ.get("OPENAI_API_KEY"),
        help="API key. Prefer APIOPENCC_API_KEY env var. Do not commit keys.",
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("APIOPENCC_BASE_URL", DEFAULT_BASE_URL),
        help="API base URL. Default: %(default)s",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Model name.")
    parser.add_argument(
        "--size",
        help="Optional image size. When omitted, the provider determines dimensions from the prompt.",
    )
    parser.add_argument(
        "--endpoint",
        choices=["auto", "images", "edits", "responses"],
        default="auto",
        help=(
            "Endpoint mode. auto uses /v1/images/generations for text-to-image "
            "and /v1/images/edits when reference images are provided."
        ),
    )
    parser.add_argument(
        "--reference-image",
        "--ref",
        action="append",
        default=[],
        help=(
            "Reference image path or http(s) URL. Repeat for multiple references. "
            "Local PNG, JPG, WEBP, and non-animated GIF files are encoded as data URLs."
        ),
    )
    parser.add_argument(
        "--action",
        choices=["auto", "generate", "edit"],
        help=(
            "Image tool action. Defaults to 'edit' when reference images are provided, "
            "otherwise 'generate'."
        ),
    )
    parser.add_argument(
        "--quality",
        choices=["low", "medium", "high", "auto"],
        help="Optional generation quality. When omitted, the provider chooses its default.",
    )
    parser.add_argument(
        "--format",
        default=DEFAULT_FORMAT,
        choices=["png", "jpeg", "webp"],
        help="Output format. Default: %(default)s",
    )
    parser.add_argument(
        "--background",
        choices=["opaque", "transparent", "auto"],
        help="Optional image background setting.",
    )
    parser.add_argument(
        "--instructions",
        default="You are a helpful image generation assistant.",
        help="Optional system instructions for the response.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="Request timeout in seconds. Default: %(default)s",
    )
    parser.add_argument(
        "--save-json",
        help="Optional path to save the raw JSON response for debugging.",
    )
    return parser.parse_args()


def is_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def image_to_data_url(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Reference image not found: {path}")
    if not path.is_file():
        raise ValueError(f"Reference image is not a file: {path}")
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_REFERENCE_SUFFIXES:
        raise ValueError(
            "Unsupported reference image type. Use PNG, JPG, JPEG, WEBP, or non-animated GIF: "
            f"{path}"
        )

    mime_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def build_input(prompt: str, reference_images: list[str]) -> str | list[dict]:
    if not reference_images:
        return prompt

    content = [{"type": "input_text", "text": prompt}]
    for reference in reference_images:
        image_url = reference if is_url(reference) else image_to_data_url(Path(reference))
        content.append({"type": "input_image", "image_url": image_url})

    return [{"role": "user", "content": content}]


def reference_to_image_url(reference: str) -> str:
    return reference if is_url(reference) else image_to_data_url(Path(reference))


def download_reference_image(url: str, directory: Path, timeout: int) -> Path:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip()
            suffix = mimetypes.guess_extension(content_type) or Path(url.split("?", 1)[0]).suffix or ".png"
            if suffix.lower() not in SUPPORTED_REFERENCE_SUFFIXES:
                suffix = ".png"
            output = directory / f"reference-{len(list(directory.iterdir()))}{suffix}"
            output.write_bytes(response.read())
            return output
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} while downloading reference image: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error while downloading reference image: {exc}") from exc


def resolve_reference_paths(references: list[str], temp_dir: Path, timeout: int) -> list[Path]:
    paths: list[Path] = []
    for reference in references:
        if is_url(reference):
            paths.append(download_reference_image(reference, temp_dir, timeout))
        else:
            paths.append(Path(reference))
    return paths


def build_images_payload(args: argparse.Namespace, reference_field: str | None = None) -> dict:
    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "response_format": "b64_json",
    }
    if args.size:
        payload["size"] = args.size
    if args.quality:
        payload["quality"] = args.quality
    if reference_field and args.reference_image:
        payload[reference_field] = [reference_to_image_url(reference) for reference in args.reference_image]
    if args.format:
        payload["output_format"] = args.format
    if args.background:
        payload["background"] = args.background
    return payload


def build_responses_payload(args: argparse.Namespace) -> dict:
    tool = {
        "type": "image_generation",
        "output_format": args.format,
    }
    if args.size:
        tool["size"] = args.size
    if args.quality:
        tool["quality"] = args.quality
    # apiopencc's gpt-image-2 route currently treats action=generate inconsistently
    # and may fall back to a text response. Omit action for text-to-image generation,
    # while keeping edit explicit for reference-image requests.
    if args.action == "edit":
        tool["action"] = args.action
    elif args.reference_image and args.action != "generate":
        tool["action"] = "edit"
    if args.background:
        tool["background"] = args.background

    return {
        "model": args.model,
        "instructions": args.instructions,
        "input": build_input(args.prompt, args.reference_image),
        "tools": [tool],
    }


def choose_endpoint(args: argparse.Namespace) -> str:
    if args.endpoint != "auto":
        return args.endpoint
    return "edits" if args.reference_image else "images"


def post_json(url: str, api_key: str, payload: dict, timeout: int) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            try:
                return json.loads(body)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Non-JSON response from {url}: {body[:500]}") from exc
    except TimeoutError as exc:
        raise RuntimeError(f"Timeout after {timeout}s while calling {url}") from exc
    except socket.timeout as exc:
        raise RuntimeError(f"Timeout after {timeout}s while calling {url}") from exc
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def encode_multipart_form(fields: dict[str, str], files: list[tuple[str, Path]]) -> tuple[bytes, str]:
    boundary = f"----apiopencc-gpt-image-2-{os.urandom(12).hex()}"
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")
    for field_name, path in files:
        if not path.exists():
            raise FileNotFoundError(f"Reference image not found: {path}")
        if not path.is_file():
            raise ValueError(f"Reference image is not a file: {path}")
        suffix = path.suffix.lower()
        if suffix not in SUPPORTED_REFERENCE_SUFFIXES:
            raise ValueError(
                "Unsupported reference image type. Use PNG, JPG, JPEG, WEBP, or non-animated GIF: "
                f"{path}"
            )
        mime_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{path.name}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
        body.extend(path.read_bytes())
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def post_multipart_json(
    url: str,
    api_key: str,
    fields: dict[str, str],
    files: list[tuple[str, Path]],
    timeout: int,
) -> dict:
    body, content_type = encode_multipart_form(fields, files)
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            try:
                return json.loads(body)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Non-JSON response from {url}: {body[:500]}") from exc
    except TimeoutError as exc:
        raise RuntimeError(f"Timeout after {timeout}s while calling {url}") from exc
    except socket.timeout as exc:
        raise RuntimeError(f"Timeout after {timeout}s while calling {url}") from exc
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc


def is_unsupported_responses_endpoint_error(error: RuntimeError) -> bool:
    message = str(error).lower()
    return (
        "不支持该类型的端点调用" in message
        or "unsupported endpoint" in message
        or "not support" in message and "endpoint" in message
    )


def extract_images(response: dict) -> list[str]:
    images: list[str] = []
    for item in response.get("data", []) or []:
        if item.get("b64_json"):
            images.append(item["b64_json"])
    for item in response.get("output", []):
        if item.get("type") == "image_generation_call" and item.get("result"):
            images.append(item["result"])
    return images


def extract_image_urls(response: dict) -> list[str]:
    urls: list[str] = []
    for item in response.get("data", []) or []:
        if item.get("url"):
            urls.append(item["url"])
    for item in response.get("output", []) or []:
        if item.get("type") == "image_generation_call":
            if item.get("url"):
                urls.append(item["url"])
            elif item.get("result_url"):
                urls.append(item["result_url"])
    return urls


def download_image_url(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read()
    except TimeoutError as exc:
        raise RuntimeError(f"Timeout after {timeout}s while downloading image") from exc
    except socket.timeout as exc:
        raise RuntimeError(f"Timeout after {timeout}s while downloading image") from exc
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} while downloading image: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error while downloading image: {exc}") from exc


def ensure_suffix(path: Path, output_format: str) -> Path:
    if path.suffix:
        return path
    suffix = mimetypes.guess_extension(f"image/{output_format}") or f".{output_format}"
    return path.with_suffix(suffix)


def post_images_generation_variants(args: argparse.Namespace, base_url: str) -> tuple[dict, str]:
    endpoint = f"{base_url}/v1/images/generations"
    reference_fields = ["reference_images", "image_urls"] if args.reference_image else [None]
    errors: list[str] = []
    for reference_field in reference_fields:
        payload = build_images_payload(args, reference_field=reference_field)
        try:
            response = post_json(endpoint, args.api_key, payload, args.timeout)
            suffix = f":{reference_field}" if reference_field else ""
            return response, f"images{suffix}"
        except RuntimeError as exc:
            errors.append(f"{reference_field or 'text'}: {exc}")
    raise RuntimeError("; ".join(errors))


def post_image_edits_variants(args: argparse.Namespace, base_url: str) -> tuple[dict, str]:
    endpoint = f"{base_url}/v1/images/edits"
    fields = {
        "model": args.model,
        "prompt": args.prompt,
        "response_format": "b64_json",
    }
    if args.size:
        fields["size"] = args.size
    if args.quality:
        fields["quality"] = args.quality
    if args.format:
        fields["output_format"] = args.format
    if args.background:
        fields["background"] = args.background
    field_variants = [fields, {key: value for key, value in fields.items() if key != "response_format"}]
    errors: list[str] = []
    with tempfile.TemporaryDirectory(prefix="apiopencc-gpt-image-refs-") as temp_root:
        reference_paths = resolve_reference_paths(args.reference_image, Path(temp_root), args.timeout)
        for image_field in ("image[]", "image"):
            files = [(image_field, path) for path in reference_paths]
            for variant in field_variants:
                try:
                    response = post_multipart_json(endpoint, args.api_key, variant, files, args.timeout)
                    suffix = "" if variant is fields else ":no-response-format"
                    return response, f"edits:{image_field}{suffix}"
                except RuntimeError as exc:
                    errors.append(f"{image_field}: {exc}")
    raise RuntimeError("; ".join(errors))


def post_responses_image_generation(args: argparse.Namespace, base_url: str) -> tuple[dict, str]:
    endpoint = f"{base_url}/v1/responses"
    payload = build_responses_payload(args)
    try:
        return post_json(endpoint, args.api_key, payload, args.timeout), "responses"
    except RuntimeError as exc:
        if '"action"' not in str(exc) and "action" not in str(exc).lower():
            raise
        payload["tools"][0].pop("action", None)
        return post_json(endpoint, args.api_key, payload, args.timeout), "responses:no-action"


def post_auto_image_generation(args: argparse.Namespace, base_url: str) -> tuple[dict, str]:
    if not args.reference_image:
        return post_images_generation_variants(args, base_url)

    errors: list[str] = []
    for label, poster in (
        ("edits", post_image_edits_variants),
        ("responses", post_responses_image_generation),
        ("images", post_images_generation_variants),
    ):
        try:
            return poster(args, base_url)
        except RuntimeError as exc:
            errors.append(f"{label}: {exc}")
    raise RuntimeError("; ".join(errors))


def main() -> int:
    args = parse_args()
    if not args.api_key:
        print(
            "Missing API key. Set APIOPENCC_API_KEY or pass --api-key.",
            file=sys.stderr,
        )
        return 2

    base_url = args.base_url.rstrip("/")
    endpoint_mode = choose_endpoint(args)
    try:
        if args.endpoint == "auto":
            response, endpoint_mode = post_auto_image_generation(args, base_url)
        elif endpoint_mode == "images":
            response, endpoint_mode = post_images_generation_variants(args, base_url)
        elif endpoint_mode == "edits":
            response, endpoint_mode = post_image_edits_variants(args, base_url)
        else:
            response, endpoint_mode = post_responses_image_generation(args, base_url)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    if args.save_json:
        json_path = Path(args.save_json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(response, ensure_ascii=False, indent=2), encoding="utf-8")

    if response.get("error"):
        print(json.dumps(response["error"], ensure_ascii=False), file=sys.stderr)
        return 1

    images = extract_images(response)
    image_urls = extract_image_urls(response) if not images else []
    if not images and not image_urls:
        print(
            "No generated image found in response data[].b64_json, data[].url, "
            "output[].image_generation_call.result, or output[].image_generation_call.url.",
            file=sys.stderr,
        )
        print(json.dumps(response, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1

    output_path = ensure_suffix(Path(args.output), args.format)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if images:
        output_path.write_bytes(base64.b64decode(images[0]))
    else:
        output_path.write_bytes(download_image_url(image_urls[0], args.timeout))

    print(f"endpoint={endpoint_mode}")
    print(f"status={response.get('status', 'completed')}")
    print(f"model={response.get('model')}")
    print(f"saved={output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
