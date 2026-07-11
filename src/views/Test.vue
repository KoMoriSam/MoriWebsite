<template>
  <main class="my-12 mx-6 md:mx-12">
    <article class="mx-auto max-w-6xl space-y-6">
      <header
        class="relative overflow-hidden rounded-box border border-base-300 bg-base-200/70 p-6 md:p-8 shadow-sm"
      >
        <div
          class="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-accent/10 blur-2xl"
        ></div>

        <div
          class="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div class="prose max-w-none">
            <h1 class="mb-2">开发测试面板</h1>
            <p class="my-0 text-sm opacity-70">
              当前页面用于验证组件、交互与 API 行为，风格与主站保持一致。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-warning badge-sm">DEV ONLY</span>
            <router-link class="btn btn-sm btn-outline" to="/">
              返回主页
            </router-link>
          </div>
        </div>
      </header>

      <nav
        class="sticky top-3 z-10 rounded-box border border-base-300 bg-base-100/90 backdrop-blur px-3 py-2 shadow-sm"
      >
        <div class="flex flex-wrap gap-1.5">
          <a
            v-for="item in testSections"
            :key="item.id"
            class="btn btn-xs btn-ghost"
            :href="`#${item.id}`"
          >
            {{ item.label }}
          </a>
        </div>
      </nav>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div id="routing" class="scroll-mt-24">
          <TestCard title="路由与导航">
            <div class="flex flex-wrap gap-2 mb-3">
              <button
                v-for="r in routes"
                :key="r.path"
                class="btn btn-sm btn-outline"
                @click="router.push(r.path)"
              >
                {{ r.name }}
              </button>
            </div>
            <p class="text-xs opacity-50">
              当前路由: <code>{{ $route.fullPath }}</code>
            </p>
          </TestCard>
        </div>

        <div id="toast" class="scroll-mt-24">
          <TestCard title="Toast 通知">
            <div
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4"
            >
              <button
                class="btn btn-sm btn-success"
                @click="toast.success('操作成功！')"
              >
                Success
              </button>
              <button
                class="btn btn-sm btn-error"
                @click="toast.error('操作失败！')"
              >
                Error
              </button>
              <button
                class="btn btn-sm btn-warning"
                @click="toast.warning('请注意！')"
              >
                Warning
              </button>
              <button
                class="btn btn-sm btn-info"
                @click="toast.info('提示信息')"
              >
                Info
              </button>
              <button
                class="btn btn-sm btn-ghost"
                @click="toast.loading('加载中…')"
              >
                Loading
              </button>
              <button
                class="btn btn-sm btn-accent"
                @click="toast.star('彩蛋 ⭐')"
              >
                Star
              </button>
            </div>
            <p class="text-xs font-semibold mb-2 opacity-60">不同位置</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="pos in toastPositions"
                :key="pos"
                class="btn btn-xs btn-outline"
                @click="testToastPos(pos)"
              >
                {{ pos }}
              </button>
            </div>
          </TestCard>
        </div>

        <div id="modal" class="scroll-mt-24">
          <TestCard title="Modal 弹窗">
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                class="btn btn-sm btn-primary"
                @click="modal.info('信息', '通过 useModal().info() 调用')"
              >
                Info Modal
              </button>
              <button
                class="btn btn-sm btn-warning"
                @click="
                  modal.confirm('确认', '确认执行操作？', {
                    onSubmit: () => toast.success('已确认'),
                  })
                "
              >
                Confirm Modal
              </button>
              <button
                class="btn btn-sm btn-outline"
                @click="inlineModal = !inlineModal"
              >
                {{ inlineModal ? "关闭内联" : "内联 v-if" }}
              </button>
            </div>
            <Modal
              v-if="inlineModal"
              :visible="true"
              title="内联 Modal"
              description="&lt;Modal :visible /&gt; 声明式控制"
              button-text="关闭"
              @close="inlineModal = false"
            />
          </TestCard>
        </div>

        <div id="markdown" class="scroll-mt-24 xl:col-span-2">
          <TestCard title="Markdown 渲染">
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                v-for="s in mdSamples"
                :key="s.name"
                class="btn btn-xs"
                :class="currentMd === s.name ? 'btn-primary' : 'btn-outline'"
                @click="currentMd = s.name"
              >
                {{ s.name }}
              </button>
            </div>
            <div class="bg-base-100 rounded-lg p-4 max-h-96 overflow-auto">
              <article
                class="prose max-w-none"
                :class="readerStore.styleConfigs.fontStyle"
              >
                <vue-markdown
                  v-if="mdContent"
                  :source="mdContent"
                  :options="mdOptions"
                  :plugins="[]"
                />
                <p v-else class="opacity-50 italic">加载中…</p>
              </article>
            </div>
          </TestCard>
        </div>

        <div id="number-controller" class="scroll-mt-24">
          <TestCard title="NumberController 组件">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <TestControlRow label="字体大小" :value="ncFontSize">
                <NumberController
                  v-model="ncFontSize"
                  :step="1"
                  :places="0"
                  :min="12"
                  :max="48"
                />
              </TestControlRow>
              <TestControlRow label="字间距" :value="ncFontGap">
                <NumberController
                  v-model="ncFontGap"
                  :step="0.01"
                  :places="2"
                  :min="-1"
                  :max="1"
                />
              </TestControlRow>
              <TestControlRow label="行高" :value="ncLineHeight">
                <NumberController
                  v-model="ncLineHeight"
                  :step="0.1"
                  :places="1"
                  :min="1"
                  :max="3"
                />
              </TestControlRow>
            </div>
          </TestCard>
        </div>

        <div id="loading" class="scroll-mt-24">
          <TestCard title="Loading 状态">
            <div class="flex flex-wrap items-center gap-4 mb-4">
              <button class="btn btn-sm btn-primary" @click="toggleLoading">
                切换 Loading（3s）
              </button>
              <span
                v-if="loadingOn"
                class="loading loading-spinner loading-sm"
              ></span>
            </div>
            <div
              class="bg-base-100 rounded-lg p-6 min-h-[100px] flex items-center justify-center"
            >
              <Loading v-if="loadingOn" size="my-4" />
              <p v-else class="opacity-50">点击按钮查看 Loading 组件</p>
            </div>
          </TestCard>
        </div>

        <div id="pagination" class="scroll-mt-24">
          <TestCard title="Pagination 分页">
            <p class="text-xs opacity-60 mb-3">
              依赖 novelStore（需先访问 /novel 进入阅读器）
            </p>
            <div class="bg-base-100 rounded-lg p-4 flex justify-center">
              <Pagination />
            </div>
          </TestCard>
        </div>

        <div id="codeblock" class="scroll-mt-24 xl:col-span-2">
          <TestCard title="CodeBlock（带复制）">
            <CodeBlock language="typescript" :code="sampleCode" />
          </TestCard>
        </div>

        <div id="to-top" class="scroll-mt-24">
          <TestCard title="浮动按钮与回到顶部">
            <p class="text-xs opacity-50 mb-3">
              大屏滚动即可看到右下角浮动按钮，点击下方测试回到顶部：
            </p>
            <ToTop />
          </TestCard>
        </div>

        <div id="click-limit" class="scroll-mt-24">
          <TestCard title="useClickLimit 防连点">
            <p class="text-xs opacity-60 mb-2">
              连点 ≥{{ limitOpts.maxClicks }} 次 → 冷却
              {{ limitOpts.cooldown / 1000 }}s
            </p>
            <div class="flex items-center gap-3">
              <button
                class="btn btn-sm btn-warning"
                :disabled="clickLimit.isDisabled.value"
                @click="clickLimit.handleClick(() => clickCount++)"
              >
                点击: {{ clickCount }}
              </button>
              <button
                class="btn btn-xs btn-ghost"
                @click="
                  clickLimit.reset();
                  clickCount = 0;
                "
              >
                重置
              </button>
              <span
                v-if="clickLimit.isDisabled.value"
                class="text-error text-xs font-bold animate-pulse"
                >冷却中…</span
              >
            </div>
          </TestCard>
        </div>

        <div id="image-load" class="scroll-mt-24">
          <TestCard title="useImageLoad">
            <div class="flex items-center gap-4">
              <div
                class="relative w-32 h-32 bg-base-300 rounded-lg overflow-hidden"
              >
                <div
                  v-if="!imgLoaded"
                  class="skeleton absolute inset-0 z-10"
                ></div>
                <img
                  src="/assets/images/avatar/komorisam.webp"
                  alt="avatar"
                  class="w-full h-full object-cover"
                  @load="imgLoaded = true"
                />
              </div>
              <p class="text-sm">
                状态:
                <span :class="imgLoaded ? 'text-success' : 'text-warning'">{{
                  imgLoaded ? "✅ 已加载" : "⏳ 加载中…"
                }}</span>
              </p>
            </div>
          </TestCard>
        </div>

        <div id="storage" class="scroll-mt-24 xl:col-span-2">
          <TestCard title="localStorage">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div
                v-for="g in storageGroups"
                :key="g.key"
                class="bg-base-100 rounded-lg p-3"
              >
                <h4 class="font-semibold text-sm mb-1">{{ g.label }}</h4>
                <pre
                  class="text-[10px] overflow-auto max-h-48 bg-base-300 p-2 rounded leading-tight"
                  >{{ g.data || "(空)" }}</pre
                >
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-warning" @click="clearStorage">
                清空全部
              </button>
              <button class="btn btn-sm btn-info" @click="refreshStorage">
                刷新
              </button>
            </div>
          </TestCard>
        </div>

        <div id="environment" class="scroll-mt-24">
          <TestCard title="环境信息">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <template v-for="(v, k) in envInfo" :key="k">
                <span class="font-semibold">{{ k }}:</span
                ><code class="text-xs break-all">{{ v }}</code>
              </template>
            </div>
          </TestCard>
        </div>

        <div id="api" class="scroll-mt-24">
          <TestCard title="API 测试">
            <div class="flex gap-2 mb-3">
              <button
                class="btn btn-sm btn-primary"
                :disabled="apiLoading"
                @click="testApi('chapters')"
              >
                章节列表
              </button>
              <button
                class="btn btn-sm btn-primary"
                :disabled="apiLoading"
                @click="testApi('content')"
              >
                章节内容
              </button>
              <button
                class="btn btn-sm btn-secondary"
                :disabled="apiLoading"
                @click="testApi('permalink-map')"
              >
                UUID ↔ Permalink
              </button>
            </div>
            <div
              v-if="apiLoading"
              class="loading loading-spinner loading-sm mb-2"
            ></div>
            <pre
              v-if="apiResult"
              class="text-[10px] overflow-auto max-h-48 bg-base-300 p-2 rounded leading-tight"
              >{{ apiResult }}</pre
            >
            <p v-if="apiError" class="text-error text-sm">{{ apiError }}</p>
          </TestCard>
        </div>
      </section>
    </article>
  </main>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import { useClickLimit } from "@/composables/useClickLimit";
