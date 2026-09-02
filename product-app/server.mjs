import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.join(ROOT, "work", "product-app-projects");
const NEW_IMAGEGEN_SCRIPT = path.join(__dirname, "scripts", "apiopencc_gpt_image_2.py");
const HYBRID_COMPOSITOR_SCRIPT = path.join(__dirname, "scripts", "compose_hybrid_slide.py");
const DEFAULT_TEST_STYLE = {
  id: "20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734",
  name: "白底橙红平安系金融保险PPT",
  description: "白底、橙红强调、高密度咨询报告页，适合业务复盘、经营分析和金融保险增长方案。",
  pageCount: 9,
  tags: ["financial-insurance", "white-background", "orange-red", "pingan-inspired", "consulting-style"],
  image: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734/collage.png",
  prompt: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734/prompt.md",
  source: "library",
};
const LAYOUT_FONTS = new Set(["黑体", "微软雅黑", "思源黑体", "华文楷体", "宋体", "华文中宋", "苹方"]);
const PYTHON =
  process.env.PPT_STUDIO_PYTHON ||
  "/Users/yanhui/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const config = {
  port: Number(process.env.PORT || 5173),
  apiKey: process.env.APIOPENCC_API_KEY || process.env.OPENAI_API_KEY || "",
  textModel: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini",
  imageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
  textBaseUrl: process.env.OPENAI_BASE_URL || process.env.APIOPENCC_BASE_URL || "https://apiopencc.com/v1",
  imageBaseUrl: process.env.OPENAI_IMAGE_BASE_URL || process.env.APIOPENCC_BASE_URL || "https://apiopencc.com",
  imageFormat: process.env.OPENAI_IMAGE_FORMAT || "png",
  imageMaxRetries: Number(process.env.OPENAI_IMAGE_MAX_RETRIES || 2),
  previewVariants: Number(process.env.PPT_STUDIO_PREVIEW_VARIANTS || 1),
  textTimeoutMs: Number(process.env.OPENAI_TEXT_TIMEOUT_MS || 120000),
  imageTimeoutMs: Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 600000),
};

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".md", "text/markdown; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      setCorsHeaders(res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      await routeApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, statusFromError(error), { error: error.message || String(error) });
  }
});

server.listen(config.port, () => {
  console.log(`PPT Studio server: http://localhost:${config.port}/product-app/`);
  console.log(`OpenAI text model: ${config.textModel}`);
  console.log(`OpenAI image model: ${config.imageModel}`);
  console.log(`Image route: new-imagegen script (${NEW_IMAGEGEN_SCRIPT})`);
  console.log(`OpenAI timeouts: text ${config.textTimeoutMs}ms, image ${config.imageTimeoutMs}ms`);
  if (!config.apiKey) {
    console.log("OPENAI_API_KEY is not set. Real model/image actions will fail until it is configured.");
  }
});

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      configured: Boolean(config.apiKey),
      textModel: config.textModel,
      imageModel: config.imageModel,
      textBaseUrl: maskUrl(config.textBaseUrl),
      imageBaseUrl: maskUrl(apiopenccBaseUrl(config.imageBaseUrl)),
      imageSizing: "prompt-controlled",
      python: PYTHON,
    });
    return;
  }

  if (url.pathname === "/api/config" && req.method === "GET") {
    sendJson(res, 200, { configured: Boolean(config.apiKey), keySuffix: maskApiKey(config.apiKey) });
    return;
  }

  if (url.pathname === "/api/config" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (typeof body.apiKey !== "string") throw userError("API KEY 必须是文本。");
    config.apiKey = body.apiKey.trim();
    sendJson(res, 200, { configured: Boolean(config.apiKey), keySuffix: maskApiKey(config.apiKey) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    const projects = await listProjects();
    sendJson(res, 200, { projects });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const body = await readJsonBody(req);
    const project = await createProject(body);
    sendJson(res, 200, { project });
    return;
  }

  const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(.+))?$/);
  if (!match) {
    sendJson(res, 404, { error: "Unknown API route." });
    return;
  }

  const projectId = sanitizeId(decodeURIComponent(match[1]));
  const tail = match[2] || "";
  const body = req.method === "POST" ? await readJsonBody(req) : {};

  if (req.method === "POST" && tail === "sync") {
    const project = await syncProject(projectId, body);
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "uploads") {
    const upload = await saveUpload(projectId, body);
    sendJson(res, 200, { upload });
    return;
  }

  if (req.method === "POST" && tail === "analyze") {
    const project = await analyzeProject(projectId, body);
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "visual-previews") {
    const result = await generateVisualPreviews(projectId, body);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && tail === "confirm-style") {
    const project = await confirmStyle(projectId, body);
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "layout/master") {
    const project = await generateMasterLayout(projectId, body, { force: Boolean(body.force) });
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "layout/upload") {
    const project = await uploadMasterLayout(projectId, body);
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "slides/pilot") {
    const project = await generateSlides(projectId, body, { mode: "pilot", force: Boolean(body.force) });
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail === "pptx") {
    const project = await buildFinalPptx(projectId, body);
    sendJson(res, 200, { project });
    return;
  }

  if (req.method === "POST" && tail.startsWith("slides/") && tail.endsWith("/refine")) {
    const slide = Number(tail.split("/")[1]);
    const project = await refineSlide(projectId, slide, body);
    sendJson(res, 200, { project });
    return;
  }

  sendJson(res, 404, { error: "Unknown project action." });
}

async function createProject(body) {
  const id = sanitizeId(body.id || `project-${Date.now()}`);
  const project = {
    id,
    title: body.title || "未命名 PPT 项目",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: "刚刚",
    status: "上传材料",
    stage: 0,
    pageCount: Number(body.pageCount || 10),
    sourceText: body.sourceText || "",
    files: [],
    references: [],
    outline: null,
    selectedStyleId: null,
    selectedStyle: null,
    visualConfirmed: false,
    layoutFont: normalizeLayoutFont(body.layoutFont),
    compositionMode: normalizeCompositionMode(body.compositionMode),
    slides: [],
    layout: null,
    pptxUrl: "",
    versions: [],
    lastRefine: "",
    refineAnnotations: {},
    api: { projectDir: publicPath(projectDir(id)), logs: [] },
  };
  await ensureProjectDirs(id);
  await saveProject(project);
  return project;
}

async function syncProject(projectId, body) {
  const existing = await loadProject(projectId);
  const project = {
    ...existing,
    ...pick(body, ["title", "pageCount", "sourceText", "files", "references", "outline", "selectedStyleId", "selectedStyle", "visualConfirmed", "layoutFont", "compositionMode", "slides", "layout", "stage", "status", "pptxUrl", "versions", "lastRefine", "refineAnnotations"]),
    id: projectId,
    updatedAt: "刚刚",
    api: {
      ...(existing.api || {}),
      projectDir: publicPath(projectDir(projectId)),
      logs: existing.api?.logs || [],
    },
  };
  project.compositionMode = normalizeCompositionMode(project.compositionMode);
  await ensureProjectDirs(projectId);
  await writeSourceText(projectId, project.sourceText || "");
  await saveProject(project);
  return project;
}

