const STORAGE_KEY = "ppt-studio-state-v4";
const API_ORIGIN = ["5173", "5174"].includes(window.location.port) ? "" : "http://localhost:5174";
const DEFAULT_TEST_STYLE_ID = "20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734";
const LAYOUT_FONT_OPTIONS = ["黑体", "微软雅黑", "思源黑体", "华文楷体", "宋体", "华文中宋", "苹方"];

const steps = [
  {
    id: "intake",
    label: "上传材料",
    kicker: "Step 1",
    title: "上传材料",
    stage: 0,
  },
  {
    id: "outline",
    label: "确认大纲",
    kicker: "Step 2",
    title: "确认大纲",
    stage: 1,
  },
  {
    id: "visual",
    label: "确认视觉",
    kicker: "Step 3",
    title: "确认视觉",
    stage: 2,
  },
  {
    id: "layout",
    label: "生成母版",
    kicker: "Step 4",
    title: "生成母版",
    stage: 3,
  },
  {
    id: "slides",
    label: "生成页面",
    kicker: "Step 5",
    title: "生成页面",
    stage: 4,
  },
  {
    id: "delivery",
    label: "交付 PPT",
    kicker: "Step 6",
    title: "交付 PPT",
    stage: 5,
  },
  {
    id: "refine",
    label: "局部微调",
    kicker: "Step 7",
    title: "局部微调",
    stage: 6,
  },
];

const defaultStyles = [
  {
    id: "20260628-orange-financial-inspired-gray-orange-methodology-p-c0b261",
    name: "灰橙方法论九宫格",
    description: "灰蓝为底，橙色做高亮，适合流程模型、矩阵、旅程图、路线图和咨询方法论汇报。",
    pageCount: 9,
    tags: ["financial-insurance", "gray-orange", "methodology", "matrix"],
    image: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-gray-orange-methodology-p-c0b261/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-gray-orange-methodology-p-c0b261/prompt.md",
    source: "library",
  },
  {
    id: "20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734",
    name: "白底橙红金融咨询",
    description: "白底、橙红强调、高密度咨询报告页，适合业务复盘、经营分析和金融保险增长方案。",
    pageCount: 9,
    tags: ["financial-insurance", "white-background", "consulting-style"],
    image: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-white-3x3-financial-ppt-p-b32734/prompt.md",
    source: "library",
  },
  {
    id: "20260628-orange-financial-inspired-3x3-orange-financial-serv-32dbf0",
    name: "橙红金融服务增长",
    description: "橙红主色结合金融服务场景，含封面、路径页、图表页和策略页。",
    pageCount: 9,
    tags: ["orange-red", "guofeng-cover", "chart-heavy"],
    image: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-3x3-orange-financial-serv-32dbf0/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-orange-financial-inspired-3x3-orange-financial-serv-32dbf0/prompt.md",
    source: "library",
  },
  {
    id: "20260628-deidentified-orange-financial-style-corporate-insur-3be19e",
    name: "企业保险内部汇报",
    description: "脱敏金融保险内部汇报风格，强调流程箭头、阶段条、右侧结论栏和图表占位系统。",
    pageCount: 6,
    tags: ["dense-report", "process-arrow", "anonymized"],
    image: "/ppt-design/assets/style-templates/20260628-deidentified-orange-financial-style-corporate-insur-3be19e/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-deidentified-orange-financial-style-corporate-insur-3be19e/prompt.md",
    source: "library",
  },
];

const sampleSlides = [
  "/work/hr-talent-performance-test/visual/pages/final/slide-01.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-02.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-03.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-04.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-05.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-06.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-07.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-08.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-09.png",
  "/work/hr-talent-performance-test/visual/pages/final/slide-10.png",
];

const sampleSource = `主题：人力与组织绩效经营复盘
受众：董事会、HRBP、业务负责人
目标：把人才结构、绩效分布、关键岗位和后续行动收敛成一套 10 页经营汇报

核心材料：
1. 2026 上半年组织效能提升，重点关注关键岗位供给、干部梯队、绩效校准。
2. 一线团队人均产出提升 12%，但新业务部门招聘周期拉长。
3. 需要呈现指标体系、问题归因、人才盘点、行动路线图。`;

const defaultProjects = [
  {
    id: "project-hr-performance",
    title: "人力效能诊断汇报",
    createdAt: "2026-06-28",
    updatedAt: "刚刚",
    status: "PPTX 交付",
    stage: 4,
    pageCount: 10,
    sourceText: sampleSource,
    files: ["组织绩效诊断.xlsx", "人才盘点访谈纪要.docx"],
    references: ["灰橙方法论参考.png"],
    outline: {
      title: "组织效能与人才绩效诊断",
      bullets: ["业务结果与组织结构对齐", "人才供给和绩效分布拆解", "关键岗位风险与行动路线图"],
      profile: "financial-insurance / management-report / 10 pages / data-heavy",
    },
    selectedStyleId: "20260628-orange-financial-inspired-gray-orange-methodology-p-c0b261",
    slides: sampleSlides,
    pptxUrl: "/outputs/hr-talent-performance-gray-orange-v2.pptx",
    versions: ["v1 首批四页确认", "v2 全量页面生成", "v3 页 03 局部强调图表"],
    lastRefine: "把右侧结论栏调成更强的橙色强调，保留灰蓝底色。",
    api: {
      projectDir: "/work/hr-talent-performance-test",
      logs: [{ at: "2026-06-28T00:00:00.000Z", message: "样例项目，真实流程请新建项目后运行。" }],
    },
  },
  {
    id: "project-auto-channel",
    title: "新能源渠道季度复盘",
    createdAt: "2026-07-01",
    updatedAt: "12 分钟前",
    status: "确认大纲",
    stage: 1,
    pageCount: 12,
    sourceText: "目标：生成一套新能源渠道季度复盘 PPT，包含区域销量、转化漏斗、门店画像和下季度动作。",
    files: ["渠道销售数据.csv"],
    references: [],
    outline: {
      title: "新能源渠道季度复盘",
      bullets: ["区域销量与渠道结构", "门店转化漏斗", "下季度动作"],
      profile: "auto / sales-review / 12 pages / chart-heavy",
    },
    selectedStyleId: null,
    slides: [],
    pptxUrl: "",
    versions: [],
    lastRefine: "",
    api: {
      projectDir: "",
      logs: [],
    },
  },
];

const state = loadState();
const els = {};
let toastTimer = null;
let viewerRequestId = 0;
let annotationCanvas = null;
let annotationTool = "select";
let annotationColor = "#ef4444";
let annotationStrokeWidth = 5;
let annotationHistory = [];
let annotationHistoryIndex = -1;
let annotationShapeDraft = null;
let annotationRestoring = false;

