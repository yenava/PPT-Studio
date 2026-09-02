const STAGE_LABELS = ["资料理解", "视觉预览", "视觉确认", "图片生成", "PPTX 交付", "局部微调"];
const STORAGE_KEY = "ppt-studio-state-v1";

const defaultStyles = [
  {
    id: "20260628-ping-an-inspired-gray-orange-methodology-p-c0b261",
    name: "灰橙方法论九宫格",
    description: "灰蓝为底，橙色做高亮，适合流程模型、矩阵、旅程图、路线图和咨询方法论汇报。",
    pageCount: 9,
    tags: ["financial-insurance", "gray-orange", "methodology", "matrix"],
    image: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-gray-orange-methodology-p-c0b261/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-gray-orange-methodology-p-c0b261/prompt.md",
    source: "library",
  },
  {
    id: "20260628-ping-an-inspired-white-3x3-financial-ppt-p-b32734",
    name: "白底橙红金融咨询",
    description: "白底、橙红强调、高密度咨询报告页，适合业务复盘、经营分析和金融保险增长方案。",
    pageCount: 9,
    tags: ["financial-insurance", "white-background", "consulting-style"],
    image: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-white-3x3-financial-ppt-p-b32734/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-white-3x3-financial-ppt-p-b32734/prompt.md",
    source: "library",
  },
  {
    id: "20260628-ping-an-inspired-3x3-orange-financial-serv-32dbf0",
    name: "橙红金融服务增长",
    description: "橙红主色结合金融服务场景，含封面、路径页、图表页和策略页。",
    pageCount: 9,
    tags: ["orange-red", "guofeng-cover", "chart-heavy"],
    image: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-3x3-orange-financial-serv-32dbf0/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-ping-an-inspired-3x3-orange-financial-serv-32dbf0/prompt.md",
    source: "library",
  },
  {
    id: "20260628-deidentified-ping-an-style-corporate-insur-3be19e",
    name: "企业保险内部汇报",
    description: "脱敏金融保险内部汇报风格，强调流程箭头、阶段条、右侧结论栏和图表占位系统。",
    pageCount: 6,
    tags: ["dense-report", "process-arrow", "anonymized"],
    image: "/ppt-design/assets/style-templates/20260628-deidentified-ping-an-style-corporate-insur-3be19e/collage.png",
    prompt: "/ppt-design/assets/style-templates/20260628-deidentified-ping-an-style-corporate-insur-3be19e/prompt.md",
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
    selectedStyleId: "20260628-ping-an-inspired-gray-orange-methodology-p-c0b261",
    slides: sampleSlides,
    pptxUrl: "/outputs/hr-talent-performance-gray-orange-v2.pptx",
    versions: ["v1 首批四页确认", "v2 全量页面生成", "v3 页 03 局部强调图表"],
    lastRefine: "把右侧结论栏调成更强的橙色强调，保留灰蓝底色。",
  },
  {
    id: "project-auto-channel",
    title: "新能源渠道季度复盘",
    createdAt: "2026-07-01",
    updatedAt: "12 分钟前",
    status: "视觉预览",
    stage: 1,
    pageCount: 12,
    sourceText: "目标：生成一套新能源渠道季度复盘 PPT，包含区域销量、转化漏斗、门店画像和下季度动作。",
    files: ["渠道销售数据.csv"],
    references: [],
    outline: null,
    selectedStyleId: null,
    slides: [],
    pptxUrl: "",
    versions: [],
    lastRefine: "",
  },
];