async function analyzeProject(projectId, body) {
  const project = await syncProject(projectId, body);
  requireApiKey("生成大纲需要 OPENAI_API_KEY。");

  const uploadedContext = await collectUploadedContext(projectId);
  const prompt = [
    "请根据用户提供的材料，生成图片版 PPT 的结构化大纲。",
    "必须只输出 JSON，不要输出 Markdown 代码围栏。",
    "",
    "JSON 字段：",
    "- outline_markdown: Markdown 文本，包含标题、封面、逐页大纲。",
    "- page_count: 数字。",
    "- profile: 对象，包含 topic, audience, industry, purpose, tone, keywords, page_count, visual_constraints, reference_images。",
    "- slides: 数组，每项包含 number, title, key_message, content_blocks, visual_role, data_needs。",
    "",
    `项目标题：${project.title}`,
    `期望页数：${project.pageCount}`,
    "",
    "文本材料：",
    project.sourceText || "(用户尚未粘贴文本，尽量基于文件名和项目标题生成可确认的大纲。)",
    "",
    uploadedContext,
  ].join("\n");

  const raw = await callTextModel({
    system: "你是资深咨询顾问和 PPT 信息架构师，擅长把零散材料整理成高质量汇报型 PPT 大纲。",
    user: prompt,
  });
  await writeFile(path.join(projectDir(projectId), "outline", "raw-outline-response.txt"), raw, "utf-8");
  let parsed;
  try {
    parsed = parseJsonText(raw);
  } catch (error) {
    parsed = fallbackOutlineFromText(project, raw);
    appendLog(project, `LLM 返回 JSON 格式异常，已保存 raw-outline-response.txt 并生成兜底大纲：${cleanProcessError(error.message)}`);
  }
  const outlineMarkdown = parsed.outline_markdown || markdownFromOutline(project, parsed);
  const profile = {
    ...(parsed.profile || {}),
    page_count: Number(parsed.page_count || parsed.profile?.page_count || project.pageCount || 10),
    source_files: project.files || [],
    reference_images: project.references || [],
  };

  await writeFile(path.join(projectDir(projectId), "outline", "ppt-outline.md"), outlineMarkdown, "utf-8");
  await writeJson(path.join(projectDir(projectId), "outline", "project-profile.json"), profile);

  project.outline = {
    title: parsed.profile?.topic || firstMarkdownTitle(outlineMarkdown) || `${project.title} PPT 大纲`,
    bullets: outlineBullets(parsed),
    profile: profileLine(profile),
    markdown: outlineMarkdown,
    slides: Array.isArray(parsed.slides) ? parsed.slides : [],
  };
  project.pageCount = profile.page_count;
  project.stage = Math.max(project.stage || 0, 1);
  project.status = "确认大纲";
  project.updatedAt = "刚刚";
  appendLog(project, "LLM 已生成 outline/ppt-outline.md 和 outline/project-profile.json");
  await saveProject(project);
  return project;
}

async function generateVisualPreviews(projectId, body) {
  let project = await syncProject(projectId, body.project || body);
  if (!project.outline) {
    project = await analyzeProject(projectId, body.project || body);
  }

  const profilePath = path.join(projectDir(projectId), "outline", "project-profile.json");
  const matches = await searchStyleLibrary(profilePath);
  const candidates = matches.map((match) => ({
    id: match.id,
    name: match.name,
    description: match.description,
    pageCount: match.page_count,
    tags: match.tags || [],
    image: publicPath(match.collage_image),
    prompt: publicPath(match.prompt),
    source: "library",
    score: match.score,
  }));

  const generated = [];
  if (config.previewVariants > 0) {
    requireApiKey("生成视觉预览需要 OPENAI_API_KEY。");
    const count = Math.max(1, config.previewVariants);
    for (let index = 0; index < count; index += 1) {
      generated.push(await generatePreviewCandidate(projectId, project, index + 1));
    }
  }

  const allCandidates = [...generated, ...candidates].slice(0, 6);
  project.stage = Math.max(project.stage || 0, 2);
  project.status = "确认视觉";
  project.selectedStyleId = project.selectedStyleId || allCandidates[0]?.id || null;
  project.visualConfirmed = false;
  appendLog(project, `视觉候选已生成：AI ${generated.length} 个，风格库 ${candidates.length} 个`);
  await saveProject(project);
  return { project, candidates: allCandidates };
}

async function generatePreviewCandidate(projectId, project, variantNumber) {
  const outline = await readTextSafe(path.join(projectDir(projectId), "outline", "ppt-outline.md"));
  const prompt = [
    "生成一张 16:9 横版 PPT 拼图预览图。",
    "画面必须是一整套 PPT 的视觉预览，包含多个页面缩略图，并保持页序。",
    "不要输出真实可读小字，允许用短标题和模块形状表达信息层级。",
    "要求统一视觉系统：字体层级、色彩系统、背景语言、图表样式、图标样式、卡片/模块样式、页眉页脚、间距节奏。",
    `方案编号：${variantNumber}`,
    `项目：${project.title}`,
    "",
    "大纲：",
    outline,
  ].join("\n");

  const id = `style-ai-${Date.now()}-${variantNumber}`;
  const outDir = path.join(projectDir(projectId), "visual", "candidates");
  const imagePath = path.join(outDir, `${id}.png`);
  const promptPath = path.join(outDir, `${id}-prompt.md`);
  await mkdir(outDir, { recursive: true });
  await writeFile(promptPath, prompt, "utf-8");
  await callImageModel(prompt, imagePath);

  return {
    id,
    name: `AI 视觉预览 ${variantNumber}`,
    description: `由 ${config.imageModel} 基于项目大纲生成的整套 PPT 拼图预览。`,
    pageCount: project.pageCount,
    tags: ["ai-generated", "preview", "image-deck"],
    image: publicPath(imagePath),
    prompt: publicPath(promptPath),
    source: "generated",
  };
}

async function confirmStyle(projectId, body) {
  const project = await syncProject(projectId, body.project || body);
  const style = body.style || {};
  project.selectedStyleId = style.id || project.selectedStyleId;
  project.selectedStyle = style;
  project.visualConfirmed = true;
  project.stage = Math.max(project.stage || 0, 3);
  project.status = normalizeCompositionMode(project.compositionMode) === "hybrid" ? "生成页面" : "生成母版";
  project.updatedAt = "刚刚";
  appendLog(project, `已确认视觉：${style.name || project.selectedStyleId || "未命名风格"}`);
  await saveProject(project);
  return project;
}

async function generateMasterLayout(projectId, body, options = {}) {
  const project = applyDefaultTestStyle(await syncProject(projectId, body.project || body));
  requireApiKey("生成版式母图需要 OPENAI_API_KEY。");
  if (!project.visualConfirmed && !project.layout?.master && !(project.slides || []).length) {
    throw userError("请先在“确认视觉”步骤确认风格，再生成母版。");
  }
  const plans = await slidePlans(projectId, project);
  await ensureMasterLayout(projectId, project, plans, { force: options.force });
  linkMasterToSelectedStyle(project);
  project.stage = Math.max(project.stage || 0, 4);
  project.status = "版式母图";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions || [], [options.force ? "v1 版式母图重新生成" : "v1 版式母图生成"]);
  await saveProject(project);
  return project;
}