function freshState() {
  return {
    activeView: "workspace",
    workspaceScreen: "list",
    activeProjectId: defaultProjects[0].id,
    activeStepId: "intake",
    projects: structuredClone(defaultProjects),
    styles: structuredClone(defaultStyles),
    selectedSlideIndex: 0,
    styleSearch: "",
    inspectedStyleId: defaultStyles[0].id,
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return freshState();

  try {
    const parsed = JSON.parse(saved);
    return {
      ...freshState(),
      ...parsed,
      projects: (parsed.projects?.length ? parsed.projects : structuredClone(defaultProjects)).map(normalizeProjectStyle),
      styles: mergeDefaultStyles(parsed.styles || []),
    };
  } catch {
    return freshState();
  }
}

function mergeDefaultStyles(savedStyles) {
  const byId = new Map(defaultStyles.map((style) => [style.id, style]));
  savedStyles.map(normalizeStyleRecord).forEach((style) => byId.set(style.id, style));
  return [...byId.values()];
}

function normalizeStyleId(value) {
  return String(value || "")
    .replace("20260628-ping-an-inspired-", "20260628-orange-financial-inspired-")
    .replace("20260628-deidentified-ping-an-style-", "20260628-deidentified-orange-financial-style-");
}

function normalizeStyleAssetPath(value) {
  return String(value || "")
    .replace("20260628-ping-an-inspired-", "20260628-orange-financial-inspired-")
    .replace("20260628-deidentified-ping-an-style-", "20260628-deidentified-orange-financial-style-");
}

function normalizeStyleRecord(style) {
  if (!style) return style;
  return {
    ...style,
    id: normalizeStyleId(style.id),
    image: normalizeStyleAssetPath(style.image),
    prompt: normalizeStyleAssetPath(style.prompt),
    masters: normalizeMasters(style.masters),
  };
}

function normalizeMasters(masters) {
  if (!Array.isArray(masters)) return [];
  const unique = new Map();
  masters.forEach((master, index) => {
    if (!master?.image) return;
    const normalized = {
      ...master,
      id: master.id || master.fingerprint || `master-${index}-${master.image}`,
      image: normalizeStyleAssetPath(master.image),
      prompt: normalizeStyleAssetPath(master.prompt),
    };
    unique.set(normalized.image || normalized.id, normalized);
  });
  return [...unique.values()];
}

function masterFromProject(project) {
  if (!project?.layout?.master || !project.selectedStyleId) return null;
  return {
    id: project.layout.sourceMasterId || project.layout.fingerprint || `project-${project.id}`,
    name: project.layout.name || `${project.title || "项目"}母版`,
    image: project.layout.master,
    prompt: project.layout.prompt || "",
    font: project.layoutFont || "黑体",
    fingerprint: project.layout.fingerprint || "",
    sourceProjectId: project.layout.sourceProjectId || project.id,
    createdAt: project.layout.createdAt || project.createdAt || "",
  };
}

function normalizeProjectStyle(project) {
  if (!project) return project;
  return {
    ...project,
    selectedStyleId: normalizeStyleId(project.selectedStyleId),
    selectedStyle: normalizeStyleRecord(project.selectedStyle),
    compositionMode: project.compositionMode === "full-page" ? "full-page" : "hybrid",
    refineAnnotations: project.refineAnnotations || {},
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
}

function pilotPageCount(project) {
  return Math.min(4, Math.max(1, Number(project?.pageCount || 4)));
}

function selectedStyle(project = activeProject()) {
  const selectedId = normalizeStyleId(project.selectedStyleId);
  return state.styles.find((style) => style.id === selectedId) || normalizeStyleRecord(project.selectedStyle) || null;
}

function defaultTestStyle() {
  return state.styles.find((style) => style.id === DEFAULT_TEST_STYLE_ID) || state.styles[0];
}

function applyDefaultTestStyle(project) {
  const style = defaultTestStyle();
  if (!style || project.selectedStyleId) return project;
  project.selectedStyleId = style.id;
  project.selectedStyle = style;
  project.visualConfirmed = false;
  project.stage = Math.max(project.stage || 0, 2);
  project.status = "确认视觉";
  return project;
}

function inspectedStyle() {
  return state.styles.find((style) => style.id === state.inspectedStyleId) || selectedStyle() || state.styles[0];
}

function init() {
  cacheElements();
  bindEvents();
  render();
  hydrateProjectsFromApi();
  hydrateApiConfig();
}

function cacheElements() {
  [
    "project-list-screen",
    "project-detail-screen",
    "project-summary",
    "project-gallery",
    "back-projects-button",
    "project-title-input",
    "project-meta",
    "project-status",
    "step-nav",
    "step-kicker",
    "step-title",
    "step-content",
    "primary-action-button",
    "action-note",
    "job-stack",
    "style-grid",
    "style-search",
    "style-detail",
    "style-name-input",
    "style-desc-input",
    "style-tags-input",
    "save-style-button",
    "capture-note",
    "api-key-form",
    "api-key-input",
    "api-key-status",
    "api-key-note",
    "new-project-button",
    "seed-demo-button",
    "toast",
    "image-viewer",
    "image-viewer-backdrop",
    "image-viewer-close",
    "image-viewer-image",
    "image-viewer-title",
    "image-viewer-prompt",
    "image-viewer-prompt-path",
    "image-viewer-copy-prompt",
    "image-viewer-references",
    "image-viewer-reference-note",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      persist();
      render();
    });
  });

  els["new-project-button"].addEventListener("click", createProject);
  els["seed-demo-button"].addEventListener("click", resetDemo);
  els["back-projects-button"].addEventListener("click", showProjectList);
  els["project-title-input"].addEventListener("input", updateProjectTitle);
  els["primary-action-button"].addEventListener("click", runPrimaryAction);
  els["image-viewer-backdrop"].addEventListener("click", closeImageViewer);
  els["image-viewer-close"].addEventListener("click", closeImageViewer);
  els["image-viewer-copy-prompt"].addEventListener("click", copyViewerPrompt);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeImageViewer();
  });
  els["style-search"].addEventListener("input", (event) => {
    state.styleSearch = event.target.value;
    persist();
    renderStyleLibrary();
  });
  els["save-style-button"].addEventListener("click", saveCapturedStyle);
  els["api-key-form"].addEventListener("submit", saveApiConfig);
}

async function hydrateApiConfig() {
  try {
    const result = await apiRequest("/api/config");
    renderApiConfig(result);
  } catch (error) {
    renderApiConfig({ configured: false }, error.message || "本地服务未连接");
  }
}

function renderApiConfig(result, errorMessage = "") {
  if (!els["api-key-status"]) return;
  const configured = Boolean(result?.configured);
  els["api-key-status"].textContent = configured ? "已配置" : "未配置";
  els["api-key-status"].classList.toggle("is-configured", configured);
  els["api-key-note"].textContent = errorMessage || (configured ? `当前密钥：${result.keySuffix || "已隐藏"}` : "尚未配置 API KEY，生成操作将无法调用模型。");
}

async function saveApiConfig(event) {
  event.preventDefault();
  const input = els["api-key-input"];
  const apiKey = input.value.trim();
  if (!apiKey) {
    renderApiConfig({ configured: false }, "请输入 API KEY。留空不会覆盖当前配置。");
    return;
  }
  try {
    input.disabled = true;
    const result = await apiRequest("/api/config", { method: "POST", body: { apiKey } });
    input.value = "";
    renderApiConfig(result);
    showToast("API KEY 已更新");
  } catch (error) {
    renderApiConfig({ configured: false }, error.message || "保存失败，请检查本地服务。");
  } finally {
    input.disabled = false;
  }
}

function render() {
  renderViews();
  renderWorkspace();
  renderStyleLibrary();
}

async function hydrateProjectsFromApi() {
  try {
    const result = await apiRequest("/api/projects");
    if (!result.projects?.length) return;
    state.projects = result.projects.map(normalizeProjectStyle);
    state.projects.forEach((project) => {
      if (!project.selectedStyle) return;
      const master = masterFromProject(project);
      mergeStyles([{
        ...project.selectedStyle,
        masters: master ? [...(project.selectedStyle.masters || []), master] : project.selectedStyle.masters,
      }]);
    });
    if (!state.projects.some((project) => project.id === state.activeProjectId)) {
      state.activeProjectId = state.projects[0].id;
      state.workspaceScreen = "list";
    }
    persist();
    render();
  } catch {
    // Static-file mode remains usable for layout/debugging, but real actions need the Node API.
  }
}

