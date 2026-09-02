# Clean-base rules

## Purpose

Create a source-faithful slide raster that contains every non-text visual element and none of the OCR-detected text. The clean base is the only picture placed on the final slide.

## Inputs

- `source.png`: authoritative visual source.
- `text-mask.png` or `retry-mask.png`: white means remove text; black means preserve content.
- `clean-base-prompt.md` or `retry-clean-base-prompt.md`: authoritative edit instruction.

Do not add unrelated references, style images, or previous generated pages. They can cause layout drift.

## Preservation contract

Preserve all non-text content:

- Pixel dimensions and aspect ratio.
- Canvas, margins, whitespace, and layout.
- Photos, illustrations, charts, diagrams, icons, and shapes.
- Position, scale, rotation, perspective, and stacking.
- Fill, stroke, color, gradient, shadow, lighting, and texture.

Remove all text-like content in masked regions, including glyph edges, outlines, shadows, glow, labels, numbers, punctuation, headers, footers, and watermarks. Reconstruct the natural background under removed text. Never add replacement text, placeholder marks, or pseudo-letters.

## Verification

`check_clean_base.py` submits the clean base to PaddleOCR and compares its detected text boxes with the original OCR regions. Text elsewhere in an embedded photograph is tolerated only when it does not overlap an original reconstructed text region.

Attempt one uses the normal expanded mask. A detected overlap creates a larger retry mask. Attempt two is the final allowed image edit. If OCR still finds overlapping text, mark the page blocked.

## Visual drift

The automated validator checks dimensions and residual text, not all possible image-generation drift. Before delivery, inspect the source and clean base side-by-side when the page contains dense charts, precise brand marks, or small decorative labels near text masks. Reject a clean base that moves or recolors a non-text element, even if OCR verification passes.

