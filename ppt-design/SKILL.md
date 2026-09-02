---
name: ppt-design
description: PPT image-design workflow from uploaded source materials, text, and optional visual references to reusable visual preview directions, confirmed high-resolution slide images, and image-based PPTX output. Use when Codex needs to create or redesign a presentation, generate PPT outlines, cover/homepage content, visual collage方案, Image2 visual exploration, style reuse, template沉淀, or 图片版PPT.
---

# PPT Design

## Overview

Use this skill to turn source material into a designed image-based presentation.
The workflow is intentionally lightweight and stable:

```text
上传材料/输入文本/视觉参考（可选）
  -> 生成大纲与主页
  -> 生成视觉预览图
  -> 用户确认视觉
  -> 生成高清单页图片
  -> 合成为图片版 PPTX
```

When this skill says Image2, use the local `$new-imagegen` skill unless the
user explicitly specifies another provider. `$new-imagegen` calls apiopencc's
OpenAI-compatible `gpt-image-2` route and supports both text-to-image and
reference-image-guided edits.

The visual preview images and high-resolution slide images must be produced by
Image2 / `$new-imagegen`, or by a user-explicitly requested image provider. Do
not replace image generation with HTML/CSS, SVG, browser screenshots,
hand-authored slide renderers, native PPT drawing, or other code-generated
layouts unless the user explicitly asks for that implementation route. Code in
this skill is only for retrieval, file organization, contact sheets, and final
image-based PPTX assembly.

The final PPTX is an image-based deck: each confirmed slide visual is placed as
a full-slide image. Keep the workflow focused on visual design, user
confirmation, and stable image deck assembly.

Always treat accepted visual styles as reusable assets. Before generating new
visual preview options, search the local style-template library; after the user
accepts or completes a deck from a style, save that style's preview image,
prompt, and metadata back into the library.

## Project Setup

Create a task folder when the user has not provided one:

```text
source/
outline/
visual/
  candidates/
  pages/
pptx/
style-capture/
```

Keep these canonical artifacts when possible:

- `outline/ppt-outline.md`: confirmed deck logic, page list, cover copy, and per-slide content.
- `outline/project-profile.json`: retrieval profile containing topic, audience, industry/domain, purpose, tone, keywords, page_count, visual constraints, and any user-supplied reference image paths.
- `visual/candidates/style-*.png`: full-deck visual preview/collage candidates.
- `visual/candidates/style-*-prompt.md`: prompt and visual-system spec used for each preview.
- `visual/pages/pilot/slide-XX.png`: first-batch high-resolution visual drafts for user confirmation.
- `visual/pages/final/slide-XX.png`: confirmed full-deck high-resolution slide images.
- `pptx/final-image-deck.pptx`: final image-based PPTX.

## Step 1: Outline And Cover

After the user uploads source material or provides text, extract the core content and produce:

- PPT outline with the deck's core logic framework.
- Cover/homepage content: main title, subtitle, and core talking points.
- Per-slide page plan with slide number, title, key message, content blocks, data/chart needs, and suggested visual role.
- `outline/project-profile.json` for style retrieval.

Use this prompt shape when delegating or asking an LLM to extract content:

```text
请根据我上传的材料/输入文本，生成一份 PPT 大纲和主页内容。大纲需包含本次演示的核心逻辑框架，主页内容需包含主标题、副标题及核心要点。请同时输出逐页内容计划和用于视觉模板检索的项目画像 JSON。
```

Ask for confirmation before moving to visual generation when the outline changes
the deck structure or page count materially.

## Step 2: Visual Preview Options

Read `references/style-template-library.md` before preparing this step.

Generate visual preview/collage options by default. Each option must show
thumbnails for the deck pages in the correct order and must use one unified
visual system: font hierarchy, color system, background language, chart style,
icon style, card/module style, header/footer treatment, and spacing rhythm.
These preview/collage images must come from retrieved style-template images or
Image2 / `$new-imagegen`; do not synthesize them with local HTML/CSS or slide
layout code.

Before calling Image2 / `$new-imagegen`, search reusable templates:

```bash
python scripts/style_library.py search --profile outline/project-profile.json --limit 3 --json
```