function renderViews() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${state.activeView}-view`);
  });
}

function renderWorkspace() {
  els["project-list-screen"].classList.toggle("is-active", state.workspaceScreen === "list");
  els["project-detail-screen"].classList.toggle("is-active", state.workspaceScreen === "detail");

  if (state.workspaceScreen === "list") {
    renderProjectHome();
  } else {
    renderProjectDetail();
  }
}

function renderProjectHome() {
  renderProjectSummary();
  renderProjectGallery();
}

function renderProjectSummary() {
  const delivered = state.projects.filter((project) => Boolean(project.pptxUrl)).length;
  const needsConfirm = state.projects.filter((project) => project.stage > 0 && project.stage < 4).length;
  const inProgress = state.projects.length - delivered;
  const stats = [
    ["全部项目", state.projects.length],
    ["进行中", inProgress],
    ["待确认", needsConfirm],
  ];

  els["project-summary"].replaceChildren();
  stats.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    els["project-summary"].appendChild(card);
  });
}

function renderProjectGallery() {
  els["project-gallery"].replaceChildren();
  state.projects.forEach((project) => {
    const template = document.getElementById("project-card-template");
    const card = template.content.firstElementChild.cloneNode(true);
    const image = project.slides[0] || selectedStyle(project)?.image || state.styles[0].image;
    const nextLabel = project.pptxUrl ? "查看交付" : getPrimaryAction(project).label;
    card.querySelector(".project-card-image").src = image;
    card.querySelector(".project-card-image").alt = `${project.title} 预览`;
    card.querySelector(".project-card-topline").textContent = project.status;
    card.querySelector(".project-card-title").textContent = project.title;
    card.querySelector(".project-card-meta").textContent = `${project.pageCount} 页 · ${project.updatedAt} · ${project.files.length} 份材料`;
    card.querySelector(".project-card-action").textContent = `下一步：${nextLabel}`;
    card.addEventListener("click", () => openProject(project.id));
    els["project-gallery"].appendChild(card);
  });
}

function openProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  state.activeProjectId = projectId;
  state.workspaceScreen = "detail";
  state.activeStepId = recommendedStepId(project);
  state.selectedSlideIndex = 0;
  persist();
  render();
}

function showProjectList() {
  state.workspaceScreen = "list";
  persist();
  renderWorkspace();
}

function recommendedStepId(project) {
  if (!project.outline) return "intake";
  if (!isVisualConfirmed(project)) return "visual";
  if (project.compositionMode === "full-page" && !project.layout?.master) return "layout";
  if (project.slides.length < pilotPageCount(project)) return "slides";
  if (!project.pptxUrl) return "delivery";
  return "delivery";
}

function renderProjectDetail() {
  const project = activeProject();
  const currentStep = steps.find((step) => step.id === state.activeStepId) || steps[0];

  els["project-detail-screen"].classList.toggle("is-refine-mode", currentStep.id === "refine");

  els["project-title-input"].value = project.title;
  els["project-meta"].textContent = `${project.createdAt} 创建 · ${project.pageCount} 页 · ${project.files.length} 份材料 · ${project.references.length} 张参考`;
  els["project-status"].textContent = project.status;
  els["step-kicker"].textContent = currentStep.kicker;
  els["step-title"].textContent = currentStep.title;

  renderStepNav(project);
  renderStepContent(project, currentStep);
  renderPrimaryAction(project);
  renderJobs(project);
}

function renderStepNav(project) {
  els["step-nav"].replaceChildren();
  steps.forEach((step) => {
    const button = document.createElement("button");
    button.type = "button";
    const isActive = state.activeStepId === step.id;
    const isDone = isStepDone(project, step.id);
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-done", isDone);
    button.innerHTML = `<span>${step.label}</span><span>${isActive ? "当前" : isDone ? "完成" : ""}</span>`;
    button.addEventListener("click", () => {
      state.activeStepId = step.id;
      persist();
      renderProjectDetail();
    });
    els["step-nav"].appendChild(button);
  });
}

function isVisualConfirmed(project) {
  return Boolean(
    project.visualConfirmed ||
    project.layout?.master ||
    project.slides?.length ||
    project.pptxUrl
  );
}

function isStepDone(project, stepId) {
  const checks = {
    intake: Boolean(project.outline),
    outline: Boolean(project.outline),
    visual: isVisualConfirmed(project),
    layout: Boolean(project.layout?.master),
    slides: (project.slides?.length || 0) >= 4,
    delivery: Boolean(project.pptxUrl),
    refine: false,
  };
  return checks[stepId] || false;
}

function renderStepContent(project, step) {
  disposeAnnotationEditor();
  els["step-content"].replaceChildren();

  const renderers = {
    intake: renderIntakeStep,
    outline: renderOutlineStep,
    layout: renderLayoutStep,
    visual: renderVisualStep,
    slides: renderSlidesStep,
    delivery: renderDeliveryStep,
    refine: renderRefineStep,
  };

  renderers[step.id](project);
}

function renderIntakeStep(project) {
  const card = surfaceCard();
  card.innerHTML = `
    <div class="section-title"><h3>材料输入</h3><span>source/</span></div>
    <label class="field-label" for="source-text">文本材料</label>
    <textarea id="source-text" rows="10" spellcheck="false">${escapeHtml(project.sourceText || "")}</textarea>
    <div class="upload-row">
      <label class="upload-button">
        <input id="file-input" type="file" multiple />
        <svg class="icon"><use href="#icon-upload"></use></svg>
        <span>上传资料</span>
      </label>
      <label class="upload-button">
        <input id="reference-input" type="file" accept="image/*" multiple />
        <svg class="icon"><use href="#icon-style"></use></svg>
        <span>视觉参考</span>
      </label>
    </div>
    <div class="file-list" id="file-list"></div>
  `;
  els["step-content"].appendChild(card);

  card.querySelector("#source-text").addEventListener("input", (event) => {
    project.sourceText = event.target.value;
    project.updatedAt = "刚刚";
    persist();
  });
  card.querySelector("#file-input").addEventListener("change", (event) => updateFiles(event, "files"));
  card.querySelector("#reference-input").addEventListener("change", (event) => updateFiles(event, "references"));
  renderInlineFiles(card.querySelector("#file-list"), project);
}

function renderOutlineStep(project) {
  const card = surfaceCard();
  card.innerHTML = `<div class="section-title"><h3>大纲草案</h3><span>outline/</span></div>`;
  const panel = document.createElement("div");
  panel.className = "outline-panel";

  if (!project.outline) {
    panel.innerHTML = `<div class="empty-state">还没有生成大纲。请回到「上传材料」并生成大纲。</div>`;
  } else {
    panel.innerHTML = `
      <h3>${escapeHtml(project.outline.title)}</h3>
      <ul>${project.outline.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
      <div class="profile-line">${escapeHtml(project.outline.profile)}</div>
    `;
  }

  card.appendChild(panel);
  els["step-content"].appendChild(card);
}

function renderVisualStep(project) {
  const style = selectedStyle(project) || state.styles[0];
  const hero = surfaceCard();
  hero.innerHTML = `
    <div class="section-title"><h3>当前视觉预览</h3><span>visual/candidates/</span></div>
    <div class="canvas-frame has-image">
      <img src="${style.image}" alt="${escapeHtml(style.name)}" />
      <div class="canvas-empty">Preview</div>
    </div>
  `;
  els["step-content"].appendChild(hero);

  const candidates = surfaceCard();
  candidates.innerHTML = `<div class="section-title"><h3>候选视觉</h3><span>${escapeHtml(style.name)}</span></div>`;
  const strip = document.createElement("div");
  strip.className = "candidate-strip";
  state.styles.slice(0, 5).forEach((candidate) => {
    strip.appendChild(createStyleCard(candidate, {
      selected: project.selectedStyleId === candidate.id,
      onSelect: () => {
        project.selectedStyleId = candidate.id;
        project.selectedStyle = candidate;
        project.visualConfirmed = false;
        project.stage = Math.max(project.stage, 2);
        project.status = "确认视觉";
        project.updatedAt = "刚刚";
        state.inspectedStyleId = candidate.id;
        persist();
        renderProjectDetail();
        showToast(`已选择：${candidate.name}`);
      },
    }));
  });
  candidates.appendChild(strip);
  els["step-content"].appendChild(candidates);
}

function renderLayoutStep(project) {
  const style = selectedStyle(project) || defaultTestStyle();
  const masters = normalizeMasters(style?.masters);
  project.layoutFont = project.layoutFont || "黑体";
  const card = surfaceCard();
  card.innerHTML = `
    <div class="section-title"><h3>版式母图</h3><span>visual/layout/</span></div>
    <div class="profile-line">当前风格：${escapeHtml(style?.name || "白底橙红金融咨询")}</div>
    <label class="field-label" for="layout-font-select">中文字体</label>
    <select id="layout-font-select">
      ${LAYOUT_FONT_OPTIONS.map((font) => `<option value="${escapeHtml(font)}"${font === project.layoutFont ? " selected" : ""}>${escapeHtml(font)}</option>`).join("")}
    </select>
  `;

  card.querySelector("#layout-font-select").addEventListener("change", (event) => {
    project.layoutFont = event.target.value;
    project.updatedAt = "刚刚";
    persist();
    showToast(`已选择字体：${project.layoutFont}，重新生成母版后生效`);
  });

  if (masters.length) {
    const chooser = document.createElement("section");
    chooser.className = "master-chooser";
    chooser.innerHTML = `
      <div class="section-title master-chooser-title">
        <h3>选择已有母版</h3>
        <span>${masters.length} 个关联母版</span>
      </div>
      <div class="profile-line">直接采用可跳过生图，也可以继续生成一张新母版。</div>
    `;
    const grid = document.createElement("div");
    grid.className = "master-choice-grid";
    masters.forEach((master) => {
      grid.appendChild(createMasterChoice(master, project));
    });
    chooser.appendChild(grid);
    card.appendChild(chooser);
  }

  if (project.layout?.master) {
    const layoutCard = createImageCard(project.layout.master, "master-layout.png", "母版已生成 · 后续前4页会围绕它生成变体");
    layoutCard.classList.add("master-layout-card");
    card.appendChild(layoutCard);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = isVisualConfirmed(project)
      ? "还没有视觉母版。先选择字体并生成母版，确认标题、色彩、间距和背景是否统一。"
      : "请先完成“确认视觉”，再生成母版。";
    card.appendChild(empty);
  }

  const actions = document.createElement("div");
  actions.className = "step-action-row";
  const uploadLabel = document.createElement("label");
  uploadLabel.className = `button button-secondary master-upload-button${!isVisualConfirmed(project) ? " is-disabled" : ""}`;
  uploadLabel.innerHTML = `
    <svg class="icon"><use href="#icon-upload"></use></svg>
    <span>上传本地母版</span>
    <input type="file" accept="image/png,image/jpeg,image/webp"${!isVisualConfirmed(project) ? " disabled" : ""} />
  `;
  uploadLabel.querySelector("input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadLabel.classList.add("is-loading");
    uploadLabel.querySelector("span").textContent = "上传中";
    uploadLabel.querySelector("input").disabled = true;
    try {
      await uploadMasterLayout(file);
    } catch (error) {
      recordProjectError(error);
      renderProjectDetail();
      showToast(error.message || "母版上传失败");
    }
  });
  const generateButton = document.createElement("button");
  generateButton.className = "button button-primary";
  generateButton.type = "button";
  generateButton.disabled = !isVisualConfirmed(project);
  generateButton.textContent = project.layout?.master ? "重新生成母版" : masters.length ? "生成新母版" : "生成母版";
  generateButton.addEventListener("click", () => runInlineAction(
    generateButton,
    project.layout?.master ? "母版重新生成中" : "母版生成中",
    () => generateMasterLayout({ force: Boolean(project.layout?.master) })
  ));
  actions.append(uploadLabel, generateButton);
  card.appendChild(actions);
  els["step-content"].appendChild(card);
}

function createMasterChoice(master, project) {
  const button = document.createElement("button");
  const selected = project.layout?.sourceMasterId === master.id
    || (project.layout?.master && project.layout.master === master.image);
  button.type = "button";
  button.className = `master-choice${selected ? " is-selected" : ""}`;
  button.setAttribute("aria-pressed", String(selected));
  button.innerHTML = `
    <img src="${escapeHtml(master.image)}" alt="${escapeHtml(master.name || "关联母版")}" loading="lazy" />
    <span class="master-choice-copy">
      <strong>${escapeHtml(master.name || "未命名母版")}</strong>
      <small>${escapeHtml(master.font || "默认字体")}${master.sourceProjectId ? " · 来自项目" : ""}</small>
    </span>
    <span class="master-choice-state">${selected ? "已采用" : "采用"}</span>
  `;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.classList.add("is-loading");
    button.querySelector(".master-choice-state").textContent = "应用中";
    try {
      await selectExistingMaster(master);
    } catch (error) {
      recordProjectError(error);
      renderProjectDetail();
      showToast(error.message || "母版应用失败");
    }
  });
  return button;
}

function renderSlidesStep(project) {
  project.compositionMode = project.compositionMode === "full-page" ? "full-page" : "hybrid";
  const hybridMode = project.compositionMode === "hybrid";
  const pilotCount = pilotPageCount(project);
  const card = surfaceCard();
  card.innerHTML = `
    <div class="section-title"><h3>首批 ${pilotCount} 页生成</h3><span>visual/pages/pilot/</span></div>
    <div class="composition-mode" role="group" aria-label="页面生成模式">
      <button type="button" class="composition-option${hybridMode ? " is-active" : ""}" data-composition-mode="hybrid" aria-pressed="${hybridMode}">
        <strong>代码框架</strong>
        <span>标题、背景和页脚固定，模型只生成主体</span>
      </button>
      <button type="button" class="composition-option${!hybridMode ? " is-active" : ""}" data-composition-mode="full-page" aria-pressed="${!hybridMode}">
        <strong>整页生图</strong>
        <span>继续使用母版参考图生成完整页面</span>
      </button>
    </div>
    <div class="profile-line">${hybridMode
      ? "内容页会先生成主体图，再由代码组装为 1920×1080 页面；封面和结尾页仍使用整页生图。"
      : project.layout?.master ? "已接入版式母图作为参考图。" : "请先到「生成母版」步骤生成版式母图。"}</div>
  `;

  card.querySelectorAll("[data-composition-mode]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mode = button.dataset.compositionMode;
      if (project.compositionMode === mode) return;
      project.compositionMode = mode;
      project.updatedAt = "刚刚";
      persist();
      renderProjectDetail();
      showToast(mode === "hybrid" ? "已切换为代码框架，重新生成页面后生效" : "已切换为整页生图，重新生成页面后生效");
      try {
        const result = await syncProjectToApi(project);
        applyProjectUpdate(result.project);
        persist();
      } catch (error) {
        recordProjectError(error, project);
      }
    });
  });
  if (!project.slides.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = hybridMode || project.layout?.master
      ? `还没有真实生成的首批 ${pilotCount} 页。点击下方按钮开始生成。`
      : `还没有真实生成的首批 ${pilotCount} 页。请先生成版式母图。`;
    card.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "style-grid";
    project.slides.slice(0, 4).forEach((src, index) => {
      const slideLabel = `slide-${String(index + 1).padStart(2, "0")}.png`;
      grid.appendChild(createImageCard(src, slideLabel, "已生成"));
    });
    card.appendChild(grid);
  }

  const actions = document.createElement("div");
  actions.className = "step-action-row";
  const generateButton = document.createElement("button");
  generateButton.className = "button button-primary";
  generateButton.type = "button";
  generateButton.disabled = hybridMode ? !isVisualConfirmed(project) : !project.layout?.master;
  generateButton.textContent = project.slides.length ? `重新生成首批${pilotCount}页` : `生成首批${pilotCount}页`;
  generateButton.addEventListener("click", () => runInlineAction(
    generateButton,
    project.slides.length ? `首批${pilotCount}页重新生成中` : `首批${pilotCount}页生成中`,
    () => generatePilotSlides({ force: Boolean(project.slides.length) })
  ));
  actions.appendChild(generateButton);
  card.appendChild(actions);
  els["step-content"].appendChild(card);
}

function createImageCard(src, titleText, copyText) {
  const item = document.createElement("div");
  item.className = "step-card";

  const previewButton = document.createElement("button");
  previewButton.className = "step-card-preview";
  previewButton.type = "button";
  previewButton.setAttribute("aria-label", `查看大图：${titleText}`);
  previewButton.addEventListener("click", () => openImageViewer(src, titleText));

  const image = document.createElement("img");
  image.className = "step-card-media";
  image.src = src;
  image.alt = titleText;
  image.loading = "lazy";
  previewButton.appendChild(image);

  const hint = document.createElement("span");
  hint.className = "step-card-zoom";
  hint.innerHTML = `<svg class="icon"><use href="#icon-expand"></use></svg><span>查看大图</span>`;
  previewButton.appendChild(hint);

  const title = document.createElement("div");
  title.className = "step-card-title";
  title.textContent = titleText;

  const copy = document.createElement("div");
  copy.className = "step-card-copy";
  copy.textContent = copyText;

  item.append(previewButton, title, copy);
  return item;
}

function openImageViewer(src, title) {
  els["image-viewer-image"].src = src;
  els["image-viewer-image"].alt = title;
  els["image-viewer-title"].textContent = title;
  els["image-viewer-prompt"].textContent = "正在加载 prompt...";
  els["image-viewer-prompt-path"].textContent = "prompt";
  els["image-viewer-reference-note"].textContent = "reference";
  renderViewerReferences([]);
  els["image-viewer"].classList.add("is-open");
  els["image-viewer"].setAttribute("aria-hidden", "false");
  document.body.classList.add("is-viewer-open");
  loadViewerContext(src, title);
  els["image-viewer-close"].focus();
}

function closeImageViewer() {
  if (!els["image-viewer"]?.classList.contains("is-open")) return;
  els["image-viewer"].classList.remove("is-open");
  els["image-viewer"].setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-viewer-open");
  els["image-viewer-image"].removeAttribute("src");
}

async function copyViewerPrompt() {
  const prompt = els["image-viewer-prompt"].textContent || "";
  if (!prompt || prompt === "正在加载 prompt...") {
    showToast("Prompt 还没有加载完成");
    return;
  }
  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("Prompt 已复制");
}

async function loadViewerContext(src, title) {
  const requestId = ++viewerRequestId;
  const context = await buildViewerContext(src, title, activeProject());
  els["image-viewer-prompt-path"].textContent = context.promptPath ? shortArtifactLabel(context.promptPath) : "无 prompt";
  els["image-viewer-reference-note"].textContent = context.references.length ? `${context.references.length} 张` : "无引用图";
  renderViewerReferences(context.references);
  if (!context.promptPath) {
    els["image-viewer-prompt"].textContent = "没有找到对应的 prompt 文件。";
    return;
  }
  try {
    const response = await fetch(`${API_ORIGIN}${context.promptPath}`);
    const text = await response.text();
    if (requestId !== viewerRequestId) return;
    if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
    els["image-viewer-prompt"].textContent = text || "prompt 文件为空。";
  } catch (error) {
    if (requestId !== viewerRequestId) return;
    els["image-viewer-prompt"].textContent = `读取 prompt 失败：${error.message || error}`;
  }
}

async function buildViewerContext(src, title, project) {
  const promptPath = inferPromptPath(src);
  const references = [];
  const hybridContentPath = inferHybridContentPath(src);
  if (project?.compositionMode === "hybrid" && hybridContentPath && await assetExists(hybridContentPath)) {
    references.push({
      src: hybridContentPath,
      title: hybridContentPath.split("/").at(-1) || "content.png",
      note: "模型生成的主体内容图",
    });
  }
  const masterLayoutPath = project?.layout?.master || inferMasterLayoutPath(src);
  if (!references.length && /slide-\d+\.png$/i.test(src) && masterLayoutPath && await assetExists(masterLayoutPath)) {
    references.push({
      src: masterLayoutPath,
      title: "master-layout.png",
      note: "版式母图",
    });
  }
  return { promptPath, references };
}

function inferHybridContentPath(src) {
  const match = String(src || "").match(/^(.*\/visual\/pages\/(?:pilot|final))\/(slide-\d+)\.png$/i);
  if (!match) return "";
  return `${match[1]}/content/${match[2]}-content.png`;
}

function inferPromptPath(src) {
  if (!src) return "";
  if (src.endsWith("/master-layout.png")) {
    return src.replace("/master-layout.png", "/master-layout-prompt.md");
  }
  return src.replace(/\.png$/i, "-prompt.md");
}

function inferMasterLayoutPath(src) {
  const match = String(src || "").match(/^(.*)\/visual\/pages\/(?:pilot|final)\/slide-\d+\.png$/i);
  if (!match) return "";
  return `${match[1]}/visual/layout/master-layout.png`;
}

async function assetExists(pathname) {
  try {
    const response = await fetch(`${API_ORIGIN}${pathname}`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

function renderViewerReferences(references) {
  els["image-viewer-references"].replaceChildren();
  if (!references.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "这张图没有额外引用图。";
    els["image-viewer-references"].appendChild(empty);
    return;
  }
  references.forEach((reference) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "image-viewer-reference";
    button.addEventListener("click", () => openImageViewer(reference.src, reference.title));

    const image = document.createElement("img");
    image.src = reference.src;
    image.alt = reference.title;
    image.loading = "lazy";

    const title = document.createElement("div");
    title.className = "image-viewer-reference-title";
    title.textContent = reference.title;

    const note = document.createElement("div");
    note.className = "image-viewer-reference-copy";
    note.textContent = reference.note || "引用图";

    button.append(image, title, note);
    els["image-viewer-references"].appendChild(button);
  });
}

function shortArtifactLabel(pathname) {
  const parts = String(pathname || "").split("/");
  return parts.slice(-2).join("/");
}

function renderDeliveryStep(project) {
  const card = surfaceCard();
  card.innerHTML = `<div class="section-title"><h3>交付物</h3><span>pptx/</span></div>`;
  const artifacts = document.createElement("div");
  artifacts.className = "outline-panel";
  [
    ["outline/ppt-outline.md", Boolean(project.outline)],
    ["visual/layout/master-layout.png", Boolean(project.layout?.master)],
    ["visual/pages/final/slide-01.png", project.slides.length >= pilotPageCount(project)],
    ["pptx/final-image-deck.pptx", Boolean(project.pptxUrl)],
  ].forEach(([label, ready]) => {
    const item = document.createElement("div");
    item.className = "artifact-item";
    item.textContent = `${ready ? "已生成" : "待生成"} · ${label}`;
    artifacts.appendChild(item);
  });
  card.appendChild(artifacts);
  if (project.pptxUrl) {
    const link = document.createElement("a");
    link.className = "download-link is-ready";
    link.href = project.pptxUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "打开 final-image-deck.pptx";
    card.appendChild(link);
  }
  els["step-content"].appendChild(card);
}

function renderRefineStep(project) {
  const card = surfaceCard();
  const slides = project.slides;
  if (!slides.length) {
    card.innerHTML = `
      <div class="section-title"><h3>局部微调</h3><span>image edit</span></div>
      <div class="empty-state">还没有可微调的真实页面图片。</div>
    `;
    els["step-content"].appendChild(card);
    return;
  }
  state.selectedSlideIndex = Math.min(state.selectedSlideIndex, slides.length - 1);
  card.classList.add("refine-editor-card");
  card.innerHTML = `
    <div class="section-title refine-title">
      <div><h3>页面批注</h3><p class="profile-line">在页面上圈选修改区域，并为每条标注补充修改说明。</p></div>
      <span>第 ${state.selectedSlideIndex + 1} 页 / 共 ${slides.length} 页</span>
    </div>
    <div class="refine-filmstrip" id="refine-filmstrip" aria-label="PPT 页面预览"></div>
    <div class="annotation-editor">
      <section class="annotation-main">
        <div class="annotation-toolbar" role="toolbar" aria-label="批注工具">
          ${annotationToolButton("select", "icon-pointer", "选择")}
          ${annotationToolButton("pen", "icon-pen", "画笔")}
          ${annotationToolButton("rectangle", "icon-rectangle", "矩形")}
          ${annotationToolButton("ellipse", "icon-circle", "圆形")}
          ${annotationToolButton("arrow", "icon-arrow", "箭头")}
          ${annotationToolButton("text", "icon-text", "文字")}
          <span class="toolbar-divider" aria-hidden="true"></span>
          <div class="annotation-swatches" aria-label="标注颜色">
            ${["#ef4444", "#f97316", "#2563eb"].map((color) => `<button class="annotation-swatch${color === annotationColor ? " is-active" : ""}" type="button" data-annotation-color="${color}" style="--swatch:${color}" aria-label="使用颜色 ${color}"></button>`).join("")}
          </div>
          <label class="annotation-width" title="线条粗细">
            <span>粗细</span>
            <input type="range" min="2" max="12" step="1" value="${annotationStrokeWidth}" aria-label="线条粗细" />
          </label>
          <span class="toolbar-spacer"></span>
          <button class="icon-button annotation-command" type="button" data-annotation-command="undo" title="撤销" aria-label="撤销"><svg class="icon"><use href="#icon-undo"></use></svg></button>
          <button class="icon-button annotation-command" type="button" data-annotation-command="redo" title="重做" aria-label="重做"><svg class="icon"><use href="#icon-redo"></use></svg></button>
          <button class="icon-button annotation-command" type="button" data-annotation-command="delete" title="删除选中标注" aria-label="删除选中标注"><svg class="icon"><use href="#icon-trash"></use></svg></button>
        </div>
        <div class="annotation-stage" id="annotation-stage">
          <canvas id="annotation-canvas" aria-label="PPT 页面批注画布"></canvas>
          <div class="annotation-loading" id="annotation-loading">正在加载页面...</div>
        </div>
      </section>
      <aside class="annotation-inspector">
        <div class="section-title"><h3>批注说明</h3><span id="annotation-count">0 条</span></div>
        <div class="annotation-list" id="annotation-list"></div>
        <label class="field-label" for="annotation-note">选中标注的修改要求</label>
        <textarea id="annotation-note" rows="4" placeholder="例如：把这个数字改成橙色并放大，其他内容不变。" disabled></textarea>
        <label class="field-label" for="refine-prompt">本页整体要求</label>
        <textarea id="refine-prompt" rows="4" spellcheck="false">${escapeHtml(project.lastRefine || "只修改批注区域，保持其他内容和视觉系统不变。")}</textarea>
        <button class="button button-cta full-width" id="submit-annotation-button" type="button">提交本页修改</button>
        <div class="annotation-version-note">${escapeHtml(project.versions?.at(-1) || "尚未生成微调版本")}</div>
      </aside>
    </div>
  `;
  els["step-content"].appendChild(card);

  const filmstrip = card.querySelector("#refine-filmstrip");
  slides.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `refine-thumbnail${index === state.selectedSlideIndex ? " is-active" : ""}`;
    button.setAttribute("aria-label", `编辑第 ${index + 1} 页`);
    button.innerHTML = `<img src="${escapeHtml(src)}" alt="第 ${index + 1} 页" loading="lazy" /><span>${String(index + 1).padStart(2, "0")}</span>`;
    button.addEventListener("click", () => {
      saveAnnotationDraft(project);
      state.selectedSlideIndex = index;
      persist();
      renderProjectDetail();
    });
    filmstrip.appendChild(button);
  });

  card.querySelector("#refine-prompt").addEventListener("input", (event) => {
    project.lastRefine = event.target.value;
    persist();
  });
  card.querySelector("#submit-annotation-button").addEventListener("click", (event) => runInlineAction(
    event.currentTarget,
    "正在提交批注",
    refineSlide
  ));
  requestAnimationFrame(() => initializeAnnotationEditor(project));
}

function annotationToolButton(tool, icon, label) {
  return `<button class="icon-button annotation-tool${annotationTool === tool ? " is-active" : ""}" type="button" data-annotation-tool="${tool}" title="${label}" aria-label="${label}"><svg class="icon"><use href="#${icon}"></use></svg></button>`;
}

function disposeAnnotationEditor() {
  if (!annotationCanvas) return;
  annotationCanvas.dispose();
  annotationCanvas = null;
  annotationShapeDraft = null;
  annotationHistory = [];
  annotationHistoryIndex = -1;
}

function initializeAnnotationEditor(project) {
  const stage = document.getElementById("annotation-stage");
  const canvasElement = document.getElementById("annotation-canvas");
  if (!stage || !canvasElement) return;
  if (!window.fabric) {
    stage.innerHTML = `<div class="empty-state">批注组件加载失败，请刷新页面重试。</div>`;
    return;
  }

  const width = Math.max(320, Math.min(1100, Math.floor(stage.clientWidth || 960)));
  const height = Math.round(width * 9 / 16);
  annotationCanvas = new fabric.Canvas(canvasElement, {
    width,
    height,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true,
  });
  annotationCanvas.setDimensions({ width, height });
  bindAnnotationCanvasEvents(project);
  bindAnnotationControls(project);

  const slide = project.slides[state.selectedSlideIndex];
  fabric.Image.fromURL(slide, (image) => {
    if (!annotationCanvas) return;
    image.set({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      scaleX: width / image.width,
      scaleY: height / image.height,
      selectable: false,
      evented: false,
    });
    annotationCanvas.setBackgroundImage(image, () => {
      restoreAnnotationDraft(project, width, height);
      annotationCanvas.renderAll();
      document.getElementById("annotation-loading")?.remove();
    });
  });
}

function bindAnnotationControls(project) {
  document.querySelectorAll("[data-annotation-tool]").forEach((button) => {
    button.addEventListener("click", () => setAnnotationTool(button.dataset.annotationTool));
  });
  document.querySelectorAll("[data-annotation-color]").forEach((button) => {
    button.addEventListener("click", () => {
      annotationColor = button.dataset.annotationColor;
      document.querySelectorAll("[data-annotation-color]").forEach((item) => item.classList.toggle("is-active", item === button));
      updateSelectedAnnotationStyle();
    });
  });
  document.querySelector(".annotation-width input")?.addEventListener("input", (event) => {
    annotationStrokeWidth = Number(event.target.value);
    updateSelectedAnnotationStyle();
  });
  document.querySelectorAll("[data-annotation-command]").forEach((button) => {
    button.addEventListener("click", () => runAnnotationCommand(button.dataset.annotationCommand, project));
  });
  document.getElementById("annotation-note")?.addEventListener("input", (event) => {
    const object = annotationCanvas?.getActiveObject();
    if (!object) return;
    object.note = event.target.value;
    saveAnnotationDraft(project);
    renderAnnotationList(project);
  });
  setAnnotationTool(annotationTool);
}

function bindAnnotationCanvasEvents(project) {
  annotationCanvas.on("selection:created", () => syncAnnotationSelection(project));
  annotationCanvas.on("selection:updated", () => syncAnnotationSelection(project));
  annotationCanvas.on("selection:cleared", () => syncAnnotationSelection(project));
  annotationCanvas.on("object:modified", () => commitAnnotationChange(project));
  annotationCanvas.on("path:created", ({ path }) => {
    decorateAnnotationObject(path, "画笔");
    commitAnnotationChange(project);
  });
  annotationCanvas.on("mouse:down", (event) => startAnnotationShape(event, project));
  annotationCanvas.on("mouse:move", (event) => updateAnnotationShape(event));
  annotationCanvas.on("mouse:up", () => finishAnnotationShape(project));
}

function setAnnotationTool(tool) {
  annotationTool = tool;
  if (!annotationCanvas) return;
  annotationCanvas.isDrawingMode = tool === "pen";
  annotationCanvas.selection = tool === "select";
  annotationCanvas.skipTargetFind = tool !== "select";
  annotationCanvas.defaultCursor = tool === "select" ? "default" : "crosshair";
  annotationCanvas.getObjects().forEach((object) => {
    object.selectable = tool === "select";
    object.evented = tool === "select";
  });
  if (tool === "pen") {
    annotationCanvas.freeDrawingBrush = new fabric.PencilBrush(annotationCanvas);
    annotationCanvas.freeDrawingBrush.color = annotationColor;
    annotationCanvas.freeDrawingBrush.width = annotationStrokeWidth;
  }
  document.querySelectorAll("[data-annotation-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.annotationTool === tool);
  });
  annotationCanvas.discardActiveObject();
  annotationCanvas.requestRenderAll();
}

function startAnnotationShape(event, project) {
  if (!annotationCanvas || !["rectangle", "ellipse", "arrow", "text"].includes(annotationTool)) return;
  const pointer = annotationCanvas.getPointer(event.e);
  if (annotationTool === "text") {
    const text = new fabric.IText("修改说明", {
      left: pointer.x,
      top: pointer.y,
      fill: annotationColor,
      fontSize: 22,
      fontWeight: 700,
      fontFamily: "Arial, sans-serif",
    });
    decorateAnnotationObject(text, "文字");
    annotationCanvas.add(text);
    setAnnotationTool("select");
    annotationCanvas.setActiveObject(text);
    text.enterEditing();
    commitAnnotationChange(project);
    return;
  }
  annotationShapeDraft = { start: pointer, object: createAnnotationShape(annotationTool, pointer, pointer) };
  annotationRestoring = true;
  annotationCanvas.add(annotationShapeDraft.object);
  annotationRestoring = false;
}

function updateAnnotationShape(event) {
  if (!annotationShapeDraft || !annotationCanvas) return;
  const pointer = annotationCanvas.getPointer(event.e);
  const { start, object } = annotationShapeDraft;
  if (annotationTool === "rectangle") {
    object.set({ left: Math.min(start.x, pointer.x), top: Math.min(start.y, pointer.y), width: Math.abs(pointer.x - start.x), height: Math.abs(pointer.y - start.y) });
  } else if (annotationTool === "ellipse") {
    object.set({ left: Math.min(start.x, pointer.x), top: Math.min(start.y, pointer.y), rx: Math.abs(pointer.x - start.x) / 2, ry: Math.abs(pointer.y - start.y) / 2 });
  } else if (annotationTool === "arrow") {
    annotationRestoring = true;
    annotationCanvas.remove(object);
    annotationShapeDraft.object = createAnnotationShape("arrow", start, pointer);
    annotationCanvas.add(annotationShapeDraft.object);
    annotationRestoring = false;
  }
  annotationCanvas.requestRenderAll();
}

function finishAnnotationShape(project) {
  if (!annotationShapeDraft || !annotationCanvas) return;
  const object = annotationShapeDraft.object;
  annotationShapeDraft = null;
  decorateAnnotationObject(object, annotationTypeLabel(annotationTool));
  setAnnotationTool("select");
  annotationCanvas.setActiveObject(object);
  commitAnnotationChange(project);
}

function createAnnotationShape(tool, start, end) {
  const common = {
    stroke: annotationColor,
    strokeWidth: annotationStrokeWidth,
    fill: tool === "arrow" ? "" : hexToRgba(annotationColor, 0.08),
    strokeUniform: true,
    transparentCorners: false,
    cornerColor: annotationColor,
  };
  if (tool === "ellipse") {
    return new fabric.Ellipse({ ...common, left: start.x, top: start.y, rx: 1, ry: 1 });
  }
  if (tool === "arrow") {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = 16 + annotationStrokeWidth;
    const wingA = { x: end.x - head * Math.cos(angle - Math.PI / 6), y: end.y - head * Math.sin(angle - Math.PI / 6) };
    const wingB = { x: end.x - head * Math.cos(angle + Math.PI / 6), y: end.y - head * Math.sin(angle + Math.PI / 6) };
    return new fabric.Path(`M ${start.x} ${start.y} L ${end.x} ${end.y} M ${wingA.x} ${wingA.y} L ${end.x} ${end.y} L ${wingB.x} ${wingB.y}`, { ...common, fill: "", selectable: false });
  }
  return new fabric.Rect({ ...common, left: start.x, top: start.y, width: 1, height: 1 });
}

function decorateAnnotationObject(object, type) {
  object.annotationId = object.annotationId || `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  object.annotationType = type;
  object.note = object.note || "";
  object.set({
    selectable: annotationTool === "select",
    evented: annotationTool === "select",
    cornerColor: annotationColor,
    transparentCorners: false,
  });
}