async function uploadMasterLayout(projectId, body) {
  const project = await syncProject(projectId, body.project || body);
  if (!project.visualConfirmed) {
    throw userError("请先确认视觉风格，再上传母版。");
  }

  const file = body.file || body;
  const name = safeFileName(file.name || "uploaded-master.png");
  const type = String(file.type || "").toLowerCase();
  const extension = masterImageExtension(name, type);
  if (!extension) {
    throw userError("母版仅支持 PNG、JPG 或 WebP 图片。");
  }

  const data = Buffer.from(file.dataBase64 || "", "base64");
  if (!data.length) throw userError("上传的母版图片为空。");
  if (data.length > 20 * 1024 * 1024) throw userError("母版图片不能超过 20MB。");

  const fingerprint = createHash("sha256").update(data).digest("hex").slice(0, 16);
  const dir = path.join(projectDir(projectId), "visual", "layout", "uploads");
  const imagePath = path.join(dir, `master-${fingerprint}${extension}`);
  await mkdir(dir, { recursive: true });
  await writeFile(imagePath, data);
  if (!(await isUsableImage(imagePath))) {
    await rm(imagePath, { force: true }).catch(() => {});
    throw userError("无法识别母版图片，请重新选择有效的 PNG、JPG 或 WebP 文件。");
  }

  project.layout = {
    master: publicPath(imagePath),
    prompt: "",
    fingerprint,
    sourceMasterId: fingerprint,
    sourceProjectId: project.id,
    source: "upload",
    name: name.replace(/\.[^.]+$/, "") || "本地上传母版",
    createdAt: new Date().toISOString(),
  };
  linkMasterToSelectedStyle(project);
  project.stage = Math.max(project.stage || 0, 4);
  project.status = "版式母图";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions || [], ["v1 本地母版上传"]);
  appendLog(project, `已上传并采用本地母版：${name}`);
  await saveProject(project);
  return project;
}

function masterImageExtension(name, type) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg" || type === "image/jpg") return ".jpg";
  if (type === "image/webp") return ".webp";
  const extension = path.extname(name).toLowerCase();
  if (extension === ".png" || extension === ".webp") return extension;
  if (extension === ".jpg" || extension === ".jpeg") return ".jpg";
  return "";
}

function linkMasterToSelectedStyle(project) {
  if (!project.selectedStyle || !project.layout?.master) return;
  const master = {
    id: project.layout.fingerprint || `project-${project.id}`,
    name: project.layout.name || `${project.title || "项目"}母版`,
    image: project.layout.master,
    prompt: project.layout.prompt || "",
    font: normalizeLayoutFont(project.layoutFont),
    fingerprint: project.layout.fingerprint || "",
    sourceProjectId: project.id,
    createdAt: project.layout.createdAt || new Date().toISOString(),
    source: project.layout.source || "generated",
  };
  const masters = Array.isArray(project.selectedStyle.masters) ? project.selectedStyle.masters : [];
  project.selectedStyle = {
    ...project.selectedStyle,
    masters: [...masters.filter((item) => item?.id !== master.id), master],
  };
}

async function generateSlides(projectId, body, options) {
  const project = applyDefaultTestStyle(await syncProject(projectId, body.project || body));
  requireApiKey("生成页面图片需要 OPENAI_API_KEY。");
  project.compositionMode = normalizeCompositionMode(project.compositionMode);
  const plans = await slidePlans(projectId, project);
  const max = options.mode === "pilot" ? Math.min(4, plans.length) : plans.length;
  const start = options.mode === "pilot" ? 0 : 0;
  const outputDir = path.join(projectDir(projectId), "visual", "pages", options.mode === "pilot" ? "pilot" : "final");
  await mkdir(outputDir, { recursive: true });
  if (options.force) {
    await removeSlideFiles(outputDir, start, max);
    if (options.mode === "pilot") project.slides = [];
  }
  const needsGeneration = plans.slice(start, max).some((_, index) => {
    const slideNumber = String(start + index + 1).padStart(2, "0");
    return !existsSync(path.join(outputDir, `slide-${slideNumber}.png`));
  });
  const masterLayout = await readMasterLayout(projectId, project);
  if (needsGeneration && project.compositionMode === "full-page" && !masterLayout) {
    throw userError("请先生成版式母图，再生成页面。");
  }

  const generated = [];
  const failures = [];
  for (let index = start; index < max; index += 1) {
    const plan = plans[index];
    const slideNumber = String(index + 1).padStart(2, "0");
    const imagePath = path.join(outputDir, `slide-${slideNumber}.png`);
    const promptPath = path.join(outputDir, `slide-${slideNumber}-prompt.md`);
    const manifestPath = path.join(outputDir, `slide-${slideNumber}-composition.json`);
    const useHybridComposition = project.compositionMode === "hybrid"
      && shouldUseMasterLayout(plan, index + 1, plans.length);
    const useMasterLayout = !useHybridComposition
      && Boolean(masterLayout && shouldUseMasterLayout(plan, index + 1, plans.length));
    const contentDir = path.join(outputDir, "content");
    const contentImagePath = path.join(contentDir, `slide-${slideNumber}-content.png`);
    const modelImagePath = useHybridComposition ? contentImagePath : imagePath;
    const prompt = useHybridComposition
      ? await hybridContentPrompt(projectId, project, plan, index + 1)
      : await slidePrompt(projectId, project, plan, index + 1, { useMasterLayout });
    await writeFile(promptPath, prompt, "utf-8");
    if (existsSync(imagePath)) {
      generated.push(publicPath(imagePath));
      continue;
    }
    try {
      await mkdir(path.dirname(modelImagePath), { recursive: true });
      const result = await isUsableImage(modelImagePath)
        ? { attempts: 0, reused: true }
        : await callImageModel(prompt, modelImagePath, {
          referenceImages: useMasterLayout ? [masterLayout.imagePath] : [],
        });
      if (useHybridComposition) {
        await composeHybridSlide(modelImagePath, imagePath, manifestPath, project, plan, index + 1, plans.length);
      }
      if (!(await isUsableImage(imagePath))) {
        throw userError(`slide-${slideNumber} 没有生成有效的最终页面。`);
      }
      generated.push(publicPath(imagePath));
      project.slides = generated;
      project.stage = Math.max(project.stage || 0, 5);
      project.status = `${options.mode === "pilot" ? "首批页面" : "全量页面"} ${generated.length}/${max}`;
      project.updatedAt = "刚刚";
      appendLog(project, `slide-${slideNumber} 已生成${useHybridComposition ? "（代码固定层 + 模型主体图）" : useMasterLayout ? "（参考版式母图）" : ""}${result.attempts > 1 ? `（第 ${result.attempts} 次尝试成功）` : ""}${result.recovered ? "（脚本返回异常但图片已落盘）" : ""}`);
      await saveProject(project);
    } catch (error) {
      if (await isUsableImage(imagePath)) {
        generated.push(publicPath(imagePath));
      }
      failures.push(`slide-${slideNumber}: ${error.message || error}`);
      appendLog(project, `slide-${slideNumber} 生成失败，已保留 ${generated.length} 张已生成图片：${cleanProcessError(error.message || error)}`);
      break;
    }
  }

  project.slides = generated;
  project.stage = Math.max(project.stage || 0, 5);
  project.status = failures.length
    ? `${options.mode === "pilot" ? "首批页面" : "全量页面"}部分生成`
    : options.mode === "pilot" ? `首批${generated.length}页` : "全量页面";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions || [], [options.mode === "pilot" ? "v1 首批四页生成" : "v2 全量页面生成"]);
  if (failures.length) {
    project.api = {
      ...(project.api || {}),
      lastImageError: failures[0],
    };
  }
  appendLog(project, failures.length
    ? `${options.mode === "pilot" ? "首批" : "全量"}页面部分生成：${generated.length}/${max} 页`
    : `${options.mode === "pilot" ? "首批" : "全量"}页面图片已生成：${generated.length} 页`);
  await saveProject(project);
  return project;
}