import { useReaderStore } from "@/stores/readerStore";
import { useChapterApi } from "@/services/api-chapters";
import { useGlobalStorage } from "@/utils/storage/new-global-storage";
import { useReaderSettingsStorage } from "@/utils/storage/new-reader-settings";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";
import VueMarkdown from "vue-markdown-render";
import Loading from "@/components/base/Loading.vue";
import Modal from "@/components/ui/Modal.vue";
import NumberController from "@/components/ui/input/NumberController.vue";
import Pagination from "@/components/base/Pagination.vue";
import CodeBlock from "@/components/ui/CodeBlock.vue";
import ToTop from "@/components/base/ToTop.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestControlRow from "@/components/test/_TestControlRow.vue";

const router = useRouter();
const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});
const modal = useModal();
const readerStore = useReaderStore();

const testSections = [
  { id: "routing", label: "路由" },
  { id: "toast", label: "Toast" },
  { id: "modal", label: "Modal" },
  { id: "markdown", label: "Markdown" },
  { id: "number-controller", label: "控制器" },
  { id: "loading", label: "Loading" },
  { id: "pagination", label: "分页" },
  { id: "codeblock", label: "CodeBlock" },
  { id: "to-top", label: "ToTop" },
  { id: "click-limit", label: "防连点" },
  { id: "image-load", label: "图片加载" },
  { id: "storage", label: "存储" },
  { id: "environment", label: "环境" },
  { id: "api", label: "API" },
];