function annotationTypeLabel(tool) {
  return { rectangle: "矩形", ellipse: "圆形", arrow: "箭头", pen: "画笔", text: "文字" }[tool] || "标注";
}

function hexToRgba(hex, alpha) {
  const value = String(hex).replace("#", "");
  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function updateSelectedAnnotationStyle() {
  const object = annotationCanvas?.getActiveObject();
  if (!object) return;
  if (object.type === "i-text" || object.type === "text") {
    object.set({ fill: annotationColor });
  } else {
    object.set({ stroke: annotationColor, strokeWidth: annotationStrokeWidth });
    if (object.type !== "path" || object.annotationType !== "箭头") object.set({ fill: hexToRgba(annotationColor, 0.08) });
  }
  object.set({ cornerColor: annotationColor });
  annotationCanvas.requestRenderAll();
  commitAnnotationChange(activeProject());
}

function syncAnnotationSelection(project) {
  const object = annotationCanvas?.getActiveObject();
  const note = document.getElementById("annotation-note");
  if (note) {
    note.disabled = !object;
    note.value = object?.note || "";
    note.placeholder = object ? "说明这个标注区域要如何修改" : "先在页面上选择或绘制一个标注";
  }
  renderAnnotationList(project);
}

function renderAnnotationList(project) {
  const list = document.getElementById("annotation-list");
  const count = document.getElementById("annotation-count");
  if (!list || !annotationCanvas) return;
  const objects = annotationCanvas.getObjects();
  count.textContent = `${objects.length} 条`;
  list.replaceChildren();
  if (!objects.length) {
    const empty = document.createElement("div");
    empty.className = "annotation-list-empty";
    empty.textContent = "用画笔或图形圈出需要修改的位置";
    list.appendChild(empty);
    return;
  }
  objects.forEach((object, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `annotation-list-item${annotationCanvas.getActiveObject() === object ? " is-active" : ""}`;
    button.innerHTML = `<span>${index + 1}</span><div><strong>${escapeHtml(object.annotationType || "标注")}</strong><small>${escapeHtml(object.note || "待填写修改说明")}</small></div>`;
    button.addEventListener("click", () => {
      setAnnotationTool("select");
      annotationCanvas.setActiveObject(object);
      annotationCanvas.requestRenderAll();
      syncAnnotationSelection(project);
    });
    list.appendChild(button);
  });
}

function annotationObjectsJson() {
  if (!annotationCanvas) return [];
  return annotationCanvas.getObjects().map((object) => object.toObject(["annotationId", "annotationType", "note"]));
}

function saveAnnotationDraft(project) {
  if (!annotationCanvas) return;
  project.refineAnnotations = project.refineAnnotations || {};
  project.refineAnnotations[String(state.selectedSlideIndex)] = {
    slide: project.slides[state.selectedSlideIndex],
    canvasWidth: annotationCanvas.getWidth(),
    canvasHeight: annotationCanvas.getHeight(),
    objects: annotationObjectsJson(),
    updatedAt: new Date().toISOString(),
  };
  persist();
}

function restoreAnnotationDraft(project, width, height) {
  const draft = project.refineAnnotations?.[String(state.selectedSlideIndex)];
  const objects = Array.isArray(draft?.objects) ? structuredClone(draft.objects) : [];
  if (draft?.canvasWidth && draft?.canvasHeight) {
    const scaleX = width / draft.canvasWidth;
    const scaleY = height / draft.canvasHeight;
    objects.forEach((object) => {
      object.left = Number(object.left || 0) * scaleX;
      object.top = Number(object.top || 0) * scaleY;
      object.scaleX = Number(object.scaleX || 1) * scaleX;
      object.scaleY = Number(object.scaleY || 1) * scaleY;
    });
  }
  restoreAnnotationObjects(objects, () => {
    annotationHistory = [JSON.stringify(annotationObjectsJson())];
    annotationHistoryIndex = 0;
    renderAnnotationList(project);
  });
}

function restoreAnnotationObjects(objects, onComplete) {
  if (!annotationCanvas) return;
  annotationRestoring = true;
  annotationCanvas.discardActiveObject();
  annotationCanvas.getObjects().slice().forEach((object) => annotationCanvas.remove(object));
  fabric.util.enlivenObjects(objects || [], (enlivened) => {
    enlivened.forEach((object) => {
      decorateAnnotationObject(object, object.annotationType || "标注");
      annotationCanvas.add(object);
    });
    annotationRestoring = false;
    annotationCanvas.requestRenderAll();
    onComplete?.();
  });
}

function commitAnnotationChange(project) {
  if (!annotationCanvas || annotationRestoring) return;
  const snapshot = JSON.stringify(annotationObjectsJson());
  if (annotationHistory[annotationHistoryIndex] !== snapshot) {
    annotationHistory = annotationHistory.slice(0, annotationHistoryIndex + 1);
    annotationHistory.push(snapshot);
    annotationHistoryIndex = annotationHistory.length - 1;
  }
  saveAnnotationDraft(project);
  syncAnnotationSelection(project);
}

function runAnnotationCommand(command, project) {
  if (!annotationCanvas) return;
  if (command === "undo" && annotationHistoryIndex > 0) {
    annotationHistoryIndex -= 1;
    restoreAnnotationObjects(JSON.parse(annotationHistory[annotationHistoryIndex]), () => {
      saveAnnotationDraft(project);
      renderAnnotationList(project);
    });
    return;
  }
  if (command === "redo" && annotationHistoryIndex < annotationHistory.length - 1) {
    annotationHistoryIndex += 1;
    restoreAnnotationObjects(JSON.parse(annotationHistory[annotationHistoryIndex]), () => {
      saveAnnotationDraft(project);
      renderAnnotationList(project);
    });
    return;
  }
  if (command === "delete") {
    const active = annotationCanvas.getActiveObjects();
    active.forEach((object) => annotationCanvas.remove(object));
    annotationCanvas.discardActiveObject();
    commitAnnotationChange(project);
  }
}

function surfaceCard() {
  const card = document.createElement("section");
  card.className = "surface-card";
  return card;
}

function renderInlineFiles(container, project) {
  const allFiles = [
    ...project.files.map((name) => `资料 · ${name}`),
    ...project.references.map((name) => `参考 · ${name}`),
  ];
  container.replaceChildren();
  if (!allFiles.length) {
    container.textContent = "暂无文件";
    return;
  }
  allFiles.forEach((name) => {
    const item = document.createElement("div");
    item.textContent = name;
    container.appendChild(item);
  });
}

function renderPrimaryAction(project) {
  const action = getPrimaryAction(project);
  els["primary-action-button"].querySelector("span").textContent = action.label;
  els["action-note"].textContent = action.note;
}

function getPrimaryAction(project) {
  if (!project.outline) {
    return {
      label: "生成大纲",
      note: "根据材料生成封面、逐页计划和项目画像。",
      run: analyzeMaterial,
    };
  }
  if (!isVisualConfirmed(project)) {
    if (!project.selectedStyleId) {
      return {
        label: "生成视觉预览",
        note: "生成并检索视觉候选，选择后再确认视觉。",
        run: generatePreview,
      };
    }
    return {
      label: "确认视觉",
      note: `确认使用「${selectedStyle(project)?.name || "当前视觉"}」，然后进入页面生成。`,
      run: confirmStyle,
    };
  }
  if (project.compositionMode === "full-page" && !project.layout?.master) {
    return {
      label: "生成母版",
      note: "默认使用白底橙红平安系金融保险PPT，先打磨版式母图。",
      run: () => generateMasterLayout({ force: false }),
    };
  }
  if (project.slides.length < pilotPageCount(project)) {
    const count = pilotPageCount(project);
    return {
      label: `生成首批${count}页`,
      note: project.compositionMode === "full-page"
        ? `基于版式母图生成首批${count}页，用于验证一致性。`
        : `生成主体内容图并由代码组装首批${count}页。`,
      run: () => generatePilotSlides({ force: false }),
    };
  }
  if (state.activeStepId === "refine") {
    return {
      label: "提交本页修改",
      note: "将原图、视觉批注和逐条说明提交到图片编辑接口。",
      run: refineSlide,
    };
  }
  if (!project.pptxUrl) {
    return {
      label: "生成完整 PPTX",
      note: "补齐剩余页面图片，并组装为 16:9 图片版 PPT。",
      run: assemblePptx,
    };
  }
  return {
    label: "进入局部微调",
    note: "逐页预览并用画笔、图形和文字标出需要修改的位置。",
    run: () => {
      state.activeStepId = "refine";
      persist();
      renderProjectDetail();
    },
  };
}

function renderJobs(project) {
  const pilotCount = pilotPageCount(project);
  const hybridMode = project.compositionMode !== "full-page";
  const jobs = [
    ["材料理解", project.outline ? "done" : "active"],
    ["视觉确认", isVisualConfirmed(project) ? "done" : project.outline ? "active" : "waiting"],
    [hybridMode ? "代码框架" : "版式母图", hybridMode || project.layout?.master ? "done" : isVisualConfirmed(project) ? "active" : "waiting"],
    [`首批${pilotCount}页`, project.slides.length >= pilotCount ? "done" : hybridMode || project.layout?.master ? "active" : "waiting"],
    ["PPTX 交付", project.pptxUrl ? "done" : project.slides.length >= pilotCount ? "active" : "waiting"],
  ];

  els["job-stack"].replaceChildren();
  jobs.forEach(([title, status]) => {
    const item = document.createElement("div");
    item.className = `job-item ${status === "done" ? "is-done" : ""} ${status === "active" ? "is-active" : ""}`;
    const dot = document.createElement("span");
    dot.className = "job-dot";
    const label = document.createElement("span");
    label.className = "job-title";
    label.textContent = title;
    const stateLabel = document.createElement("span");
    stateLabel.className = "job-state";
    stateLabel.textContent = statusText(status);
    item.append(dot, label, stateLabel);
    els["job-stack"].appendChild(item);
  });

  const logs = project.api?.logs || [];
  if (logs.length) {
    const divider = document.createElement("div");
    divider.className = "job-log-title";
    divider.textContent = "运行日志";
    els["job-stack"].appendChild(divider);
    logs.slice(0, 4).forEach((log) => {
      const item = document.createElement("div");
      item.className = "job-log-item";
      item.textContent = `${formatLogTime(log.at)} · ${log.message}`;
      els["job-stack"].appendChild(item);
    });
  }
}

function statusText(status) {
  if (status === "done") return "完成";
  if (status === "active") return "处理中";
  return "等待";
}

function renderStyleLibrary() {
  const query = state.styleSearch.trim().toLowerCase();
  els["style-search"].value = state.styleSearch;
  els["style-grid"].replaceChildren();

  const styles = state.styles.filter((style) => {
    if (!query) return true;
    return [style.name, style.description, ...(style.tags || [])].join(" ").toLowerCase().includes(query);
  });

  if (!styles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的视觉风格";
    els["style-grid"].appendChild(empty);
  } else {
    styles.forEach((style) => {
      const card = createStyleCard(style, {
        selected: inspectedStyle()?.id === style.id,
        onSelect: () => {
          state.inspectedStyleId = style.id;
          persist();
          renderStyleLibrary();
        },
      });
      els["style-grid"].appendChild(card);
    });
  }

  renderStyleDetail();
}

function renderStyleDetail() {
  const style = inspectedStyle();
  els["style-detail"].replaceChildren();
  if (!style) return;

  const image = document.createElement("img");
  image.src = style.image;
  image.alt = style.name;
  const title = document.createElement("h3");
  title.textContent = style.name;
  const desc = document.createElement("p");
  desc.className = "profile-line";
  desc.textContent = style.description;
  const tags = document.createElement("div");
  tags.className = "tag-row";
  style.tags.forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = tag;
    tags.appendChild(item);
  });
  els["style-detail"].append(image, title, desc, tags);

  const masters = normalizeMasters(style.masters);
  const masterSection = document.createElement("section");
  masterSection.className = "style-master-section";
  masterSection.innerHTML = `
    <div class="section-title"><h3>关联母版</h3><span>${masters.length} 个</span></div>
  `;
  if (!masters.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "该风格还没有关联母版。在项目中生成母版后会自动沉淀到这里。";
    masterSection.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "style-master-grid";
    masters.forEach((master) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "style-master-item";
      button.innerHTML = `
        <img src="${escapeHtml(master.image)}" alt="${escapeHtml(master.name || "关联母版")}" loading="lazy" />
        <span><strong>${escapeHtml(master.name || "未命名母版")}</strong><small>${escapeHtml(master.font || "默认字体")}</small></span>
      `;
      button.addEventListener("click", () => openImageViewer(master.image, master.name || "关联母版"));
      grid.appendChild(button);
    });
    masterSection.appendChild(grid);
  }
  els["style-detail"].appendChild(masterSection);
}

