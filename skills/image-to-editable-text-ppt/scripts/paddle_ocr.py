#!/usr/bin/env python3
from __future__ import annotations

import json
import random
import time
from pathlib import Path
from typing import Any

import requests


JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
DEFAULT_MODEL = "PaddleOCR-VL-1.6"


class PaddleOCRError(RuntimeError):
    pass


def parse_result_jsonl(value: str) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for raw in value.splitlines():
        if not raw.strip():
            continue
        try:
            payload = json.loads(raw)
            results = payload["result"]["layoutParsingResults"]
            pages.extend(item["prunedResult"] for item in results)
        except (KeyError, TypeError, json.JSONDecodeError) as exc:
            raise PaddleOCRError("PaddleOCR returned an invalid JSONL result.") from exc
    if not pages:
        raise PaddleOCRError("PaddleOCR returned no pages.")
    return pages


class PaddleOCRClient:
    def __init__(
        self,
        token: str,
        *,
        model: str = DEFAULT_MODEL,
        timeout: int = 300,
        retries: int = 3,
        session: Any = requests,
    ) -> None:
        if not token.strip():
            raise PaddleOCRError("Missing PaddleOCR token. Set PADDLE_OCR_TOKEN or run configure_token.py.")
        self._token = token.strip()
        self.model = model
        self.timeout = timeout
        self.retries = retries
        self.session = session

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"bearer {self._token}"}

    def _retry(self, method: str, url: str, **kwargs):
        last_error: Exception | None = None
        for attempt in range(self.retries):
            try:
                response = getattr(self.session, method)(url, **kwargs)
                if response.status_code in {401, 403}:
                    raise PaddleOCRError("PaddleOCR authentication failed; check the configured token.")
                if response.status_code in {402, 429}:
                    raise PaddleOCRError(f"PaddleOCR quota or rate limit error ({response.status_code}).")
                if response.status_code >= 500:
                    raise requests.RequestException(f"server error {response.status_code}")
                response.raise_for_status()
                return response
            except PaddleOCRError:
                raise
            except (requests.RequestException, TimeoutError) as exc:
                last_error = exc
                if attempt + 1 >= self.retries:
                    break
                time.sleep((2**attempt) * random.uniform(0.8, 1.2))
        raise PaddleOCRError(f"PaddleOCR request failed after {self.retries} attempts: {last_error}")

    def recognize(self, source: str | Path) -> dict[str, Any]:
        source = Path(source)
        optional = {
            "useDocOrientationClassify": False,
            "useDocUnwarping": False,
            "useChartRecognition": False,
        }
        with source.open("rb") as handle:
            response = self._retry(
                "post",
                JOB_URL,
                headers=self.headers,
                data={"model": self.model, "optionalPayload": json.dumps(optional)},
                files={"file": handle},
                timeout=60,
            )
        try:
            job_id = response.json()["data"]["jobId"]
        except (KeyError, TypeError, ValueError) as exc:
            raise PaddleOCRError("PaddleOCR submission response did not contain a job id.") from exc

        started = time.monotonic()
        status: dict[str, Any] = {}
        while True:
            response = self._retry("get", f"{JOB_URL}/{job_id}", headers=self.headers, timeout=60)
            try:
                status = response.json()["data"]
                state = status["state"]
            except (KeyError, TypeError, ValueError) as exc:
                raise PaddleOCRError("PaddleOCR status response was invalid.") from exc
            if state == "done":
                break
            if state == "failed":
                raise PaddleOCRError(f"PaddleOCR job failed: {status.get('errorMsg', 'unknown error')}")
            if time.monotonic() - started > self.timeout:
                raise PaddleOCRError(f"PaddleOCR job timed out after {self.timeout}s (state={state}).")
            time.sleep(3)

        try:
            result_url = status["resultUrl"]["jsonUrl"]
        except (KeyError, TypeError) as exc:
            raise PaddleOCRError("PaddleOCR completed without a JSON result URL.") from exc
        result = self._retry("get", result_url, timeout=60)
        return parse_result_jsonl(result.text)[0]