// ───────── Toast 位置列表 ─────────
const toastPositions = [
  "start-top",
  "center-top",
  "end-top",
  "start-middle",
  "center-middle",
  "end-middle",
  "end-bottom",
];
function testToastPos(pos) {
  useToast({ position: pos, duration: 1500, closable: false }).info(pos);
}

// ───────── 路由列表 ─────────
const routes = computed(() =>
  router.options.routes
    .filter(
      (r) => r.name && r.name !== "test" && !r.name.startsWith("NotFound"),
    )
    .map((r) => ({ name: r.name, path: r.path }))
    .filter((r) => !r.path.includes("*")),
);

// ───────── 内联 Modal ─────────
const inlineModal = ref(false);

// ───────── Markdown ─────────
const mdOptions = {
  html: true,
  typographer: true,
  linkify: true,
  breaks: true,
};
const mdSamples = [
  {
    name: "标题段落",
    content:
      "# 一级标题\n## 二级标题\n### 三级标题\n\n**粗体** *斜体* ~~删除~~ `行内代码`\n\n> 引用",
  },
  { name: "列表", content: "- 无序列表\n  - 嵌套项\n\n1. 有序\n2. 列表" },
  {
    name: "代码块",
    content:
      "```javascript\nfunction fib(n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nconsole.log(fib(10)); // 55\n```",
  },
  {
    name: "表格",
    content:
      "| 属性 | 类型 | 默认 |\n|------|------|------|\n| size | string | md |\n| color | string | primary |",
  },
  {
    name: "链接图片",
    content:
      "[GitHub](https://github.com)\n\n![pic](https://placehold.co/400x200/374151/fff?text=Test+Image)",
  },
];
const currentMd = ref("标题段落");
const mdContent = computed(
  () => mdSamples.find((s) => s.name === currentMd.value)?.content || "",
);