function createStyleCard(style, options = {}) {
  const template = document.getElementById("style-card-template");
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.toggle("is-selected", Boolean(options.selected));
  node.querySelector(".style-image").src = style.image;
  node.querySelector(".style-image").alt = style.name;
  node.querySelector(".style-body h3").textContent = style.name;
  node.querySelector(".style-body p").textContent = style.description;
  const tagRow = node.querySelector(".tag-row");
  (style.tags || []).slice(0, 4).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = tag;
    tagRow.appendChild(item);
  });
  node.querySelector(".style-preview-button").addEventListener("click", options.onSelect || (() => {}));
  return node;
}

async function runPrimaryAction() {
  const action = getPrimaryAction(activeProject());
  const button = els["primary-action-button"];
  button.disabled = true;
  button.classList.add("is-loading");
  button.querySelector("span").textContent = "处理中";
  try {
    await action.run();
    showToast(action.label);
  } catch (error) {
    recordProjectError(error);
    showToast(error.message || "操作失败");
    renderProjectDetail();
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
    renderPrimaryAction(activeProject());
  }
}

async function runInlineAction(button, busyLabel, task) {
  if (button.disabled) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.classList.add("is-loading");
  button.textContent = busyLabel;
  showToast(`${busyLabel}，可能需要几分钟`);
  try {
    await task();
    showToast("生成完成");
  } catch (error) {
    recordProjectError(error);
    showToast(error.message || "操作失败");
    renderProjectDetail();
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.textContent = originalLabel;
    }
  }
}