async function buildFinalPptx(projectId, body) {
  let project = await syncProject(projectId, body.project || body);
  requireApiKey("生成完整 PPT 前需要可用的 OPENAI_API_KEY，以补齐剩余页面图片。");

  const finalDir = path.join(projectDir(projectId), "visual", "pages", "final");
  await mkdir(finalDir, { recursive: true });
  await copyPilotImagesToFinal(projectId);
  const existing = await listImages(finalDir);
  if (existing.length < Number(project.pageCount || 1)) {
    project = await generateSlides(projectId, body, { mode: "final" });
  }

  const outPath = path.join(projectDir(projectId), "pptx", "final-image-deck.pptx");
  await mkdir(path.dirname(outPath), { recursive: true });
  await execFile(PYTHON, [
    path.join(ROOT, "ppt-design", "scripts", "build_image_pptx.py"),
    "--images",
    finalDir,
    "--out",
    outPath,
    "--fit",
    "cover",
  ]);

  project.pptxUrl = publicPath(outPath);
  project.slides = (await listImages(finalDir)).map(publicPath);
  project.stage = Math.max(project.stage || 0, 6);
  project.status = "PPTX 交付";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions || [], ["v3 图片版 PPTX 组装"]);
  appendLog(project, "已生成 pptx/final-image-deck.pptx");
  await saveProject(project);
  return project;
}

async function copyPilotImagesToFinal(projectId) {
  const pilotDir = path.join(projectDir(projectId), "visual", "pages", "pilot");
  const finalDir = path.join(projectDir(projectId), "visual", "pages", "final");
  const pilotImages = await listImages(pilotDir);
  for (const image of pilotImages) {
    const dest = path.join(finalDir, path.basename(image));
    if (!existsSync(dest)) await copyFile(image, dest);
  }
}

async function refineSlide(projectId, slide, body) {
  const project = await syncProject(projectId, body.project || body);
  requireApiKey("局部微调需要 OPENAI_API_KEY。");
  if (!slide || slide < 1) throw new Error("缺少有效 slide 编号。");

  const originalUrl = project.slides?.[slide - 1];
  const originalPath = resolvePublicFilePath(originalUrl);
  if (!originalPath || !(await isUsableImage(originalPath))) {
    throw userError(`找不到可编辑的第 ${slide} 页图片。`);
  }

  const prompt = String(body.prompt || project.lastRefine || "保持现有视觉系统，仅修改批注区域。").trim();
  const annotations = body.annotations || {};
  const annotationNotes = String(body.annotationNotes || "").trim();
  const annotationBase64 = String(body.annotationImageBase64 || "");
  if (!annotationBase64) throw userError("请先在页面上添加批注，再提交修改。");

  project.stage = 7;
  project.status = "页面微调中";
  project.lastRefine = prompt;
  project.updatedAt = "刚刚";
  const slideNumber = String(slide).padStart(2, "0");
  const versionId = Date.now();
  const annotationDir = path.join(projectDir(projectId), "visual", "annotations", `slide-${slideNumber}`);
  const versionDir = path.join(projectDir(projectId), "visual", "versions", `slide-${slideNumber}`);
  const markupPath = path.join(annotationDir, `markup-${versionId}.png`);
  const annotationPath = path.join(annotationDir, `annotations-${versionId}.json`);
  const backupPath = path.join(versionDir, `before-${versionId}${path.extname(originalPath) || ".png"}`);
  const refinedPath = path.join(versionDir, `refined-${versionId}.png`);
  await mkdir(annotationDir, { recursive: true });
  await mkdir(versionDir, { recursive: true });
  await writeFile(markupPath, Buffer.from(annotationBase64, "base64"));
  if (!(await isUsableImage(markupPath))) {
    await rm(markupPath, { force: true }).catch(() => {});
    throw userError("批注预览图无效，请重新绘制后提交。");
  }
  await writeJson(annotationPath, {
    slide,
    source: originalUrl,
    prompt,
    notes: annotationNotes,
    annotations,
    createdAt: new Date().toISOString(),
  });
  await copyFile(originalPath, backupPath);

  const editPrompt = [
    "任务：对第一张参考图中的单页 PPT 做局部修改。第二张参考图是用户批注预览，仅用于指出修改区域和意图。",
    "批注中的红框、圆圈、箭头、画笔线条和批注文字都不是页面内容，成稿中必须彻底移除，不得复刻。",
    "严格保持原页面的16:9比例、标题位置、字体层级、页眉页脚、色彩系统和未批注区域不变。",
    "只修改批注指向的区域，禁止重做整页，禁止新增无关模块。",
    "",
    `整体要求：${prompt}`,
    annotationNotes ? `逐条批注：\n${annotationNotes}` : "逐条批注：以第二张图中的视觉标记为准。",
    "",
    "输出：一张干净的16:9 PPT单页图片，不包含任何批注痕迹。",
  ].join("\n");
  const result = await callImageModel(editPrompt, refinedPath, {
    referenceImages: [originalPath, markupPath],
  });
  if (!(await isUsableImage(refinedPath))) throw userError("图片编辑完成，但没有得到有效页面图片。");

  await copyFile(refinedPath, originalPath);
  const siblingDirs = [
    path.join(projectDir(projectId), "visual", "pages", "pilot"),
    path.join(projectDir(projectId), "visual", "pages", "final"),
  ];
  for (const dir of siblingDirs) {
    const sibling = path.join(dir, path.basename(originalPath));
    if (sibling !== originalPath && existsSync(sibling)) await copyFile(refinedPath, sibling);
  }

  project.refineAnnotations = {
    ...(project.refineAnnotations || {}),
    [String(slide - 1)]: annotations,
  };
  project.pptxUrl = "";
  project.status = "局部微调";
  project.versions = mergeVersions(project.versions || [], [`v${(project.versions || []).length + 1} slide-${slideNumber} 局部微调`]);
  appendLog(project, `slide-${slideNumber} 已按 ${Array.isArray(annotations.objects) ? annotations.objects.length : 0} 条批注完成微调${result.attempts > 1 ? `（第 ${result.attempts} 次尝试成功）` : ""}`);
  await saveProject(project);
  return project;
}

async function callTextModel({ system, user }) {
  const body = {
    model: config.textModel,
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content: [{ type: "input_text", text: user }] },
    ],
    max_output_tokens: 5000,
  };
  const data = await postOpenAI(config.textBaseUrl, "/responses", body);
  const text = extractResponseText(data);
  if (!text) throw new Error("LLM 响应为空。");
  return text;
}

async function callImageModel(prompt, outPath, options = {}) {
  requireApiKey("缺少 OPENAI_API_KEY。");
  if (!existsSync(NEW_IMAGEGEN_SCRIPT)) {
    throw userError(`缺少 new-imagegen 脚本：${NEW_IMAGEGEN_SCRIPT}`);
  }

  const referenceImages = (options.referenceImages || []).filter(Boolean);
  const maxRetries = Math.max(0, Number(config.imageMaxRetries || 0));
  const totalAttempts = maxRetries + 1;
  const errors = [];
  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const args = [
      NEW_IMAGEGEN_SCRIPT,
      prompt,
      "--output",
      outPath,
      "--base-url",
      apiopenccBaseUrl(config.imageBaseUrl),
      "--model",
      config.imageModel,
      "--format",
      config.imageFormat,
      "--endpoint",
      "auto",
      "--timeout",
      String(Math.ceil(config.imageTimeoutMs / 1000)),
      "--save-json",
      `${outPath}.response.json`,
    ];
    for (const reference of referenceImages) {
      args.push("--reference-image", reference);
    }

    try {
      await execFile(
        PYTHON,
        args,
        {
          APIOPENCC_API_KEY: config.apiKey,
          APIOPENCC_BASE_URL: apiopenccBaseUrl(config.imageBaseUrl),
          OPENAI_API_KEY: config.apiKey,
        }
      );

      if (!existsSync(outPath)) {
        throw new Error("new-imagegen 脚本执行完成，但没有生成图片文件。");
      }
      return { attempts: attempt };
    } catch (error) {
      if (await isUsableImage(outPath)) {
        return { attempts: attempt, recovered: true };
      }
      errors.push(cleanProcessError(error.message));
      if (attempt < totalAttempts) {
        await sleep(1200 * attempt);
      }
    }
  }

  throw userError(`new-imagegen 生图失败，已尝试 ${totalAttempts} 次：${errors.at(-1) || "未知错误"}`);
}