// ───────── NumberController ─────────
const ncFontSize = ref(24);
const ncFontGap = ref(0);
const ncLineHeight = ref(1.5);

// ───────── Loading ─────────
const loadingOn = ref(false);
function toggleLoading() {
  loadingOn.value = true;
  setTimeout(() => {
    loadingOn.value = false;
    toast.success("加载完成！");
  }, 3000);
}

// ───────── CodeBlock ─────────
const sampleCode = `interface Test {\n  name: string;\n  value: number;\n}\n\nconst t: Test = { name: "hello", value: 42 };\nconsole.log(t);`;

// ───────── useClickLimit ─────────
const limitOpts = { maxClicks: 5, cooldown: 3000 };
const clickLimit = useClickLimit(limitOpts);
const clickCount = ref(0);

// ───────── useImageLoad demo ─────────
const imgLoaded = ref(false);

// ───────── localStorage ─────────
const { GLOBAL_INFO } = useGlobalStorage();
const { READER_SETTINGS } = useReaderSettingsStorage();
const { READING_STATE } = useReadingStateStorage();

const storageGroups = computed(() => [
  {
    key: "GLOBAL_INFO",
    label: "GLOBAL_INFO",
    data: JSON.stringify(GLOBAL_INFO.value, null, 2),
  },
  {
    key: "READER_SETTINGS",
    label: "READER_SETTINGS",
    data: JSON.stringify(READER_SETTINGS.value, null, 2),
  },
  {
    key: "READING_STATE",
    label: "READING_STATE",
    data: JSON.stringify(READING_STATE.value, null, 2),
  },
]);

function refreshStorage() {
  GLOBAL_INFO.value = { ...GLOBAL_INFO.value };
  READER_SETTINGS.value = { ...READER_SETTINGS.value };
  READING_STATE.value = { ...READING_STATE.value };
}
function clearStorage() {
  if (confirm("确定清空全部 localStorage？")) {
    localStorage.clear();
    refreshStorage();
  }
}

// ───────── 环境信息 ─────────
const envInfo = computed(() => ({
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  "User Agent": navigator.userAgent.substring(0, 60) + "...",
  Screen: `${window.screen.width}x${window.screen.height}`,
  Language: navigator.language,
}));

// ───────── API ─────────
const apiLoading = ref(false);
const apiResult = ref(null);
const apiError = ref(null);
const { fetchChapters, fetchContent } = useChapterApi();

const slugifySegment = (value, fallback = "item") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const normalized = raw
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[“”\"'`]/g, "")
    .replace(/[。！？：；，、·]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
};

function buildPermalinkRows(chaptersData) {
  const flatChapters = Object.values(chaptersData).flatMap((volume) =>
    volume.chapters.map((chapter) => ({
      ...chapter,
      volumeTitle: volume.volumeInfo.title,
    })),
  );

  const duplicateCounter = {};

  return flatChapters.map((chapter) => {
    const chapterPath = String(chapter.path || "");
    const [volumeRaw = "", chapterFileRaw = ""] = chapterPath.split("/");

    const volumeSlug = slugifySegment(volumeRaw, "volume");
    const chapterBaseSlug = slugifySegment(chapterFileRaw, "chapter");

    const key = `${volumeSlug}/${chapterBaseSlug}`;
    const duplicateIndex = (duplicateCounter[key] || 0) + 1;
    duplicateCounter[key] = duplicateIndex;

    const chapterSlug =
      duplicateIndex > 1
        ? `${chapterBaseSlug}-${duplicateIndex}`
        : chapterBaseSlug;

    return {
      uuid: chapter.uuid,
      title: chapter.title,
      path: chapter.path,
      permalink: `/novel/${volumeSlug}/${chapterSlug}`,
    };
  });
}

async function testApi(type) {
  apiLoading.value = true;
  apiResult.value = null;
  apiError.value = null;
  try {
    if (type === "chapters")
      apiResult.value = JSON.stringify(await fetchChapters(), null, 2);
    else if (type === "permalink-map") {
      const data = await fetchChapters();
      const rows = buildPermalinkRows(data);
      apiResult.value = JSON.stringify(rows, null, 2);
    } else
      apiResult.value = (await fetchContent("vol-001/ch-001.md")).substring(
        0,
        2000,
      );
  } catch (e) {
    apiError.value = e.message;
  } finally {
    apiLoading.value = false;
  }
}
</script>