async function createProject() {
  const id = `project-${Date.now()}`;
  const project = {
    id,
    title: "未命名 PPT 项目",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: "刚刚",
    status: "上传材料",
    stage: 0,
    pageCount: 10,
    sourceText: "",
    files: [],
    references: [],
    outline: null,
    selectedStyleId: null,
    visualConfirmed: false,
    layoutFont: "黑体",
    compositionMode: "hybrid",
    slides: [],
    pptxUrl: "",
    versions: [],
    lastRefine: "",
    refineAnnotations: {},
    api: {
      projectDir: "",
      logs: [],
    },
  };
  try {
    const result = await apiRequest("/api/projects", {
      method: "POST",
      body: project,
    });
    state.projects.unshift(result.project || project);
  } catch (error) {
    project.api.logs.unshift({ at: new Date().toISOString(), message: `本地 API 未连接：${error.message}` });
    state.projects.unshift(project);
    showToast("已创建本地项目，请启动 Node 服务后运行真流程");
  }
  openProject(id);
}

function resetDemo() {
  Object.assign(state, freshState());
  persist();
  render();
  showToast("样例已重置");
}

function updateProjectTitle(event) {
  const project = activeProject();
  project.title = event.target.value || "未命名 PPT 项目";
  project.updatedAt = "刚刚";
  persist();
}

