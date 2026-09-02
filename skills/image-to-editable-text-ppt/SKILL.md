---
name: image-to-editable-text-ppt
description: Convert slide screenshots, images, scanned or visual PDFs, and image-based PPT/PPTX files into PowerPoint decks where the original non-text visuals remain as one full-slide image and OCR-recovered text becomes editable native text boxes. Use for requests such as "把图片还原成可编辑PPT", "make the text in this slide image editable", "convert this scanned deck to PPT", or any visual-slide conversion where only text needs to be editable and other elements should stay flattened.
---

# Image to Editable Text PPT

## Objective

Create a `.pptx` with exactly two visual layers per slide:

1. One full-slide image with all source text removed.
2. Native PowerPoint text boxes reconstructed from Baidu PaddleOCR.

Never split, redraw, or separately generate icons, charts, photographs, shapes, or other non-text elements.

## Required reading

- Read [references/runtime.md](references/runtime.md) before running commands.
- Read [references/clean-base.md](references/clean-base.md) before creating or repairing a clean base.

## Entry contract

- Treat a request to perform this conversion as authorization to send task-local pages to the configured PaddleOCR and image-editing backends. If the user says the files are confidential, local-only, or must not be uploaded, stop because this skill has no offline OCR or offline image-edit fallback.
- Never place tokens, API keys, Codex auth contents, or authorization headers in prompts, run files, logs, source code, or the final deck.
- Use `PADDLE_OCR_TOKEN` or the private config written by `scripts/configure_token.py`. Never pass a token on a command line.
- Prefer Codex OAuth for image editing; use `OPENAI_API_KEY` only when already configured by the user.
- Use absolute paths for inputs, run directories, pages, and outputs.
- Do not hand-edit `run.json`, `ocr.json`, `clean-base-check.json`, or `validation.json`.

## Workflow

### 1. Preflight

Check the Python dependencies and input-specific tools described in `references/runtime.md`. If the Paddle token is missing, ask the user to set `PADDLE_OCR_TOKEN` or run the interactive private-config command. Do not echo or restate a token supplied by the user.

Choose the font once. Use the user's font when specified; otherwise use `PingFang SC`.

### 2. Prepare the run

Run:

```bash
python <skill-root>/scripts/prepare_run.py <input...> --run-dir <absolute-run-dir>
```

This normalizes inputs, calls PaddleOCR, and writes `source.png`, `ocr.json`, `text-mask.png`, `ocr-overlay.png`, and `clean-base-prompt.md` for each page. A page with no OCR text is copied directly to `clean_base.png` and marked passed.

PaddleOCR receives the source pages. In a network-restricted environment, request approval before this command and state that only user-requested slide pages are uploaded for OCR.

### 3. Create and verify clean bases

Process pages sequentially. For every page that has OCR entries and no passing `clean-base-check.json`, run:

```bash
python <skill-root>/scripts/image_edit.py <absolute-page-dir> --attempt 1
python <skill-root>/scripts/check_clean_base.py <absolute-page-dir> --attempt 1
```

The image-edit command sends only `source.png`, the text mask, and the page-local clean-base prompt to Codex Images or the user's configured OpenAI-compatible Images API.

If checking exits with code `2` and `next_action` is `retry_image_edit`, run exactly one repair:

```bash
python <skill-root>/scripts/image_edit.py <absolute-page-dir> --attempt 2
python <skill-root>/scripts/check_clean_base.py <absolute-page-dir> --attempt 2
```

Stop if attempt two fails. Never build editable text over a raster image that still contains overlapping source text.

### 4. Build the deck

After every page has a passing clean-base check, run:

```bash
python <skill-root>/scripts/build_pptx.py <absolute-run-dir> --out <absolute-output.pptx> --font "<font name>"
```

The builder adds one clean-base picture and one text box per OCR entry. It maps positions from source pixels, estimates font size from box geometry, samples text color from the source, and uses the selected font uniformly.

### 5. Validate and deliver

Run:

```bash
python <skill-root>/scripts/validate_output.py <absolute-run-dir> <absolute-output.pptx>
```

Deliver the PPTX only when `validation.json` has top-level `passed: true`. Report the output path, selected font, slide count, low-confidence OCR entries, and whether any page required the second clean-base attempt.

## Resume rules

- Reuse an existing run only when its `run.json` matches the requested inputs.
- Skip pages whose `clean-base-check.json` already passes.
- Resume a page at the action recorded in `clean-base-check.json.next_action`.
- Never overwrite a completed PPTX without explicit user authorization; choose a new output filename instead.

