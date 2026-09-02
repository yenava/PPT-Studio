# PPT Studio API Contract

This contract maps the product UI to the existing `ppt-design` Skill workflow.

## Project

### `GET /api/projects`

Lists persisted project snapshots from `work/product-app-projects/*/project.json`.

### `POST /api/projects`

Creates a project folder with the canonical Skill structure:

```text
source/
outline/
visual/candidates/
visual/pages/pilot/
visual/pages/final/
pptx/
style-capture/
```

Response:

```json
{
  "project_id": "20260701-ai-sales-review",
  "status": "material_intake"
}
```

### `POST /api/projects/:id/sync`

Persists the browser project snapshot into `work/product-app-projects/:id/project.json`.

### `POST /api/projects/:id/uploads`

Inputs:

```json
{
  "kind": "files",
  "name": "source.md",
  "type": "text/markdown",
  "size": 1024,
  "dataBase64": "..."
}
```

Server action:

- `kind: files` -> `source/files/`
- `kind: references` -> `source/references/`

## Material Understanding

### `POST /api/projects/:id/analyze`

Inputs:

- uploaded source files
- pasted text
- optional visual reference images

Server action:

- call an LLM to create `outline/ppt-outline.md`
- call an LLM to create `outline/project-profile.json`

Response:

```json
{
  "outline_path": "outline/ppt-outline.md",
  "profile_path": "outline/project-profile.json",
  "page_count": 10
}
```

## Visual Preview

### `POST /api/projects/:id/visual-previews`

Server action:

1. Search reusable templates:

```bash
python ppt-design/scripts/style_library.py search \
  --profile work/:id/outline/project-profile.json \
  --limit 3 \
  --json
```

2. Call the project-vendored `$new-imagegen` script at `product-app/scripts/apiopencc_gpt_image_2.py` for AI preview variants.
3. Save `visual/candidates/style-ai-*.png` and `visual/candidates/style-ai-*-prompt.md`.

Response:

```json
{
  "candidates": [
    {
      "id": "style-a",
      "image": "visual/candidates/style-a.png",
      "prompt": "visual/candidates/style-a-prompt.md",
      "source": "library"
    }
  ]
}
```

## Confirm Style

### `POST /api/projects/:id/confirm-style`

Persists selected visual style and stores accepted style metadata for reuse.

## Generate Slide Images

### `POST /api/projects/:id/slides/pilot`

Generates up to the first four slide images into `visual/pages/pilot/`.

When `project.compositionMode` is `hybrid`, normal content pages use this pipeline:

1. Generate only the body image into `visual/pages/pilot/content/slide-XX-content.png`.
2. Draw the fixed title, background, footer, and page number with code.
3. Save the 1920x1080 result as `visual/pages/pilot/slide-XX.png`.
4. Save the composition contract as `slide-XX-composition.json`.

`compositionMode: full-page` preserves the master-reference full-page generation path.

### `POST /api/projects/:id/slides/final`

Generates remaining slide images into `visual/pages/final/` after pilot approval.

## Build PPTX

### `POST /api/projects/:id/pptx`

Server action:

1. Generate any missing final slide images into `visual/pages/final/`.
2. Assemble the PPTX:

```bash
python ppt-design/scripts/build_image_pptx.py \
  --images work/:id/visual/pages/final \
  --out work/:id/pptx/final-image-deck.pptx \
  --fit cover
```

Response:

```json
{
  "pptx": "pptx/final-image-deck.pptx"
}
```

## Health

### `GET /api/health`

Returns whether `OPENAI_API_KEY` is configured plus active text/image model names.

## Local Image Refine

### `POST /api/projects/:id/slides/:slide/refine`

Inputs:

- source slide image
- region mask or bounding box
- edit prompt
- selected visual style prompt

Server action:

- call `gpt-image-2` reference-image edit
- save revised image and version metadata

Response:

```json
{
  "image": "visual/pages/final/slide-03-v2.png",
  "version": "v2"
}
```