async function updateFiles(event, key) {
  const project = activeProject();
  const files = [...event.target.files];
  project[key] = files.map((file) => file.name);
  project.updatedAt = "刚刚";
  persist();
  renderProjectDetail();
  try {
    await syncProjectToApi(project);
    for (const file of files) {
      await uploadFileToApi(project.id, file, key);
    }
    addProjectLog(project, `${key === "references" ? "视觉参考" : "资料"}已上传到 source/`);
    persist();
    renderProjectDetail();
  } catch (error) {
    recordProjectError(error, project);
    renderProjectDetail();
  }
}

async function analyzeMaterial() {
  const project = activeProject();
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/analyze`, {
    method: "POST",
    body: project,
  });
  applyProjectUpdate(result.project);
  applyDefaultTestStyle(activeProject());
  state.activeStepId = "visual";
  persist();
  renderProjectDetail();
}

async function generateMasterLayout(options = {}) {
  const project = applyDefaultTestStyle(activeProject());
  project.selectedStyle = selectedStyle(project);
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/layout/master`, {
    method: "POST",
    body: {
      project,
      force: Boolean(options.force),
    },
  });
  applyProjectUpdate(result.project);
  if (result.project?.selectedStyle) mergeStyles([result.project.selectedStyle]);
  state.activeStepId = "layout";
  persist();
  renderProjectDetail();
}

