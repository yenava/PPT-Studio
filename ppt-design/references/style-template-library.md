# Style Template Library

Use the style-template library to reuse successful PPT visual collage styles before generating new ones.

## Library Location

Default library:

```text
assets/style-templates/
```

Each saved style has its own folder:

```text
assets/style-templates/
  index.json
  20260628-clean-data-report/
    manifest.json
    prompt.md
    collage.png
    assets/
      slide-01.png
      slide-02.png
```

## Retrieval Policy

For Step 2, retrieve first and generate only the gap:

1. Build or update `outline/project-profile.json`.
2. Run `python scripts/style_library.py search --profile outline/project-profile.json --limit 3 --json`.
3. Inspect the returned score, tags, description, and prompt path.
4. Treat matches with score around `0.20` or higher as candidates, but prefer judgment over the number.
5. If there are fewer than three suitable styles, call Image2 for the missing variants only.
6. If the user supplied a visual reference image, honor the user reference over library style conflicts.

Good matches usually share at least two of these signals:

- Same or adjacent presentation type: strategy deck, report, pitch, training, roadmap, review, product launch.
- Similar content density and page count.
- Similar domain: finance, technology, education, consulting, healthcare, manufacturing, public sector.
- Similar visual tone: executive, editorial, futuristic, warm, minimal, data-heavy, illustrated, premium.
- Similar assets: dashboard charts, timelines, process diagrams, product screenshots, team portraits.

Avoid using a template when the topic, audience, and tone conflict even if lexical search gives a decent score.

## Saved Manifest Schema

Each template `manifest.json` should contain:

```json
{
  "id": "20260628-clean-data-report",
  "name": "Clean Data Report",
  "description": "Data-heavy executive report with quiet grid, dense charts, and blue accent system.",
  "tags": ["data-heavy", "executive", "report", "blue-accent"],
  "created_at": "2026-06-28T12:00:00+08:00",
  "updated_at": "2026-06-28T12:00:00+08:00",
  "page_count": 12,
  "source_profile": {
    "topic": "Quarterly business review",
    "audience": "executive team",
    "industry": "technology",
    "purpose": "decision support",
    "tone": "calm, analytical",
    "keywords": ["growth", "retention", "pipeline"]
  },
  "visual_system": {
    "layout": "12-column grid, dense but breathable",
    "typography": "large numeric anchors, concise headings, small annotations",
    "color": "white/ink base with blue and signal green accents",
    "background": "flat surfaces, subtle separators, no decorative blobs",
    "charts": "thin-axis charts, direct labels, restrained legends",
    "icons": "outline icons, 1.5px stroke",
    "modules": "small-radius cards, table-like comparison blocks",
    "header_footer": "slide number and section label"
  },
  "prompt_path": "prompt.md",
  "collage_image": "collage.png",
  "assets": ["assets/slide-01.png"]
}
```

The `visual_system` field may be extracted from the prompt if no separate structured notes exist.

## Prompt Capture Requirements

Save a reusable prompt, not just the final image. The prompt should include:

- Deck type and intended audience.
- Page count and thumbnail order requirement.
- Visual system details: typography, palette, backgrounds, charts, icons, cards/modules, headers/footers.
- Content-density assumptions and page rhythm.
- Any reference image influence, described abstractly.
- Negative constraints that mattered, such as no marketing hero style, no ornamental gradients, no crowded text.

## Saving Policy

Save a style when:

- The user selects one of the collage options for high-resolution slide generation.
- A deck is completed using the style.
- The user explicitly says the layout or style should be reused later.

Do not save failed experiments unless the user asks to keep them. If a style is a small variation of an existing template, update the existing template only when it improves the reusable prompt or asset set; otherwise add a new template with distinct tags.

Use:

```bash
python scripts/style_library.py add \
  --name "Clean Data Report" \
  --description "Data-heavy executive report with quiet grid and blue accent system." \
  --profile outline/project-profile.json \
  --prompt-file visual/candidates/style-a-prompt.md \
  --collage-image visual/candidates/style-a.png \
  --page-count 12 \
  --tags "data-heavy,executive,report,blue-accent"
```

Add high-resolution example pages when useful:

```bash
python scripts/style_library.py add ... \
  --asset visual/pages/slide-01.png \
  --asset visual/pages/slide-05.png
```

## Using Retrieved Templates In Image Prompts

When a template is retrieved, use its collage as the visual reference and its prompt as the style spec. Replace content, page titles, data, and slide count with the current outline.

Do not copy old business content into the new deck. Reuse only layout language, visual system, chart treatment, module structure, and spacing rhythm.
