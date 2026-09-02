from __future__ import annotations

import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))


class CommonTests(unittest.TestCase):
    def test_token_environment_takes_precedence_and_config_is_private(self):
        from textppt_common import load_paddle_token, write_private_config

        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            write_private_config(config, {"PADDLE_OCR_TOKEN": "config-token"})
            self.assertEqual(stat.S_IMODE(config.stat().st_mode), 0o600)
            with mock.patch.dict(os.environ, {"PADDLE_OCR_TOKEN": "env-token"}):
                self.assertEqual(load_paddle_token(config), "env-token")

    def test_atomic_json_round_trip(self):
        from textppt_common import read_json, write_json

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested" / "data.json"
            write_json(path, {"text": "中文", "value": 3})
            self.assertEqual(read_json(path)["text"], "中文")


class OCRArtifactTests(unittest.TestCase):
    def _source(self, path: Path) -> None:
        image = Image.new("RGB", (400, 225), "white")
        draw = ImageDraw.Draw(image)
        draw.rectangle((40, 50, 250, 90), fill=(20, 30, 40))
        image.save(path)

    def test_pruned_result_generates_text_entry_and_mask(self):
        from prepare_run import build_mask, pruned_result_to_ocr

        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.png"
            mask = Path(tmp) / "mask.png"
            self._source(source)
            pruned = {
                "width": 800,
                "height": 450,
                "parsing_res_list": [
                    {
                        "block_label": "paragraph_title",
                        "block_content": "Editable title",
                        "block_bbox": [80, 100, 500, 180],
                        "score": 0.92,
                    },
                    {
                        "block_label": "image",
                        "block_content": "ignored",
                        "block_bbox": [0, 0, 800, 450],
                    },
                ],
            }
            ocr = pruned_result_to_ocr(pruned, source, slide_width_in=13.333)
            self.assertEqual(len(ocr["entries"]), 1)
            self.assertEqual(ocr["entries"][0]["text"], "Editable title")
            self.assertEqual(ocr["entries"][0]["box_px"], [40, 50, 210, 40])
            self.assertEqual(ocr["entries"][0]["color_hex"], "141E28")
            build_mask(ocr, mask, margin_px=4)
            with Image.open(mask) as image:
                self.assertEqual(image.getpixel((38, 48)), 255)
                self.assertEqual(image.getpixel((10, 10)), 0)

    def test_residual_overlap_detection(self):
        from check_clean_base import residual_entries

        original = {"entries": [{"id": "T001", "box_px": [10, 10, 100, 30]}]}
        clean = {
            "entries": [
                {"id": "R001", "text": "still here", "box_px": [20, 12, 80, 25]},
                {"id": "R002", "text": "elsewhere", "box_px": [250, 120, 80, 20]},
            ]
        }
        residual = residual_entries(original, clean, overlap_threshold=0.25)
        self.assertEqual([item["id"] for item in residual], ["R001"])

    def test_paddle_result_parser_and_auth_failure(self):
        from paddle_ocr import PaddleOCRClient, PaddleOCRError, parse_result_jsonl

        payload = {
            "result": {
                "layoutParsingResults": [
                    {"prunedResult": {"width": 100, "height": 50, "parsing_res_list": []}}
                ]
            }
        }
        self.assertEqual(parse_result_jsonl(json.dumps(payload))[0]["width"], 100)

        class Response:
            status_code = 401

            def raise_for_status(self):
                raise AssertionError("authentication should be handled before raise_for_status")

        class Session:
            @staticmethod
            def post(*args, **kwargs):
                return Response()

        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "page.png"
            Image.new("RGB", (10, 10), "white").save(source)
            with self.assertRaisesRegex(PaddleOCRError, "authentication failed"):
                PaddleOCRClient("not-a-real-token", session=Session()).recognize(source)


class NormalizationTests(unittest.TestCase):
    def test_images_are_normalized_in_input_order(self):
        from normalize_inputs import normalize_inputs

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            first = root / "first.png"
            second = root / "second.jpg"
            Image.new("RGB", (160, 90), "red").save(first)
            Image.new("RGB", (320, 180), "blue").save(second)
            manifest = normalize_inputs([first, second], root / "run")
            self.assertEqual(
                [page["source_input"] for page in manifest["pages"]],
                [str(first.resolve()), str(second.resolve())],
            )
            self.assertEqual(manifest["pages"][1]["id"], "page_002")

    def test_mixed_aspect_ratios_are_rejected(self):
        from normalize_inputs import normalize_inputs

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            first = root / "wide.png"
            second = root / "square.png"
            Image.new("RGB", (160, 90), "red").save(first)
            Image.new("RGB", (100, 100), "blue").save(second)
            with self.assertRaisesRegex(ValueError, "same aspect ratio"):
                normalize_inputs([first, second], root / "run")


class ImageBackendTests(unittest.TestCase):
    def test_requested_size_respects_gpt_image_2_limits(self):
        from image_edit import _requested_size

        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "large.png"
            Image.new("RGB", (5000, 3750), "white").save(source)
            width, height = (int(value) for value in _requested_size(source).split("x"))
            self.assertLessEqual(max(width, height), 3840)
            self.assertLessEqual(width * height, 8_294_400)
            self.assertEqual(width % 16, 0)
            self.assertEqual(height % 16, 0)

    def test_api_mask_makes_white_guide_regions_transparent(self):
        from image_edit import _api_mask_bytes

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "mask.png"
            mask = Image.new("L", (4, 4), 0)
            mask.putpixel((1, 1), 255)
            mask.save(path)
            from io import BytesIO

            with Image.open(BytesIO(_api_mask_bytes(path))) as api_mask:
                self.assertEqual(api_mask.getpixel((0, 0))[3], 255)
                self.assertEqual(api_mask.getpixel((1, 1))[3], 0)


class DeckTests(unittest.TestCase):
    def test_build_and_validate_synthetic_deck(self):
        from build_pptx import build_deck
        from validate_output import validate_deck

        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp) / "run"
            page = run / "pages" / "page_001"
            page.mkdir(parents=True)
            source = Image.new("RGB", (400, 225), (240, 240, 240))
            source.save(page / "source.png")
            source.save(page / "clean_base.png")
            (run / "run.json").write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "slide_width_in": 13.333,
                        "slide_height_in": 7.4998125,
                        "pages": [{"id": "page_001", "width_px": 400, "height_px": 225}],
                    }
                ),
                encoding="utf-8",
            )
            (page / "ocr.json").write_text(
                json.dumps(
                    {
                        "source": {"width_px": 400, "height_px": 225},
                        "entries": [
                            {
                                "id": "T001",
                                "text": "Editable text",
                                "box_px": [40, 50, 200, 40],
                                "font_pt": 24,
                                "color_hex": "112233",
                                "alignment": "left",
                                "confidence": 0.9,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            (page / "clean-base-check.json").write_text(
                json.dumps({"passed": True, "attempt": 1, "residual_count": 0}),
                encoding="utf-8",
            )
            output = run / "output.pptx"
            build_deck(run, output, font_name="PingFang SC")
            report = validate_deck(run, output)
            self.assertTrue(report["passed"], report)
            self.assertEqual(report["pages"][0]["text_box_count"], 1)


if __name__ == "__main__":
    unittest.main()