async function uploadMasterLayout(file) {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    throw new Error("母版仅支持 PNG、JPG 或 WebP 图片");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("母版图片不能超过 20MB");
  }
  const dimensions = await imageDimensions(file);
  const ratio = dimensions.width / dimensions.height;
  if (Math.abs(ratio - (16 / 9)) / (16 / 9) > 0.01) {
    throw new Error(`母版必须为16:9，当前图片为 ${dimensions.width}×${dimensions.height}`);
  }

  const project = activeProject();
  project.selectedStyle = selectedStyle(project);
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/layout/upload`, {
    method: "POST",
    body: {
      project,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        dataBase64: await fileToBase64(file),
      },
    },
  });
  applyProjectUpdate(result.project);
  if (result.project?.selectedStyle) mergeStyles([result.project.selectedStyle]);
  state.activeStepId = "layout";
  persist();
  renderProjectDetail();
  showToast(`已采用本地母版：${file.name}`);
}

async function imageDimensions(file) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取母版图片尺寸"));
    };
    image.src = url;
  });
}

async function selectExistingMaster(master) {
  const project = activeProject();
  project.layout = {
    master: master.image,
    prompt: master.prompt || "",
    fingerprint: master.fingerprint || master.id,
    sourceMasterId: master.id,
    sourceProjectId: master.sourceProjectId || "",
    name: master.name || "关联母版",
    createdAt: master.createdAt || "",
  };
  project.layoutFont = master.font || project.layoutFont || "黑体";
  project.stage = Math.max(project.stage || 0, 4);
  project.status = "版式母图";
  project.updatedAt = "刚刚";
  addProjectLog(project, `已采用风格关联母版：${master.name || master.id}`);
  const result = await syncProjectToApi(project);
  applyProjectUpdate(result.project);
  persist();
  renderProjectDetail();
  showToast(`已采用：${master.name || "关联母版"}`);
}

async function generatePreview() {
  const project = activeProject();
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/visual-previews`, {
    method: "POST",
    body: { project },
  });
  mergeStyles(result.candidates || []);
  applyProjectUpdate(result.project);
  const updated = activeProject();
  updated.selectedStyleId = updated.selectedStyleId || result.candidates?.[0]?.id || state.styles[0].id;
  state.inspectedStyleId = updated.selectedStyleId;
  state.activeStepId = "visual";
  persist();
  renderProjectDetail();
}

async function confirmStyle() {
  const project = activeProject();
  if (!project.selectedStyleId) project.selectedStyleId = state.styles[0].id;
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/confirm-style`, {
    method: "POST",
    body: {
      project,
      style: selectedStyle(project),
    },
  });
  applyProjectUpdate(result.project);
  state.activeStepId = activeProject().compositionMode === "full-page" ? "layout" : "slides";

  const style = selectedStyle(project);
  const capturedId = `${style.id}-accepted-${project.id}`;
  if (style && !state.styles.some((item) => item.id === capturedId)) {
    state.styles.unshift({
      ...style,
      id: capturedId,
      name: `${style.name} · ${project.title}`,
      description: `由项目「${project.title}」确认沉淀，保留原视觉系统与项目画像。`,
      source: "captured",
    });
  }

  persist();
  renderProjectDetail();
}

async function generatePilotSlides(options = {}) {
  const project = applyDefaultTestStyle(activeProject());
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/slides/pilot`, {
    method: "POST",
    body: {
      project: activeProject(),
      style: selectedStyle(activeProject()),
      force: Boolean(options.force),
    },
  });
  applyProjectUpdate(result.project);
  state.activeStepId = "slides";
  persist();
  renderProjectDetail();
}

async function assemblePptx() {
  const project = activeProject();
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/pptx`, {
    method: "POST",
    body: {
      project,
      style: selectedStyle(project),
    },
  });
  applyProjectUpdate(result.project);
  state.activeStepId = "delivery";
  persist();
  renderProjectDetail();
}

async function refineSlide() {
  const project = activeProject();
  const slideNumber = String(state.selectedSlideIndex + 1).padStart(2, "0");
  if (!annotationCanvas) throw new Error("批注画布尚未加载完成");
  saveAnnotationDraft(project);
  const annotations = project.refineAnnotations?.[String(state.selectedSlideIndex)];
  const objects = annotations?.objects || [];
  if (!objects.length) throw new Error("请先用画笔或图形标出需要修改的位置");
  const annotationNotes = objects.map((object, index) => {
    const inlineText = object.type === "i-text" || object.type === "text" ? object.text : "";
    return `${index + 1}. ${object.annotationType || "标注"}：${object.note || inlineText || "修改该标注区域，其他区域不变"}`;
  }).join("\n");
  const sourceWidth = Number(annotationCanvas.backgroundImage?.width || annotationCanvas.getWidth());
  const exportMultiplier = Math.max(1, Math.min(3, sourceWidth / annotationCanvas.getWidth()));
  const annotationImageBase64 = annotationCanvas
    .toDataURL({ format: "png", multiplier: exportMultiplier })
    .replace(/^data:image\/png;base64,/, "");
  const result = await apiRequest(`/api/projects/${encodeURIComponent(project.id)}/slides/${Number(slideNumber)}/refine`, {
    method: "POST",
    body: {
      project,
      prompt: project.lastRefine,
      style: selectedStyle(project),
      annotations,
      annotationNotes,
      annotationImageBase64,
    },
  });
  applyProjectUpdate(result.project);
  state.activeStepId = "refine";
  persist();
  renderProjectDetail();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: humanizeNonJsonApiError(text, response.status) };
  }
  if (data.error || data.ok === false) {
    throw new Error(data.error || "API 返回失败");
  }
  if (!response.ok) {
    throw new Error(data.error || `API ${response.status}`);
  }
  return data;
}

function humanizeNonJsonApiError(text, status) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (compact.includes("Unsupported method") || compact.includes("Error code: 501") || compact.startsWith("<!DOCTYPE")) {
    return `API 服务没有接上：当前页面可能打开在静态服务端口。请使用 http://localhost:5174/product-app/，或先运行 npm run dev。${status ? ` HTTP ${status}` : ""}`;
  }
  return compact || `API 返回了非 JSON 响应${status ? `（HTTP ${status}）` : ""}`;
}

async function syncProjectToApi(project) {
  return apiRequest(`/api/projects/${encodeURIComponent(project.id)}/sync`, {
    method: "POST",
    body: project,
  });
}

async function uploadFileToApi(projectId, file, kind) {
  const dataBase64 = await fileToBase64(file);
  return apiRequest(`/api/projects/${encodeURIComponent(projectId)}/uploads`, {
    method: "POST",
    body: {
      kind,
      name: file.name,
      type: file.type,
      size: file.size,
      dataBase64,
    },
  });
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function applyProjectUpdate(project) {
  if (!project?.id) return;
  project = normalizeProjectStyle(project);
  const index = state.projects.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    state.projects[index] = {
      ...state.projects[index],
      ...project,
    };
  } else {
    state.projects.unshift(project);
  }
  if (project.selectedStyle) mergeStyles([project.selectedStyle]);
}

function mergeStyles(styles) {
  if (!Array.isArray(styles) || !styles.length) return;
  const existing = new Map(state.styles.map((style) => [style.id, style]));
  styles.map(normalizeStyleRecord).forEach((style) => {
    if (!style?.id) return;
    existing.set(style.id, {
      ...existing.get(style.id),
      ...style,
      tags: style.tags || existing.get(style.id)?.tags || ["generated"],
      masters: normalizeMasters([
        ...(existing.get(style.id)?.masters || []),
        ...(style.masters || []),
      ]),
    });
  });
  state.styles = [...existing.values()];
}

function addProjectLog(project, message) {
  project.api = project.api || { logs: [] };
  project.api.logs = [
    { at: new Date().toISOString(), message },
    ...(project.api.logs || []),
  ].slice(0, 20);
}

function recordProjectError(error, project = activeProject()) {
  addProjectLog(project, `失败：${error.message || error}`);
  project.status = "需要处理错误";
  project.updatedAt = "刚刚";
  persist();
}

function formatLogTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function saveCapturedStyle() {
  const name = els["style-name-input"].value.trim();
  const description = els["style-desc-input"].value.trim();
  const tags = els["style-tags-input"].value.split(",").map((tag) => tag.trim()).filter(Boolean);
  const style = inspectedStyle() || state.styles[0];

  if (!name || !description) {
    els["capture-note"].textContent = "请补齐风格名称和适用场景。";
    return;
  }

  const captured = {
    ...style,
    id: `captured-${Date.now()}`,
    name,
    description,
    tags: tags.length ? tags : ["captured", "custom"],
    source: "captured",
  };

  state.styles.unshift(captured);
  state.inspectedStyleId = captured.id;
  els["style-name-input"].value = "";
  els["style-desc-input"].value = "";
  els["style-tags-input"].value = "";
  els["capture-note"].textContent = `已保存：${captured.name}`;
  persist();
  renderStyleLibrary();
}

function mergeVersions(existing, additions) {
  const seen = new Set(existing);
  additions.forEach((item) => seen.add(item));
  return [...seen];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els["toast"].textContent = message;
  els["toast"].classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    els["toast"].classList.remove("is-visible");
  }, 2600);
}

window.addEventListener("DOMContentLoaded", init);