async function postOpenAI(baseUrl, endpoint, body, timeoutMs = config.textTimeoutMs) {
  requireApiKey("缺少 OPENAI_API_KEY。");
  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw userError(`OpenAI API 调用超时：${Math.round(timeoutMs / 1000)} 秒内没有返回。`);
    }
    throw error;
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.raw || response.statusText;
    throw userError(`OpenAI API 调用失败：${message}`);
  }
  return data;
}

async function searchStyleLibrary(profilePath) {
  if (!existsSync(profilePath)) return [];
  const result = await execFile(PYTHON, [
    path.join(ROOT, "ppt-design", "scripts", "style_library.py"),
    "search",
    "--profile",
    profilePath,
    "--limit",
    "3",
    "--json",
  ]);
  const parsed = JSON.parse(result.stdout || "{}");
  return parsed.matches || [];
}

async function ensureMasterLayout(projectId, project, plans, options = {}) {
  const dir = path.join(projectDir(projectId), "visual", "layout");
  await mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "master-layout.png");
  const promptPath = path.join(dir, "master-layout-prompt.md");
  const manifestPath = path.join(dir, "master-layout.json");
  const style = project.selectedStyle || {};
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({
      styleId: project.selectedStyleId || style.id || "",
      styleName: style.name || "",
      styleDescription: style.description || "",
      prompt: style.prompt || "",
      pageCount: project.pageCount || plans.length,
      imageSizing: "prompt-controlled",
      layoutFont: normalizeLayoutFont(project.layoutFont),
      masterLayoutPromptVersion: "flexible-v4",
    }))
    .digest("hex")
    .slice(0, 16);
  if (options.force) {
    await removeFiles([imagePath, promptPath, manifestPath, `${imagePath}.response.json`]);
    project.layout = null;
    await saveProject(project);
  }
  if (!options.force && existsSync(imagePath) && existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
      if (manifest.fingerprint === fingerprint && await isUsableImage(imagePath)) {
        project.layout = {
          master: publicPath(imagePath),
          prompt: publicPath(promptPath),
          fingerprint,
        };
        return { imagePath, promptPath, manifestPath, reused: true };
      }
    } catch {
      // Regenerate malformed layout manifests.
    }
  }

  const prompt = await masterLayoutPrompt(projectId, project, plans);
  await writeFile(promptPath, prompt, "utf-8");
  const result = await callImageModel(prompt, imagePath);
  await writeJson(manifestPath, {
    fingerprint,
    image: publicPath(imagePath),
    prompt: publicPath(promptPath),
    generatedAt: new Date().toISOString(),
    imageModel: config.imageModel,
    imageSizing: "prompt-controlled",
    attempts: result.attempts,
  });
  project.layout = {
    master: publicPath(imagePath),
    prompt: publicPath(promptPath),
    fingerprint,
  };
  appendLog(project, `版式母图已生成：visual/layout/master-layout.png${result.attempts > 1 ? `（第 ${result.attempts} 次尝试成功）` : ""}`);
  await saveProject(project);
  return { imagePath, promptPath, manifestPath, reused: false };
}

async function readMasterLayout(projectId, project) {
  const selectedImagePath = resolvePublicFilePath(project.layout?.master);
  const selectedPromptPath = resolvePublicFilePath(project.layout?.prompt);
  const localImagePath = path.join(projectDir(projectId), "visual", "layout", "master-layout.png");
  const localPromptPath = path.join(projectDir(projectId), "visual", "layout", "master-layout-prompt.md");
  const imagePath = selectedImagePath && await isUsableImage(selectedImagePath) ? selectedImagePath : localImagePath;
  const promptPath = selectedPromptPath && existsSync(selectedPromptPath) ? selectedPromptPath : localPromptPath;
  if (!(await isUsableImage(imagePath))) return null;
  project.layout = {
    ...(project.layout || {}),
    master: publicPath(imagePath),
    prompt: publicPath(promptPath),
  };
  return { imagePath, promptPath };
}

