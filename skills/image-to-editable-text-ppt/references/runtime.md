# Runtime reference

## Contents

- Dependencies
- Credentials
- Commands
- Run layout
- Input constraints
- Troubleshooting

## Dependencies

Python 3.10 or newer is required. Install the bundled Python dependencies into an isolated environment:

```bash
python -m pip install -r <skill-root>/requirements.txt
```

Required packages are Pillow, NumPy, Requests, python-pptx, and OpenAI (only for API-key image fallback).

Additional binaries depend on the input type:

- Images: no additional binary.
- PDF: `pdftoppm` from Poppler.
- PPT/PPTX: LibreOffice `soffice`; the runtime converts the presentation to PDF and then renders it.

All pages in one run must have the same aspect ratio within 1%. PowerPoint uses one slide size for the entire deck.

## Credentials

PaddleOCR token lookup order:

1. `PADDLE_OCR_TOKEN` environment variable.
2. `~/.image-to-editable-text-ppt/config.json`.

Create the private config interactively, without placing the token in shell history:

```bash
python <skill-root>/scripts/configure_token.py
```

The writer uses directory mode `0700` and file mode `0600` when the platform supports POSIX permissions.

Image-edit backend lookup order:

1. Codex OAuth from `~/.codex/auth.json` or `CODEX_AUTH_FILE`.
2. `OPENAI_API_KEY`, with optional `OPENAI_BASE_URL`.

The runtime never copies image-backend credentials into the run directory.

## Commands

Prepare:

```bash
python <skill-root>/scripts/prepare_run.py <input...> --run-dir <absolute-run-dir> [--dpi 144]
```

Edit one page:

```bash
python <skill-root>/scripts/image_edit.py <absolute-page-dir> [--attempt 1|2]
```

Check one clean base:

```bash
python <skill-root>/scripts/check_clean_base.py <absolute-page-dir> [--attempt 1|2]
```

Build:

```bash
python <skill-root>/scripts/build_pptx.py <absolute-run-dir> --out <absolute-output.pptx> [--font "PingFang SC"]
```

Validate:

```bash
python <skill-root>/scripts/validate_output.py <absolute-run-dir> <absolute-output.pptx>
```

## Run layout

```text
run/
├── run.json
├── pages/
│   └── page_NNN/
│       ├── source.png
│       ├── ocr.json
│       ├── ocr-overlay.png
│       ├── text-mask.png
│       ├── clean-base-prompt.md
│       ├── clean_base.png
│       ├── clean-base-ocr.json
│       └── clean-base-check.json
├── output.pptx
└── validation.json
```

On a repair attempt, the page also contains `retry-mask.png` and `retry-clean-base-prompt.md`.

## Input constraints

- Images must be readable by Pillow.
- PDFs must render successfully through Poppler.
- PPT/PPTX input is rendered as it appears; existing native objects are not preserved.
- Mixed page aspect ratios are rejected.
- Password-protected or corrupt source files are rejected.

## Troubleshooting

- `Missing PaddleOCR token`: set the environment variable or run `configure_token.py`.
- `authentication failed`: replace the Paddle token; do not retry with the same rejected credential.
- `quota or rate limit`: wait or resolve the account quota before resuming.
- `No image backend credentials`: run `codex login` or configure an Images API key.
- `retry_image_edit`: run attempt two using the generated retry mask and prompt.
- `blocked`: the second clean-base attempt retained text; inspect the page artifacts and do not build the deck.
- `same aspect ratio`: split the inputs into separate decks or normalize their canvas sizes before preparing.

