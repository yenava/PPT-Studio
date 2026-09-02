# Image to Editable Text PPT Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable Codex skill that converts visual slide sources into PPTX files with one text-free background image per slide and editable OCR-derived text boxes.

**Architecture:** Bundle a small Python runtime with explicit prepare, build, and validate commands. Preparation normalizes input, calls PaddleOCR, derives masks and text styles, while Codex image editing creates the clean bases; the builder and validator remain deterministic and local.

**Tech Stack:** Python 3.10+, Pillow, NumPy, Requests, python-pptx, unittest, Poppler, LibreOffice, and Codex/OpenAI image editing.

---

### Task 1: Initialize the skill scaffold

**Files:**
- Create: `skills/image-to-editable-text-ppt/SKILL.md`
- Create: `skills/image-to-editable-text-ppt/agents/openai.yaml`
- Create: `skills/image-to-editable-text-ppt/scripts/`
- Create: `skills/image-to-editable-text-ppt/references/`

**Steps:**

1. Run the official `init_skill.py` with `scripts,references` resources and deterministic UI metadata.
2. Run `quick_validate.py` and confirm the untouched scaffold is structurally valid.
3. Do not commit because the current workspace is not a Git repository.

### Task 2: Add the shared runtime model and configuration

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/textppt_common.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_common.py`

**Steps:**

1. Write failing tests for JSON writing, run/page discovery, token precedence, and private config permissions.
2. Run `python -m unittest ...` and verify the tests fail because the module is missing.
3. Implement path helpers, atomic JSON output, token loading, secure token configuration, and shared constants.
4. Run the tests and expect all common-runtime tests to pass.

### Task 3: Normalize inputs

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/normalize_inputs.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_normalize_inputs.py`

**Steps:**

1. Write tests for image normalization, PDF rendering, ordering, and invalid input handling.
2. Implement image conversion through Pillow and PDF rendering through Poppler `pdftoppm`.
3. Implement PPT/PPTX rendering through a local LibreOffice-to-PDF conversion with an actionable missing-tool error.
4. Write `run.json` with page order, source provenance, dimensions, and the chosen slide aspect ratio.
5. Run normalization tests and a synthetic two-page smoke test.

### Task 4: Integrate PaddleOCR and derive page artifacts

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/paddle_ocr.py`
- Create: `skills/image-to-editable-text-ppt/scripts/prepare_run.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_paddle_ocr.py`

**Steps:**

1. Write mocked tests for job submission, polling, JSONL parsing, retry behavior, and authentication failure.
2. Implement the PaddleOCR-VL jobs API without logging tokens.
3. Parse text-like layout blocks into `ocr.json` with scaled pixel coordinates.
4. Generate an expanded grayscale `text-mask.png`, an OCR overlay, and `clean-base-prompt.md`.
5. Estimate per-line font size, color, contrast confidence, and alignment from source pixels.
6. Run mocked tests and verify no network access is required by the test suite.

### Task 5: Add clean-base verification

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/check_clean_base.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_check_clean_base.py`

**Steps:**

1. Write tests for missing output, dimension mismatch, non-overlapping OCR, residual overlapping OCR, and retry metadata.
2. Implement a command that submits `clean_base.png` to PaddleOCR and compares returned boxes with original OCR regions.
3. Generate an enlarged retry mask and retry prompt when residual text is found on attempt one.
4. Fail the page after attempt two and preserve the evidence in `clean-base-check.json`.

### Task 6: Build the PowerPoint deck

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/build_pptx.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_build_pptx.py`

**Steps:**

1. Write a test that builds a synthetic slide and inspects it through `python-pptx`.
2. Add one full-slide clean-base image per page.
3. Add one native text box per accepted OCR entry using mapped coordinates, uniform font, sampled color, box-derived size, alignment, and transparent fill/line.
4. Add bounded font-size reduction for text that would otherwise exceed its box.
5. Run the builder tests and inspect the object counts and text values.

### Task 7: Validate outputs

**Files:**
- Create: `skills/image-to-editable-text-ppt/scripts/validate_output.py`
- Create: `skills/image-to-editable-text-ppt/tests/test_validate_output.py`

**Steps:**

1. Write failing tests for a valid deck and for slide-count, image-count, text-count, bounds, and residual-text failures.
2. Implement package, slide, media, text-content, bounds, source-dimension, and clean-base-check validation.
3. Write deterministic `validation.json` with top-level `passed` and page-level findings.
4. Run validation tests and confirm failures produce actionable reasons.

### Task 8: Write the skill workflow and references

**Files:**
- Modify: `skills/image-to-editable-text-ppt/SKILL.md`
- Modify: `skills/image-to-editable-text-ppt/agents/openai.yaml`
- Create: `skills/image-to-editable-text-ppt/references/runtime.md`
- Create: `skills/image-to-editable-text-ppt/references/clean-base.md`

**Steps:**

1. Write concise triggering metadata for image/PDF/image-based PPT to editable-text PPT requests.
2. Document credential handling, required image-edit calls, retry loop, build command, and validation gate.
3. Keep detailed command syntax and prompt requirements in one-level references.
4. Ensure the workflow never separates non-text visual elements.

### Task 9: Final verification

**Files:**
- Test: `skills/image-to-editable-text-ppt/tests/`

**Steps:**

1. Run the full offline unit-test suite.
2. Run `compileall` over bundled scripts.
3. Run a synthetic end-to-end prepare-artifacts/build/validate smoke test with mocked OCR data and a generated clean base.
4. Run the official `quick_validate.py` against the skill folder.
5. Search the skill tree for the supplied PaddleOCR credential and confirm zero matches without printing the credential.
6. Report the created skill path, test results, and the secure configuration command.