Use suitable retrieved templates first. If fewer than the requested number of
suitable styles are found, call Image2 / `$new-imagegen` only for the missing
variants. When the user supplies a preferred visual reference image, include it
in the prompt and project profile, and let it override library matches when
there is tension.

Use this base prompt shape for new Image2 / `$new-imagegen` preview generation:

```text
请调用 Image2 技能，根据已确认的 PPT 大纲和逐页内容，生成{N}版不同视觉风格的 PPT 拼图预览方案。每版方案需包含整套PPT的页面缩略图，并保持正确页序。风格必须使用统一视觉系统，包括字体层级、色彩系统、背景风格、图表样式、图标风格、卡片/模块样式、页眉页脚等。若提供参考图，请在不复制具体内容的前提下继承其版式气质、色彩关系和视觉组织方式。
```

Save every generated or adapted candidate prompt beside its preview image.
Preserve enough prompt detail that the style can be reused without
reinterpreting the original conversation.

## Step 3: High-Resolution Slide Images

After the user selects a visual preview style, generate high-resolution slide
images one page at a time.
Use Image2 / `$new-imagegen` for each slide image. If text fidelity or layout
fidelity is difficult, improve the prompt, use reference images, or ask the
user for confirmation; do not switch to local code rendering as a workaround.

Use this prompt shape:

```text
请基于选定视觉方案，将第{N}页生成一张高清单页 PPT 图片。每次只生成一张完整单页，画面需保持16:9横版比例。请严格继承已选拼图方案的字体层级、色彩系统、背景、图表、图标、模块和页眉页脚风格。
```

Use a two-pass confirmation gate:

1. Generate only the first four slides first, or all slides if the deck has four or fewer pages. Save them under `visual/pages/pilot/slide-XX.png`.
2. Show the first-batch images to the user and ask for confirmation on style consistency, content density, page hierarchy, and whether the visual system is acceptable.
3. If the user requests changes, revise the visual prompt or selected style and regenerate the first four slides. Do not generate the remaining pages until the first four are confirmed.
4. After the user confirms the first four slides, generate the remaining slides one at a time using the same confirmed visual system. Save the complete set under `visual/pages/final/slide-XX.png`.
5. Show the complete image set or a contact sheet for final image confirmation.

Keep slide order stable with zero-padded filenames such as `slide-01.png`. If
any generated page drifts from the confirmed system, regenerate that page before
asking for final image confirmation.

## Step 4: Image-Based PPTX

Start this step only after the user confirms the complete high-resolution image
set. Build an image-based PPTX by placing each confirmed slide image as a
full-slide image on a 16:9 PowerPoint page.

Use the bundled script when possible:

```bash
python scripts/build_image_pptx.py \
  --images visual/pages/final \
  --out pptx/final-image-deck.pptx \
  --fit cover
```

Rules:

- Preserve slide order from filenames.
- Use 16:9 widescreen output.
- Use the confirmed images as the visible slides.

## Save Accepted Styles

When the user accepts a preview style, completes a PPT using that style, or asks
to keep the layout for later reuse, save it into the style-template library:

```bash
python scripts/style_library.py add \
  --name "style name" \
  --description "where this style works best" \
  --profile outline/project-profile.json \
  --prompt-file visual/candidates/style-a-prompt.md \
  --collage-image visual/candidates/style-a.png \
  --page-count 12 \
  --tags "industry-report,data-heavy,clean,blue-accent"
```

Also save representative high-resolution slide images when available with
repeated `--asset` arguments. The saved template must include image assets,
source prompt, visual-system notes, and enough metadata for future retrieval.

## Quality Bar

Before delivery, check:

- The outline has a coherent narrative and the cover matches the source material.
- Step 2 used existing templates before Image2, and only generated missing variants.
- Visual preview candidates include pages in correct order.
- The first four high-resolution images were confirmed before generating the remaining pages.
- The complete image set was confirmed before PPTX assembly.
- Selected style is saved or intentionally skipped with a reason.
- High-resolution single pages are 16:9 and visually consistent.
- Final PPTX opens and has the expected slide count.
- Each slide image fills the slide as intended and is not stretched unexpectedly.
