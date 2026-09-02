# Image to Editable Text PPT Skill Design

## Goal

Create a Codex skill that converts slide images, PDFs, or image-based PowerPoint files into PowerPoint decks where only the text is editable. Each output slide contains one full-slide image with all source text removed plus native PowerPoint text boxes reconstructed from Baidu PaddleOCR results.

## Scope

The skill must preserve non-text visual content as one flattened image. It must not split icons, charts, photos, decorative shapes, or other graphical elements into separate PowerPoint objects. Text must be editable, positioned from OCR coordinates, colored from source-image sampling, and sized from the OCR box geometry. All text uses a user-selected font or `PingFang SC` by default.

Supported inputs are common image formats, PDF, and PPT/PPTX. The output is always `.pptx`. Native speaker-note recovery and arbitrary editing of non-text elements are out of scope.

## Architecture

Use a self-contained lightweight runtime bundled with the skill:

1. Normalize inputs into `pages/page_NNN/source.png` files.
2. Submit the normalized pages to Baidu PaddleOCR-VL using a token read from `PADDLE_OCR_TOKEN` or a mode-`0600` user config file. Never embed credentials in the skill or run artifacts.
3. Convert OCR text blocks into a stable per-page manifest. Preserve text, bounding boxes, confidence when available, and source dimensions.
4. Generate an expanded text mask and a deterministic image-editing prompt for every page.
5. Use the bundled masked image-edit command with Codex OAuth or the user's configured OpenAI-compatible Images API to create `clean_base.png`, removing all text while preserving every non-text visual element and the original canvas geometry.
6. Re-run OCR on the clean base. Retry image editing once with a larger mask if recognizable text remains inside the original text regions.
7. Build the PPTX with one full-slide `clean_base.png` and native text boxes. Use sampled text color, box-derived font size, and a uniform font.
8. Validate slide count, package integrity, image/text object counts, text-box bounds, and residual text. Write `validation.json`.

## Run Artifacts

Each run contains:

```text
run/
├── run.json
├── pages/
│   └── page_NNN/
│       ├── source.png
│       ├── ocr.json
│       ├── text-mask.png
│       ├── clean-base-prompt.md
│       ├── clean_base.png
│       └── clean-base-ocr.json
├── output.pptx
└── validation.json
```

The runtime owns JSON generation. The agent only invokes the scripts and the image-editing tool; it must not hand-edit OCR or validation state.

## OCR and Credentials

Use `https://paddleocr.aistudio-app.com/api/v2/ocr/jobs` with the PaddleOCR-VL model. Retry transient submission, polling, and result-download failures up to three times with exponential backoff. Missing credentials, authentication failures, quota failures, and invalid responses are terminal and must produce actionable messages.

The user-provided token must never appear in `SKILL.md`, source code, prompts, run manifests, logs, or tests. Configuration supports the environment variable first and `~/.image-to-editable-text-ppt/config.json` second. The config writer creates the directory privately and saves the file with mode `0600`.

## Clean-Base Generation

The mask covers OCR polygons expanded enough to remove glyph antialiasing, shadows, outlines, and glow. The prompt requires preserving canvas dimensions, layout, object positions, object sizes, colors, textures, photographs, illustrations, charts, and whitespace. It forbids adding new text, symbols, objects, or stylistic reinterpretation.

The original source image and mask are passed to the image-editing tool. After generation, OCR checks only for residual text overlapping original OCR regions. One repair retry is allowed with a larger mask; a second failure blocks that page rather than layering duplicate editable text over residual raster text.

## Text Reconstruction

Create one PowerPoint text box per OCR text block or line. Map source pixels to slide coordinates independently on each axis. Estimate font size from box height and line count, clamp it to a reasonable range, and reduce it when the text does not fit. Use the requested font for all text.

Estimate text color by comparing pixels inside the OCR region with a surrounding background ring and choosing the dominant high-contrast foreground cluster. If confidence is poor, use whichever of black or white has better contrast against the sampled background. Preserve line breaks and choose left, center, or right alignment from the OCR box position and observed ink distribution when reliable; otherwise use left alignment.

## Validation

A passing result must satisfy all of the following:

- The PPTX is a valid ZIP package and opens through `python-pptx`.
- Slide count matches normalized page count.
- Every slide contains exactly one full-slide clean-base image.
- Native text-box count matches accepted OCR entries.
- Every text box stays within slide bounds and contains the expected text.
- Every clean base has the same pixel dimensions as its source page.
- No OCR text on the clean base overlaps an original OCR region above the configured threshold.
- `validation.json` records page-level counts, low-confidence entries, retry counts, warnings, and failures.

## Failure Policy

Do not silently downgrade to offline OCR. Stop on missing Paddle credentials or a real Paddle service failure. Do not build slides when `clean_base.png` is absent, has the wrong dimensions, or still contains source text after the allowed retry. Preserve successful page artifacts so a later run can resume from the failed page.