function resolvePublicFilePath(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return "";
  const clean = publicUrl.split("?")[0];
  const requestedPath = path.normalize(path.join(ROOT, decodeURIComponent(clean.replace(/^\//, ""))));
  if (!requestedPath.startsWith(ROOT)) return "";
  return resolveLegacyStyleAssetPath(requestedPath);
}

async function slidePlans(projectId, project) {
  const plans = project.outline?.slides || [];
  if (plans.length) return normalizeSlideCount(plans, project.pageCount);
  const outline = await readTextSafe(path.join(projectDir(projectId), "outline", "ppt-outline.md"));
  const fallback = [];
  const count = Number(project.pageCount || 10);
  for (let index = 1; index <= count; index += 1) {
    fallback.push({
      number: index,
      title: index === 1 ? project.title : `第 ${index} 页`,
      key_message: "根据已确认大纲生成对应页面。",
      content_blocks: [outline.slice(0, 800)],
      visual_role: index === 1 ? "cover" : "content-slide",
      data_needs: [],
    });
  }
  return fallback;
}

function normalizeSlideCount(plans, count) {
  const normalized = plans.slice(0, Number(count || plans.length)).map((plan, index) => ({
    ...plan,
    number: plan.number || index + 1,
  }));
  return normalized.length ? normalized : plans;
}

async function masterLayoutPrompt(projectId, project, plans) {
  const style = project.selectedStyle || {};
  const stylePrompt = await readPublicPath(style.prompt);
  const styleGuide = singleSlideStyleGuide(stylePrompt, style, project);
  const layoutFont = normalizeLayoutFont(project.layoutFont);
  return [
    "任务：生成一张 16:9 横版 PPT“视觉母版参考页”，用于统一后续页面的标题系统、字体、色彩、边距、背景和页脚基线。",
    "母版只定义通用设计语法，不定义后续页面的内容框架。后续页面必须可以根据各自内容自由选择流程、矩阵、图表、对比、时间轴或卡片等结构。",
    "",
    "需要统一的通用规则：",
    "- 安全边距：四周留出稳定白边，整体网格清晰。",
    "- 标题区：左上固定页码/章节小标识 + 主标题位置，标题下方保留一条短橙色强调线。不要副标题、不要摘要说明文字。",
    `- 字体：所有中文统一使用“${layoutFont}”；主标题、模块标题、正文和数字建立清楚的字号与字重层级。`,
    "- 色彩：白色或极浅灰背景，深灰正文，橙红色只用于强调、关键数字和少量图标。",
    "- 内容起始线与间距：固定标题区和正文区之间的垂直距离，统一模块间距、卡片内边距和对齐方式。",
    "- 页脚：底部只保留一条非常细的浅灰分割线和极简页码位置。",
    "- 背景：可保留非常淡的灰色纹理或几何阴影，不能抢内容。",
    "",
    "中间内容示例：",
    "- 中间区域要有适量示例内容，用来展示卡片边框、图标、图表、正文和强调色的视觉语言，不能只留一个空白大框。",
    "- 示例内容应由不同形态的轻量模块组成，例如一个文本结论块、一个简单图表块、一个关系示意块；布局可以错落，不要排成固定等宽三栏。",
    "- 这些示例元素只是视觉样例，不是后续页面必须复制的模板；不要形成固定卡片数量、固定步骤数、固定流程或固定底部结论条。",
    "",
    "视觉系统：",
    styleGuide,
    "",
    "文字要求：",
    "- 只允许出现少量占位文字：页码、页面标题占位、核心观点、关键指标、内容/图表占位等。",
    "- 不要出现副标题，不要出现项目名、真实业务标题、真实数据、资料来源、内部资料、请勿外传等文本。",
    "",
    "硬性禁止：不要 Logo、不要右上角品牌区、不要状态圆点、不要右上角项目名、不要底部资料来源、不要内部资料/请勿外传、不要进度条、不要固定三栏卡片、不要固定步骤流、不要固定底部结论条、不要真实数据、不要拼图、不要多页缩略图、不要九宫格、不要封面页、不要结尾页。",
    "输出：单张高清 16:9 视觉母版参考页。它应能统一标题、字体、色彩和通用间距，同时给后续生图充分的内容布局自由度。",
  ].join("\n");
}

async function slidePrompt(projectId, project, plan, slideNumber, options = {}) {
  const style = project.selectedStyle || {};
  const stylePrompt = await readPublicPath(style.prompt);
  const styleGuide = singleSlideStyleGuide(stylePrompt, style, project);
  const layoutFont = normalizeLayoutFont(project.layoutFont);
  return [
    "任务：生成一张 16:9 横版高清 PPT 单页图片，只包含当前这一页。",
    "页面应像可直接交付的企业汇报页：结构清楚、留白克制、标题和关键短句清晰可读。",
    "禁止：拼图、缩略图、多页面预览、联系表、九宫格、多个页面框、把封面和内容页放在同一张图。",
    options.useMasterLayout
      ? "本页会提供一张视觉母版参考图：只继承其标题系统、字体、色彩、背景、安全边距、内容起始线、通用间距和页脚基线。不要复制母版中的示例元素、卡片数量、模块位置、图表形态或内容框架；请根据当前页内容重新设计最合适的结构。"
      : "本页不使用版式母图，仍需尽量沿用已确认视觉系统。",
    "",
    "页面内容：",
    `- 项目：${project.title}`,
    `- 页码：${slideNumber}`,
    `- 标题：${plan.title || ""}`,
    `- 核心结论：${plan.key_message || ""}`,
    `- 内容模块：${promptList(plan.content_blocks)}`,
    `- 视觉角色：${plan.visual_role || "内容页"}`,
    `- 图表/数据：${promptList(plan.data_needs)}`,
    "",
    "视觉系统：",
    styleGuide,
    "",
    "输出要求：",
    `- 所有中文统一使用“${layoutFont}”，保持清楚的字体层级。`,
    "- 使用同一套色彩、图表、图标和页眉页脚语言。标题区不要副标题。",
    options.useMasterLayout ? "- 标题、页码、安全边距、内容起始线、通用间距、背景和页脚基线贴近参考母图；中间内容布局必须根据本页信息自由发挥。" : "",
    "- 优先用流程、矩阵、卡片、路线图、对比结构承载信息；正文少而准，不堆密集小字。",
    "- 整页只表达当前页面主题，不出现其他页的标题、页码或缩略布局。",
  ].filter(Boolean).join("\n");
}

async function hybridContentPrompt(projectId, project, plan, slideNumber) {
  const style = project.selectedStyle || {};
  const stylePrompt = await readPublicPath(style.prompt);
  const styleGuide = singleSlideStyleGuide(stylePrompt, style, project);
  const layoutFont = normalizeLayoutFont(project.layoutFont);
  return [
    "任务：只生成一张 PPT 内容页的主体内容区域图，不是完整 PPT 页面。",
    "最终页面的主标题、页码、背景和页脚将由代码统一绘制；你只负责中间主体内容的视觉设计。",
    "输出 16:9 横向主体内容画布，主体信息集中在中央安全区，四周至少保留 6% 留白，便于后续完整缩放和组装。",
    "硬性禁止：不要全局主标题、不要页码、不要页眉、不要页脚、不要 Logo、不要项目名、不要资料来源、不要进度条、不要完整 PPT 外框。",
    "可以使用模块小标题、图表标签、关键数字和必要正文，但不能把本页主标题再次写进主体图。",
    "背景必须使用纯色 #F8FAFC（RGB 248,250,252），整张画布从中心到四边保持完全同色，不要改成纯白、暖白、渐变或其他浅灰。",
    "主体图只包含承载信息所必需的组件。禁止添加外围竖线、角线、斜纹、几何底纹、背景纹理、光晕、装饰箭头、无意义延长线或贴边装饰。",
    "所有卡片、图表和连接关系都应收在主体信息区域内；四周留白区必须干净，不能有任何线条或组件伸入。",
    "不要输出透明棋盘格，不要拼图，不要多页缩略图。",
    "",
    "当前页内容：",
    `- 页码语义：第 ${slideNumber} 页（不要在图中写页码）`,
    `- 主标题语义：${plan.title || ""}（仅用于理解，不要重复显示）`,
    `- 核心结论：${plan.key_message || ""}`,
    `- 内容模块：${promptList(plan.content_blocks)}`,
    `- 视觉角色：${plan.visual_role || "内容页"}`,
    `- 图表/数据：${promptList(plan.data_needs)}`,
    "",
    "视觉规范：",
    styleGuide,
    `- 中文字体气质统一参考“${layoutFont}”，正文与数字清晰锐利。`,
    "- 根据内容自由选择流程、矩阵、对比、时间轴、关系图、数据卡片或信息图，不沿用固定卡片数量。",
    "- 只设计一个完整主体构图，不生成顶部标题区和底部页脚区。",
    "",
    "输出：单张高清主体内容图，外围背景严格为 #F8FAFC、边缘无装饰，信息完整，适合无缝嵌入 1920×1080 PPT 的中间内容区。",
  ].join("\n");
}

async function composeHybridSlide(contentPath, outputPath, manifestPath, project, plan, slideNumber, totalSlides) {
  if (!existsSync(HYBRID_COMPOSITOR_SCRIPT)) {
    throw userError(`缺少混合页面合成脚本：${HYBRID_COMPOSITOR_SCRIPT}`);
  }
  await execFile(PYTHON, [
    HYBRID_COMPOSITOR_SCRIPT,
    "--content",
    contentPath,
    "--output",
    outputPath,
    "--title",
    String(plan.title || `第 ${slideNumber} 页`),
    "--project",
    String(project.title || ""),
    "--page-number",
    String(slideNumber),
    "--page-count",
    String(totalSlides || project.pageCount || 1),
    "--font",
    normalizeLayoutFont(project.layoutFont),
    "--manifest",
    manifestPath,
  ]);
}

function shouldUseMasterLayout(plan, slideNumber, totalSlides) {
  const role = String(plan?.visual_role || "").toLowerCase();
  const title = String(plan?.title || "");
  if (slideNumber <= 1) return false;
  if (slideNumber === totalSlides) return false;
  return !/(封面|cover|目录|agenda|结尾|结束|致谢|thank|appendix|附录)/i.test(`${role} ${title}`);
}

function singleSlideStyleGuide(rawPrompt, style, project) {
  const description = String(style.description || "")
    .replace(/(九宫格|预览|整套|多页|缩略图|拼图|3x3|nine-thumbnails|3x3-preview|thumbnail|collage|preview)/gi, "")
    .replace(/共?\s*\d+\s*张?\s*16:9[^。；;]*[。；;]?/gi, "")
    .replace(/\b(RFM|RACI|GANTT)\b/gi, "")
    .replace(/、{2,}/g, "、")
    .replace(/、([。；;,.，])/g, "$1")
    .trim();
  const palette = extractPalette(`${style.description || ""}\n${style.tags?.join(" ") || ""}\n${rawPrompt || ""}`);
  const traits = styleTraits(style, rawPrompt);

  return [
    `- 风格定位：${description || traits.positioning}`,
    `- 色彩：${palette || traits.palette}`,
    `- 版式：${traits.layout}`,
    `- 组件：${traits.components}`,
    `- 气质：${traits.tone}`,
  ].filter(Boolean).join("\n");
}

function promptList(value) {
  const items = Array.isArray(value) ? value : [value].filter(Boolean);
  if (!items.length) return "无特殊要求";
  return items
    .map((item) => String(item).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 5)
    .join("；");
}

function extractPalette(text) {
  const colors = [...new Set(String(text || "").match(/#[0-9a-f]{6}\b/gi) || [])].slice(0, 8);
  return colors.length ? `沿用已选模板色板：${colors.join("、")}；主色克制，强调色只用于关键节点、箭头、标签和结论。` : "";
}

function styleTraits(style, rawPrompt) {
  const source = `${style.name || ""} ${style.description || ""} ${(style.tags || []).join(" ")} ${rawPrompt || ""}`.toLowerCase();
  const isGrayOrange = /(gray|grey|orange|灰|橙|平安|pingan)/i.test(source);
  const isMethodology = /(methodology|方法论|process|流程|matrix|矩阵|journey|raci|roadmap|gantt|路线图|战略地图|七步法)/i.test(source);
  const isFinancial = /(financial|insurance|finance|金融|保险|平安)/i.test(source);

  if (isGrayOrange || isMethodology || isFinancial) {
    return {
      positioning: "企业级咨询方法论汇报页，适合组织、机制、流程、能力建设主题。",
      palette: "暖白和浅灰为底，蓝灰/深石板灰承载标题与正文，橙色少量用于关键节点、箭头、标签和最终结论。",
      layout: "窄页边距、细分割线、强网格对齐；优先使用三段式、左右对比、流程链路、矩阵或路线图。",
      components: "细边框卡片、轻量标签、编号圆点、箭头连接线、方法论框架、简洁表格和低饱和图标。",
      tone: "克制、专业、可信、偏金融/大型企业汇报，不使用大面积高饱和色块。",
    };
  }

  return {
    positioning: "企业级产品汇报页，强调问题拆解、方案结构和可执行结论。",
    palette: "浅色背景，深色标题，少量高亮色突出关键结论，避免多色噪音。",
    layout: "一个主标题区加一个核心内容结构，网格清晰，模块数量克制。",
    components: "卡片、流程图、检查清单、状态面板、简洁图标和轻量图表。",
    tone: "清爽、专业、信息密度适中，可直接用于正式汇报。",
  };
}

async function saveUpload(projectId, body) {
  const name = safeFileName(body.name || "upload.bin");
  const kind = body.kind === "references" ? "references" : "files";
  const folder = kind === "references" ? "source/references" : "source/files";
  const dest = path.join(projectDir(projectId), folder, name);
  await mkdir(path.dirname(dest), { recursive: true });
  const data = body.dataBase64 || "";
  await writeFile(dest, Buffer.from(data, "base64"));
  return { name, kind, path: publicPath(dest), size: Number(body.size || 0), type: body.type || "" };
}

async function collectUploadedContext(projectId) {
  const filesDir = path.join(projectDir(projectId), "source", "files");
  const refsDir = path.join(projectDir(projectId), "source", "references");
  const fileNames = await listDirNames(filesDir);
  const refNames = await listDirNames(refsDir);
  const snippets = [];
  for (const name of fileNames) {
    const fullPath = path.join(filesDir, name);
    if (isTextLike(name)) {
      snippets.push(`文件 ${name} 内容片段：\n${(await readTextSafe(fullPath)).slice(0, 4000)}`);
    }
  }
  return [
    `上传资料：${fileNames.length ? fileNames.join(", ") : "无"}`,
    `视觉参考：${refNames.length ? refNames.join(", ") : "无"}`,
    snippets.join("\n\n"),
  ].filter(Boolean).join("\n");
}

async function writeSourceText(projectId, text) {
  await mkdir(path.join(projectDir(projectId), "source"), { recursive: true });
  await writeFile(path.join(projectDir(projectId), "source", "source-text.md"), text || "", "utf-8");
}

async function loadProject(projectId) {
  await ensureProjectDirs(projectId);
  const file = projectJsonPath(projectId);
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, "utf-8"));
  }
  return createProject({ id: projectId });
}

async function listProjects() {
  await mkdir(PROJECT_ROOT, { recursive: true });
  const names = await listDirNames(PROJECT_ROOT);
  const projects = [];
  for (const name of names) {
    const file = projectJsonPath(name);
    if (!existsSync(file)) continue;
    try {
      projects.push(JSON.parse(await readFile(file, "utf-8")));
    } catch {
      // Ignore malformed project snapshots; the artifact files remain on disk.
    }
  }
  return projects.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

async function saveProject(project) {
  await ensureProjectDirs(project.id);
  await writeJson(projectJsonPath(project.id), project);
}

function applyDefaultTestStyle(project) {
  if (!project.selectedStyleId) {
    project.selectedStyleId = DEFAULT_TEST_STYLE.id;
    project.selectedStyle = DEFAULT_TEST_STYLE;
    appendLog(project, `测试模式默认视觉：${DEFAULT_TEST_STYLE.name}`);
  } else if (project.selectedStyleId === DEFAULT_TEST_STYLE.id && !project.selectedStyle) {
    project.selectedStyle = DEFAULT_TEST_STYLE;
  }
  return project;
}

function normalizeLayoutFont(value) {
  const font = String(value || "黑体").trim();
  return LAYOUT_FONTS.has(font) ? font : "黑体";
}

function normalizeCompositionMode(value) {
  return value === "full-page" ? "full-page" : "hybrid";
}

async function ensureProjectDirs(projectId) {
  await mkdir(projectDir(projectId), { recursive: true });
  for (const dir of [
    "source/files",
    "source/references",
    "outline",
    "visual/candidates",
    "visual/layout",
    "visual/pages/pilot",
    "visual/pages/final",
    "pptx",
    "style-capture",
  ]) {
    await mkdir(path.join(projectDir(projectId), dir), { recursive: true });
  }
}

async function serveStatic(req, res, url) {
  const decoded = decodeURIComponent(url.pathname);
  const requestPath = decoded === "/" ? "/product-app/index.html" : decoded;
  const fullPath = path.normalize(path.join(ROOT, requestPath));
  if (!fullPath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  let target = resolveLegacyStyleAssetPath(fullPath);
  if (!existsSync(target)) {
    sendJson(res, 404, { error: "Not found." });
    return;
  }
  const info = await stat(target);
  if (info.isDirectory()) target = path.join(target, "index.html");
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME_TYPES.get(ext) || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(target).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 80 * 1024 * 1024) throw httpError(413, "请求体超过 80MB。");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, data) {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function statusFromError(error) {
  return error.statusCode || error.status || 500;
}

function httpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

function requireApiKey(message) {
  if (!config.apiKey) throw userError(message);
}

function maskApiKey(value) {
  const key = String(value || "");
  return key ? `••••${key.slice(-4)}` : "";
}

function userError(message) {
  return httpError(200, message);
}

function projectDir(projectId) {
  return path.join(PROJECT_ROOT, sanitizeId(projectId));
}

function projectJsonPath(projectId) {
  return path.join(projectDir(projectId), "project.json");
}

function sanitizeId(value) {
  const id = String(value || "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) return `project-${Date.now()}`;
  return id.slice(0, 96);
}

function safeFileName(value) {
  const parsed = path.basename(String(value || "upload.bin"));
  return parsed.replace(/[\/\\:*?"<>|]+/g, "-").slice(0, 160) || "upload.bin";
}

function publicPath(value) {
  const absolute = path.resolve(value);
  if (!absolute.startsWith(ROOT)) return absolute;
  return `/${path.relative(ROOT, absolute).split(path.sep).map(encodeURIComponent).join("/")}`;
}

async function readPublicPath(publicUrl) {
  const fullPath = resolvePublicFilePath(publicUrl);
  if (!fullPath || !existsSync(fullPath)) return "";
  return readTextSafe(fullPath);
}

function resolveLegacyStyleAssetPath(file) {
  if (existsSync(file)) return file;
  const migrated = String(file)
    .replace("20260628-ping-an-inspired-", "20260628-orange-financial-inspired-")
    .replace("20260628-deidentified-ping-an-style-", "20260628-deidentified-orange-financial-style-");
  return existsSync(migrated) ? migrated : file;
}

async function readTextSafe(file) {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
}

async function isUsableImage(file) {
  try {
    const buffer = await readFile(file);
    if (buffer.length < 12) return false;
    const hex = buffer.subarray(0, 12).toString("hex");
    const ascii = buffer.subarray(0, 12).toString("ascii");
    return (
      hex.startsWith("89504e470d0a1a0a") ||
      hex.startsWith("ffd8ff") ||
      ascii.startsWith("RIFF")
    );
  } catch {
    return false;
  }
}

async function removeFiles(files) {
  for (const file of files) {
    await rm(file, { force: true }).catch(() => {});
  }
}

async function removeSlideFiles(outputDir, start, max) {
  const files = [];
  for (let index = start; index < max; index += 1) {
    const slideNumber = String(index + 1).padStart(2, "0");
    const imagePath = path.join(outputDir, `slide-${slideNumber}.png`);
    const contentImagePath = path.join(outputDir, "content", `slide-${slideNumber}-content.png`);
    files.push(
      imagePath,
      `${imagePath}.response.json`,
      path.join(outputDir, `slide-${slideNumber}-prompt.md`),
      path.join(outputDir, `slide-${slideNumber}-composition.json`),
      contentImagePath,
      `${contentImagePath}.response.json`
    );
  }
  await removeFiles(files);
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function listDirNames(dir) {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function listImages(dir) {
  const names = await listDirNames(dir);
  return names
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

function isTextLike(name) {
  return /\.(txt|md|csv|json|yaml|yml|html|css|js|ts)$/i.test(name);
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.join("\n").trim();
}

function parseJsonText(text) {
  const candidates = jsonCandidates(text);
  let lastError = null;
  for (const candidate of candidates) {
    for (const variant of jsonRepairVariants(candidate)) {
      try {
        return JSON.parse(variant);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw new Error(lastError ? `LLM JSON 解析失败：${lastError.message}` : "LLM 没有返回可解析 JSON。");
}

function jsonCandidates(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const candidates = [cleaned];
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const object = extractFirstJsonObject(cleaned);
  if (object) candidates.push(object);
  return [...new Set(candidates.filter(Boolean))];
}

function jsonRepairVariants(value) {
  const base = String(value || "").trim();
  const normalized = base
    .replace(/^\uFEFF/, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  return [
    base,
    normalized,
    normalized.replace(/,\s*([}\]])/g, "$1"),
  ];
}

function extractFirstJsonObject(text) {
  const source = String(text || "");
  const start = source.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

function fallbackOutlineFromText(project, raw) {
  const lines = String(raw || project.sourceText || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, "").trim())
    .filter(Boolean);
  const count = Math.max(4, Math.min(Number(project.pageCount || 8), 12));
  const topic = project.title || lines[0] || "未命名 PPT 项目";
  const slides = Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: index === 0 ? `封面：${topic}` : lines[index] || `第 ${index + 1} 页`,
    key_message: lines[index + 1] || "根据材料提炼本页核心信息。",
    content_blocks: lines.slice(index + 1, index + 4),
    visual_role: index === 0 ? "封面" : index === count - 1 ? "总结页" : "内容页",
    data_needs: [],
  }));
  return {
    outline_markdown: markdownFromOutline(project, { profile: { topic }, slides }),
    page_count: count,
    profile: {
      topic,
      purpose: "基于材料生成图片版 PPT",
      tone: "专业、清晰、可汇报",
      keywords: lines.slice(0, 5),
      page_count: count,
    },
    slides,
  };
}

function markdownFromOutline(project, parsed) {
  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const lines = [`# ${parsed.profile?.topic || project.title}`, "", "## 逐页大纲"];
  slides.forEach((slide, index) => {
    lines.push("", `${index + 1}. **${slide.title || `第 ${index + 1} 页`}**`);
    lines.push(`   ${slide.key_message || ""}`);
  });
  return lines.join("\n");
}

function firstMarkdownTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function outlineBullets(parsed) {
  if (Array.isArray(parsed.slides) && parsed.slides.length) {
    return parsed.slides.slice(0, 3).map((slide) => slide.key_message || slide.title).filter(Boolean);
  }
  return ["提炼业务目标与受众场景", "拆解关键发现、指标和证据链", "规划封面、重点页面和行动页"];
}

function profileLine(profile) {
  const parts = [
    profile.industry,
    profile.purpose,
    profile.page_count ? `${profile.page_count} pages` : "",
    Array.isArray(profile.keywords) ? profile.keywords.slice(0, 3).join("/") : "",
  ].filter(Boolean);
  return parts.join(" / ") || "image-deck";
}

function appendLog(project, message) {
  const logs = project.api?.logs || [];
  logs.unshift({
    at: new Date().toISOString(),
    message,
  });
  project.api = {
    ...(project.api || {}),
    projectDir: publicPath(projectDir(project.id)),
    logs: logs.slice(0, 20),
  };
}

function mergeVersions(existing, additions) {
  const seen = new Set(existing || []);
  for (const item of additions) seen.add(item);
  return [...seen];
}

function pick(source, keys) {
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
  }
  return result;
}

function apiopenccBaseUrl(value) {
  const base = String(value || "https://apiopencc.com").replace(/\/+$/, "");
  return base.endsWith("/v1") ? base.slice(0, -3) : base;
}

function maskUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return String(value || "");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanProcessError(message) {
  return String(message || "")
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function execFile(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${path.basename(command)} failed (${code}): ${stderr || stdout}`));
      }
    });
  });
}