const state = loadState();
const els = {};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      activeView: "workspace",
      activeProjectId: defaultProjects[0].id,
      projects: structuredClone(defaultProjects),
      styles: structuredClone(defaultStyles),
      selectedSlideIndex: 0,
      styleSearch: "",
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      activeView: parsed.activeView || "workspace",
      activeProjectId: parsed.activeProjectId || defaultProjects[0].id,
      projects: parsed.projects?.length ? parsed.projects : structuredClone(defaultProjects),
      styles: mergeDefaultStyles(parsed.styles || []),
      selectedSlideIndex: parsed.selectedSlideIndex || 0,
      styleSearch: parsed.styleSearch || "",
    };
  } catch {
    return {
      activeView: "workspace",
      activeProjectId: defaultProjects[0].id,
      projects: structuredClone(defaultProjects),
      styles: structuredClone(defaultStyles),
      selectedSlideIndex: 0,
      styleSearch: "",
    };
  }
}

function mergeDefaultStyles(savedStyles) {
  const byId = new Map(defaultStyles.map((style) => [style.id, style]));
  savedStyles.forEach((style) => byId.set(style.id, style));
  return [...byId.values()];
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
}

function selectedStyle(project = activeProject()) {
  return state.styles.find((style) => style.id === project.selectedStyleId) || null;
}

function init() {
  cacheElements();
  bindEvents();
  render();
}

function cacheElements() {
  [
    "project-list",
    "project-count",
    "project-title-input",
    "project-meta",
    "project-status",
    "pipeline",
    "source-text",
    "file-input",
    "reference-input",
    "file-list",
    "analyze-button",
    "outline-box",
    "generate-preview-button",
    "confirm-style-button",
    "candidate-grid",
    "job-stack",
    "pilot-button",
    "assemble-button",
    "slide-strip",
    "download-link",
    "slide-stage",
    "slide-select",
    "refine-prompt",
    "refine-button",
    "version-list",
    "style-grid",
    "style-search",
    "style-name-input",
    "style-desc-input",
    "style-tags-input",
    "save-style-button",
    "capture-note",
    "new-project-button",
    "seed-demo-button",
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
  els["project-title-input"].addEventListener("input", updateProjectTitle);
  els["source-text"].addEventListener("input", updateSourceText);
  els["file-input"].addEventListener("change", (event) => updateFiles(event, "files"));
  els["reference-input"].addEventListener("change", (event) => updateFiles(event, "references"));
  els["analyze-button"].addEventListener("click", analyzeMaterial);
  els["generate-preview-button"].addEventListener("click", generatePreview);
  els["confirm-style-button"].addEventListener("click", confirmStyle);
  els["pilot-button"].addEventListener("click", generatePilotSlides);
  els["assemble-button"].addEventListener("click", assemblePptx);
  els["slide-select"].addEventListener("change", (event) => {
    state.selectedSlideIndex = Number(event.target.value);
    persist();
    renderRefineConsole();
  });
  els["refine-prompt"].addEventListener("input", updateRefinePrompt);
  els["refine-button"].addEventListener("click", refineSlide);
  els["style-search"].addEventListener("input", (event) => {
    state.styleSearch = event.target.value;
    persist();
    renderStyleLibrary();
  });
  els["save-style-button"].addEventListener("click", saveCapturedStyle);
}

function render() {
  renderViews();
  renderProjectList();
  renderProjectBoard();
  renderStyleLibrary();
}

function renderViews() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${state.activeView}-view`);
  });
}

function renderProjectList() {
  els["project-count"].textContent = String(state.projects.length);
  els["project-list"].replaceChildren();

  state.projects.forEach((project) => {
    const template = document.getElementById("project-card-template");
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-active", project.id === state.activeProjectId);
    node.querySelector(".project-card-title").textContent = project.title;
    node.querySelector(".project-card-meta").textContent = `${project.status} · ${project.pageCount} 页 · ${project.updatedAt}`;
    node.addEventListener("click", () => {
      state.activeProjectId = project.id;
      state.selectedSlideIndex = 0;
      persist();
      render();
    });
    els["project-list"].appendChild(node);
  });
}

function renderProjectBoard() {
  const project = activeProject();
  if (!project) return;

  els["project-title-input"].value = project.title;
  els["project-meta"].textContent = `${project.createdAt} 创建 · ${project.pageCount} 页 · ${project.files.length} 份材料 · ${project.references.length} 张参考`;
  els["project-status"].textContent = project.status;
  els["source-text"].value = project.sourceText || "";

  renderPipeline(project);
  renderFiles(project);
  renderOutline(project);
  renderCandidates(project);
  renderJobs(project);
  renderSlides(project);
  renderRefineConsole();
}

function renderPipeline(project) {
  els["pipeline"].replaceChildren();
  STAGE_LABELS.forEach((label, index) => {
    const item = document.createElement("div");
    item.className = "stage-pill";
    item.textContent = label;
    item.classList.toggle("is-done", index < project.stage);
    item.classList.toggle("is-active", index === project.stage);
    els["pipeline"].appendChild(item);
  });
}

function renderFiles(project) {
  const allFiles = [...project.files.map((name) => `材料 · ${name}`), ...project.references.map((name) => `参考 · ${name}`)];
  els["file-list"].replaceChildren();

  if (!allFiles.length) {
    const empty = document.createElement("div");
    empty.textContent = "尚未选择文件";
    els["file-list"].appendChild(empty);
    return;
  }

  allFiles.forEach((name) => {
    const item = document.createElement("div");
    item.textContent = name;
    els["file-list"].appendChild(item);
  });
}

function renderOutline(project) {
  els["outline-box"].replaceChildren();

  if (!project.outline) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "等待生成 outline/ppt-outline.md 与 outline/project-profile.json";
    els["outline-box"].appendChild(empty);
    return;
  }

  const title = document.createElement("h4");
  title.textContent = project.outline.title;
  const list = document.createElement("ul");
  project.outline.bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    list.appendChild(item);
  });
  const profile = document.createElement("p");
  profile.className = "muted-line";
  profile.textContent = project.outline.profile;
  els["outline-box"].append(title, list, profile);
}

function renderCandidates(project) {
  els["candidate-grid"].replaceChildren();

  const candidates = state.styles.slice(0, 4);
  candidates.forEach((style) => {
    const card = createStyleCard(style, {
      selected: project.selectedStyleId === style.id,
      onSelect: () => {
        project.selectedStyleId = style.id;
        project.updatedAt = "刚刚";
        persist();
        renderProjectBoard();
      },
    });
    els["candidate-grid"].appendChild(card);
  });
}

function renderJobs(project) {
  const jobs = [
    ["材料理解", project.outline ? "done" : "active"],
    ["风格库检索", project.stage >= 1 ? "done" : "waiting"],
    ["Image2 预览图", project.stage >= 2 ? "done" : project.stage === 1 ? "active" : "waiting"],
    ["首批四页", project.slides.length >= 4 ? "done" : project.stage >= 3 ? "active" : "waiting"],
    ["全量图片", project.slides.length >= project.pageCount ? "done" : project.stage >= 4 ? "active" : "waiting"],
    ["图片版 PPTX", project.pptxUrl ? "done" : "waiting"],
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
}

function statusText(status) {
  if (status === "done") return "完成";
  if (status === "active") return "处理中";
  return "等待";
}

function renderSlides(project) {
  els["slide-strip"].replaceChildren();
  const slides = project.slides.length ? project.slides.slice(0, 4) : sampleSlides.slice(0, 4);
  slides.forEach((src, index) => {
    const img = document.createElement("img");
    img.className = "slide-thumb";
    img.src = src;
    img.alt = `slide ${String(index + 1).padStart(2, "0")}`;
    els["slide-strip"].appendChild(img);
  });

  if (project.pptxUrl) {
    els["download-link"].href = project.pptxUrl;
    els["download-link"].textContent = "打开 final-image-deck.pptx";
    els["download-link"].classList.add("is-ready");
  } else {
    els["download-link"].removeAttribute("href");
    els["download-link"].textContent = "交付结果未生成";
    els["download-link"].classList.remove("is-ready");
  }
}

function renderRefineConsole() {
  const project = activeProject();
  const slides = project.slides.length ? project.slides : sampleSlides.slice(0, 4);
  const index = Math.min(state.selectedSlideIndex, slides.length - 1);
  state.selectedSlideIndex = index;

  els["slide-select"].replaceChildren();
  slides.forEach((_, slideIndex) => {
    const option = document.createElement("option");
    option.value = String(slideIndex);
    option.textContent = `slide-${String(slideIndex + 1).padStart(2, "0")}.png`;
    option.selected = slideIndex === index;
    els["slide-select"].appendChild(option);
  });

  els["slide-stage"].replaceChildren();
  const img = document.createElement("img");
  img.src = slides[index] || sampleSlides[0];
  img.alt = "当前微调页面";
  const selection = document.createElement("div");
  selection.className = "selection-box";
  els["slide-stage"].append(img, selection);

  els["refine-prompt"].value = project.lastRefine || "将选区内的图表强调色提高 15%，保持整体字体层级和页眉页脚不变。";
  els["version-list"].replaceChildren();
  const versions = project.versions.length ? project.versions : ["暂无局部版本"];
  versions.forEach((version) => {
    const item = document.createElement("div");
    item.className = "version-item";
    item.textContent = version;
    els["version-list"].appendChild(item);
  });
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
    return;
  }

  styles.forEach((style) => {
    const card = createStyleCard(style, {
      selected: activeProject()?.selectedStyleId === style.id,
      onSelect: () => {
        const project = activeProject();
        project.selectedStyleId = style.id;
        project.stage = Math.max(project.stage, 2);
        project.status = "视觉确认";
        state.activeView = "workspace";
        persist();
        render();
      },
    });
    els["style-grid"].appendChild(card);
  });
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

function createProject() {
  const id = `project-${Date.now()}`;
  const project = {
    id,
    title: "未命名 PPT 项目",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: "刚刚",
    status: "资料理解",
    stage: 0,
    pageCount: 10,
    sourceText: "",
    files: [],
    references: [],
    outline: null,
    selectedStyleId: null,
    slides: [],
    pptxUrl: "",
    versions: [],
    lastRefine: "",
  };
  state.projects.unshift(project);
  state.activeProjectId = id;
  state.activeView = "workspace";
  persist();
  render();
  els["source-text"].focus();
}

function resetDemo() {
  state.projects = structuredClone(defaultProjects);
  state.styles = mergeDefaultStyles([]);
  state.activeProjectId = defaultProjects[0].id;
  state.activeView = "workspace";
  state.selectedSlideIndex = 0;
  state.styleSearch = "";
  persist();
  render();
}

function updateProjectTitle(event) {
  const project = activeProject();
  project.title = event.target.value || "未命名 PPT 项目";
  project.updatedAt = "刚刚";
  persist();
  renderProjectList();
}

function updateSourceText(event) {
  const project = activeProject();
  project.sourceText = event.target.value;
  project.updatedAt = "刚刚";
  persist();
  renderProjectList();
}

function updateFiles(event, key) {
  const project = activeProject();
  project[key] = [...event.target.files].map((file) => file.name);
  project.updatedAt = "刚刚";
  persist();
  renderProjectBoard();
}

function analyzeMaterial() {
  const project = activeProject();
  const topic = inferTopic(project.sourceText, project.title);
  project.outline = {
    title: `${topic} PPT 大纲`,
    bullets: ["提炼业务目标与受众场景", "拆解关键发现、指标和证据链", "规划封面、目录、重点页面和行动页"],
    profile: `${topic} / ${project.pageCount} pages / data-heavy / image-deck`,
  };
  project.stage = Math.max(project.stage, 1);
  project.status = "视觉预览";
  project.updatedAt = "刚刚";
  persist();
  render();
}

function inferTopic(text, fallback) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const topicLine = lines.find((line) => line.includes("主题") || line.includes("目标"));
  if (!topicLine) return fallback.replace(/PPT|项目/g, "").trim() || "业务汇报";
  return topicLine.replace(/主题[:：]?|目标[:：]?/g, "").slice(0, 20);
}

function generatePreview() {
  const project = activeProject();
  if (!project.outline) analyzeMaterial();
  project.stage = Math.max(project.stage, 2);
  project.status = "视觉确认";
  project.selectedStyleId = project.selectedStyleId || state.styles[0].id;
  project.updatedAt = "刚刚";
  persist();
  render();
}

function confirmStyle() {
  const project = activeProject();
  if (!project.selectedStyleId) project.selectedStyleId = state.styles[0].id;
  project.stage = Math.max(project.stage, 3);
  project.status = "图片生成";
  project.updatedAt = "刚刚";

  const style = selectedStyle(project);
  if (style && !state.styles.some((item) => item.id === `${style.id}-accepted-${project.id}`)) {
    state.styles.unshift({
      ...style,
      id: `${style.id}-accepted-${project.id}`,
      name: `${style.name} · ${project.title}`,
      description: `由项目「${project.title}」确认沉淀，保留原视觉系统与项目画像。`,
      source: "captured",
    });
  }

  persist();
  render();
}

function generatePilotSlides() {
  const project = activeProject();
  if (!project.selectedStyleId) confirmStyle();
  project.slides = sampleSlides.slice(0, 4);
  project.stage = Math.max(project.stage, 3);
  project.status = "首批四页";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions, ["v1 首批四页生成"]);
  persist();
  render();
}

function assemblePptx() {
  const project = activeProject();
  if (project.slides.length < project.pageCount) {
    project.slides = sampleSlides.slice(0, project.pageCount);
  }
  project.pptxUrl = "/outputs/hr-talent-performance-gray-orange-v2.pptx";
  project.stage = Math.max(project.stage, 4);
  project.status = "PPTX 交付";
  project.updatedAt = "刚刚";
  project.versions = mergeVersions(project.versions, ["v2 全量图片生成", "v3 图片版 PPTX 组装"]);
  persist();
  render();
}

function updateRefinePrompt(event) {
  const project = activeProject();
  project.lastRefine = event.target.value;
  persist();
}

function refineSlide() {
  const project = activeProject();
  project.stage = 5;
  project.status = "局部微调";
  project.updatedAt = "刚刚";
  const slideNumber = String(state.selectedSlideIndex + 1).padStart(2, "0");
  const version = `v${project.versions.length + 1} slide-${slideNumber} 局部版本`;
  project.versions = mergeVersions(project.versions, [version]);
  persist();
  render();
}

function saveCapturedStyle() {
  const name = els["style-name-input"].value.trim();
  const description = els["style-desc-input"].value.trim();
  const tags = els["style-tags-input"].value.split(",").map((tag) => tag.trim()).filter(Boolean);
  const project = activeProject();
  const baseStyle = selectedStyle(project) || state.styles[0];

  if (!name || !description) {
    els["capture-note"].textContent = "请补齐风格名称和适用场景。";
    return;
  }

  const style = {
    id: `captured-${Date.now()}`,
    name,
    description,
    pageCount: project.pageCount,
    tags: tags.length ? tags : ["captured", "custom"],
    image: baseStyle.image,
    prompt: baseStyle.prompt,
    source: "captured",
  };

  state.styles.unshift(style);
  els["style-name-input"].value = "";
  els["style-desc-input"].value = "";
  els["style-tags-input"].value = "";
  els["capture-note"].textContent = `已保存：${style.name}`;
  persist();
  renderStyleLibrary();
}

function mergeVersions(existing, additions) {
  const seen = new Set(existing);
  additions.forEach((item) => seen.add(item));
  return [...seen];
}

window.addEventListener("DOMContentLoaded", init);
