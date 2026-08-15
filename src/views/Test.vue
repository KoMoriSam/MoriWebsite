<template>
  <ContentPage
    eyebrow="Development Diagnostics"
    title="开发测试面板"
    description="集中验证页面布局、基础组件、组合式函数与数据服务在当前设计系统中的行为。"
  >
    <template #actions>
      <span class="badge badge-warning badge-soft badge-lg">仅开发环境</span>
      <span class="badge badge-dash badge-lg">
        {{ testSections.length }} 个检查项
      </span>
      <router-link class="btn btn-sm" to="/">
        <i class="ri-arrow-left-line" aria-hidden="true"></i>
        返回主页
      </router-link>
    </template>

    <nav
      class="sticky top-3 z-10 mt-8 mb-6 overflow-x-auto rounded-box border border-base-300 bg-base-100/90 p-2 shadow-sm backdrop-blur"
      aria-label="测试项目快速导航"
    >
      <ul class="menu menu-horizontal flex-nowrap gap-1 p-0">
        <li v-for="item in testSections" :key="item.id">
          <a class="whitespace-nowrap text-xs" :href="`#${item.id}`">
            {{ item.label }}
          </a>
        </li>
      </ul>
    </nav>

    <section class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
      <div id="page-layout" class="scroll-mt-24 xl:col-span-2">
        <TestCard title="ContentPage 内容页">
          <div
            class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          >
            <div>
              <p class="max-w-3xl text-sm leading-relaxed text-base-content/70">
                当前页面就是通用布局组件的完整实例；眉题、标题、说明与操作区均由具名入口提供，正文继续保留自由组合能力。
              </p>
              <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div class="rounded-box bg-base-200 p-3">
                  <dt class="text-xs text-base-content/55">内容宽度</dt>
                  <dd class="mt-1 font-mono font-semibold">max-w-7xl</dd>
                </div>
                <div class="rounded-box bg-base-200 p-3">
                  <dt class="text-xs text-base-content/55">标题层级</dt>
                  <dd class="mt-1 font-semibold">语义化 h1</dd>
                </div>
                <div class="rounded-box bg-base-200 p-3">
                  <dt class="text-xs text-base-content/55">响应式操作区</dt>
                  <dd class="mt-1 font-semibold">自动换行与对齐</dd>
                </div>
              </dl>
            </div>
            <div class="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              <router-link class="btn btn-sm btn-outline" to="/blog">
                文章列表
              </router-link>
              <router-link class="btn btn-sm btn-outline" to="/changelog">
                更新日志
              </router-link>
              <router-link class="btn btn-sm btn-outline" to="/licenses">
                许可声明
              </router-link>
              <router-link class="btn btn-sm btn-outline" to="/tools">
                工具集
              </router-link>
            </div>
          </div>
        </TestCard>
      </div>

      <div id="routing" class="scroll-mt-24">
        <TestCard title="路由与导航">
          <div class="flex flex-wrap gap-2 mb-3">
            <router-link
              v-for="r in routes"
              :key="r.path"
              class="btn btn-sm btn-outline"
              :to="r.path"
            >
              {{ r.name }}
            </router-link>
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
              @click="
                toast.info('提示信息', {
                  closable: true,
                  duration: 0,
                })
              "
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
              @click="toast.star('发现彩蛋')"
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
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-semibold">1. 无按钮</h3>
              <p class="mt-1 text-sm opacity-70">
                应仅能通过 Esc 或点击弹窗外部关闭。
              </p>
              <button class="btn btn-sm mt-3" @click="openNoButtonModal">
                测试无按钮 Modal
              </button>
            </article>

            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-semibold">2. 右上角关闭按钮</h3>
              <p class="mt-1 text-sm opacity-70">
                可点击右上角关闭按钮，也可通过 Esc 或点击外部关闭。
              </p>
              <button class="btn btn-sm mt-3" @click="openTopCloseModal">
                测试顶部关闭按钮
              </button>
            </article>

            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-semibold">3. 右下角操作按钮</h3>
              <p class="mt-1 text-sm opacity-70">
                点击按钮应显示成功提示；Esc 或点击外部只关闭，不显示提示。
              </p>
              <button class="btn btn-sm mt-3" @click="openFooterModal">
                测试底部按钮
              </button>
            </article>

            <article class="rounded-box border border-base-300 p-4">
              <h3 class="font-semibold">4. 确认 Modal</h3>
              <p class="mt-1 text-sm opacity-70">
                确认按钮应为主色，取消按钮在右侧；Esc 与点击外部均不能关闭。
              </p>
              <button class="btn btn-sm mt-3" @click="openConfirmModal">
                测试确认 Modal
              </button>
            </article>

            <article
              class="rounded-box border border-base-300 p-4 sm:col-span-2"
            >
              <h3 class="font-semibold">5. 声明式 Modal 组件</h3>
              <p class="mt-1 text-sm opacity-70">
                直接使用 &lt;Modal&gt;，验证 visible、button-text 与 close
                事件。
              </p>
              <button
                class="btn btn-sm mt-3"
                @click="inlineModal = !inlineModal"
              >
                {{ inlineModal ? "关闭声明式 Modal" : "打开声明式 Modal" }}
              </button>
            </article>
          </div>
          <Modal
            v-if="inlineModal"
            :visible="true"
            title="声明式 Modal"
            description="这是通过 &lt;Modal :visible /&gt; 直接声明的弹窗。"
            button-text="关闭"
            @close="inlineModal = false"
          />
        </TestCard>
      </div>

      <div id="markdown" class="scroll-mt-24 xl:col-span-2">
        <TestCard title="Markdown 渲染与阅读器样式设置">
          <div
            class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]"
          >
            <FormatSetting />

            <section class="rounded-box p-4 sm:p-5">
              <h3 class="font-semibold">实时联动检查</h3>

              <dl class="my-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <div
                  class="rounded-box border border-base-300 p-2 col-span-2 sm:col-auto"
                >
                  <dt class="text-xs text-base-content/55">字体类名</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontStyle }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">字体大小</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontSize }}px
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">字间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.fontGap }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">行间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.lineHeight }}
                  </dd>
                </div>
                <div class="rounded-box border border-base-300 p-2">
                  <dt class="text-xs text-base-content/55">段间距</dt>
                  <dd class="mt-1 font-mono font-semibold">
                    {{ readerStore.styleConfigs.paraHeight }}
                  </dd>
                </div>
              </dl>

              <div class="flex flex-wrap gap-2 my-4">
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
              <Markdown
                class="max-h-140 overflow-auto"
                :content="mdContent"
                :header-data="mdHeaderData"
                :style-configs="readerStore.styleConfigs"
              />
            </section>
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
            <button
              class="btn btn-sm btn-primary"
              :disabled="loadingOn"
              @click="toggleLoading"
            >
              <span
                v-if="loadingOn"
                class="loading loading-spinner loading-xs"
              ></span>
              {{ loadingOn ? "加载中" : "测试 Loading（3s）" }}
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
          <p class="mb-3 text-xs opacity-60">
            完全由 Test.vue 本地状态驱动：当前第
            {{ paginationCurrentPage }} 页，共 {{ paginationTotalPages }} 页。
          </p>
          <div class="mb-4 flex flex-wrap gap-2">
            <button class="btn btn-xs" @click="setPaginationScenario(3, 5)">
              少量页
            </button>
            <button class="btn btn-xs" @click="setPaginationScenario(1, 24)">
              第一页
            </button>
            <button class="btn btn-xs" @click="setPaginationScenario(12, 24)">
              中间页
            </button>
            <button class="btn btn-xs" @click="setPaginationScenario(24, 24)">
              最后一页
            </button>
          </div>
          <div class="flex justify-center rounded-lg bg-base-100 p-4">
            <Pagination
              v-model:current-page="paginationCurrentPage"
              :total-pages="paginationTotalPages"
            />
          </div>
        </TestCard>
      </div>

      <div id="codeblock" class="scroll-mt-24 xl:col-span-2">
        <TestCard title="CodeBlock（带复制）">
          <section class="code-block my-2">
            <CodeBlock language="typescript" :code="sampleCode" />
          </section>
          <section class="code-block my-2">
            <CodeBlock
              language=""
              code="Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione."
            />
          </section>
        </TestCard>
      </div>

      <div id="to-top" class="scroll-mt-24">
        <TestCard title="浮动按钮与回到顶部">
          <p class="text-xs opacity-50 mb-3">
            大屏滚动即可看到右下角浮动按钮，点击下方测试回到顶部：
          </p>
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
            <p class="flex items-center gap-2 text-sm">
              <span>状态:</span>
              <span
                class="inline-flex items-center gap-1"
                :class="imgLoaded ? 'text-success' : 'text-warning'"
              >
                <i
                  :class="
                    imgLoaded
                      ? 'ri-checkbox-circle-line'
                      : 'ri-loader-4-line animate-spin'
                  "
                  aria-hidden="true"
                ></i>
                {{ imgLoaded ? "已加载" : "加载中…" }}
              </span>
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
  </ContentPage>
  <FootBar />
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import { useClickLimit } from "@/composables/useClickLimit";
import { useReaderStore } from "@/stores/readerStore";
import { useChapterApi } from "@/services/api-chapters";
import { useGlobalStorage } from "@/utils/storage/use-global-storage";
import { useReaderSettingsStorage } from "@/utils/storage/use-reader-settings-storage";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import Loading from "@/components/base/Loading.vue";
import Modal from "@/components/ui/Modal.vue";
import Markdown from "@/components/reader/Markdown.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import NumberController from "@/components/ui/input/NumberController.vue";
import Pagination from "@/components/base/Pagination.vue";
import CodeBlock from "@/components/markdown/CodeBlock.vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestControlRow from "@/components/test/_TestControlRow.vue";
import FootBar from "@/components/layout/FootBar.vue";

const router = useRouter();
const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});
const modal = useModal();
const readerStore = useReaderStore();

const testSections = [
  { id: "page-layout", label: "页面布局" },
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

function openNoButtonModal() {
  modal.show({
    title: "无按钮 Modal",
    description: "请分别使用 Esc 和点击弹窗外部来关闭。",
    buttonMode: "none",
  });
}

function openTopCloseModal() {
  modal.info("右上角关闭按钮", "请依次验证关闭按钮、Esc 和点击弹窗外部。", {
    buttonMode: "close",
  });
}

function openFooterModal() {
  modal.info(
    "右下角操作按钮",
    "只有点击“我知道了”才应显示成功提示；Esc 和点击外部只负责关闭。",
    {
      buttonMode: "footer",
      buttonText: "我知道了",
      onSubmit: () => toast.success("右下角按钮已触发"),
    },
  );
}

function openConfirmModal() {
  modal.confirm(
    "确认操作",
    "Esc 和点击弹窗外部不应关闭此弹窗，请测试确认和取消按钮。",
    {
      buttonText: "确认",
      cancelText: "取消",
      onSubmit: () => toast.success("已确认"),
      onCancel: () => toast.info("已取消"),
    },
  );
}

// ───────── Markdown ─────────
const mdSamples = [
  {
    name: "标题与段落",
    content: [
      "# 一级标题",
      "## 二级标题",
      "### 三级标题",
      "#### 四级标题",
      "##### 五级标题",
      "###### 六级标题",
      "",
      "这是第一段正文，用于观察段落宽度、字号、行高、字间距与首行缩进。",
      "",
      "这是第二段正文。下面使用两个行尾空格产生硬换行。  ",
      "这一行应紧跟上一行显示，但仍然位于同一段落中。",
      "",
      "---",
      "",
      "> 普通引用第一层",
      ">",
      "> > 嵌套引用第二层",
    ].join("\n"),
  },
  {
    name: "行内与扩展",
    content: [
      "普通文本、**粗体aBc123**、*斜体aBc123*、***粗斜体aBc123***、~~删除线~~、==高亮文本==。",
      "",
      "行内代码 `const answer = 42`，转义字符 \\*不会变成斜体\\*。",
      "",
      "上标：X^2^；下标：H~2~O；Emoji：:smile: :tada: :warning:。",
      "",
      "Ruby 注音：{小森|コモリ}、{远方|yuǎnfāng}、{汉字|かんじ}。",
      "",
      "HTML 和 CSS 都可以使用缩写提示。",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
      "",
      "这是一段签名样式测试。{.signature}",
      "",
      "## 带自定义 ID 的标题 {#custom-heading}",
      "",
      "[跳转到自定义标题](#custom-heading)",
    ].join("\n"),
  },
  {
    name: "列表与任务",
    content: [
      "## 无序列表",
      "",
      "- 一级项目 A",
      "  - 二级项目 A.1",
      "    - 三级项目 A.1.1",
      "- 一级项目 B",
      "",
      "## 有序列表",
      "",
      "1. 第一步",
      "2. 第二步",
      "   1. 子步骤",
      "   2. 另一个子步骤",
      "3. 第三步",
      "",
      "## 任务列表",
      "",
      "- [x] 已完成任务",
      "- [ ] 未完成任务",
      "- [x] 包含 **粗体** 与 `code` 的任务",
    ].join("\n"),
  },
  {
    name: "链接与媒体",
    content: [
      "## 链接",
      "",
      "[站内首页](/)、[GitHub](https://github.com) 与自动链接 <https://komori.cc/>。",
      "",
      '这是一个带标题的链接：[Markdown 指南](https://www.markdownguide.org/ "打开 Markdown 指南")。',
      "",
      "[引用式链接][docs]",
      "",
      "[docs]: https://www.markdownguide.org/",
      "",
      "## 图片",
      "",
      '![小森头像](/assets/images/avatar/komorisam.webp "本地图片与替代文本测试")',
      "",
      "图片下方正文用于检查图片尺寸、间距和加载后的布局稳定性。",
    ].join("\n"),
  },
  {
    name: "表格",
    content: [
      "## 对齐与行内格式",
      "",
      "| 左对齐 | 居中 | 右对齐 | 混合内容 |",
      "| :--- | :---: | ---: | --- |",
      "| 普通文本 | **粗体** | 123.45 | `inline code` |",
      "| 较长内容用于测试列宽和换行 | [链接](https://example.com) | 9,999 | ~~删除~~ 与 ==高亮== |",
      "| 中文标点：，。！？ | :smile: | -42 | H~2~O 与 X^2^ |",
      "",
      "表格下方正文用于检查滚动容器与上下间距。",
    ].join("\n"),
  },
  {
    name: "代码高亮",
    content: [
      "行内代码：`npm run build`。",
      "",
      "~~~javascript",
      "// 这是一段 JavaScript 代码",
      "function fibonacci(n) {",
      "  if (n <= 1) return n;",
      "  return fibonacci(n - 1) + fibonacci(n - 2);",
      "}",
      "",
      "console.log(fibonacci(10));",
      "~~~",
      "",
      "~~~python",
      "def greet(name: str) -> str:",
      "    return f'Hello, {name}!'",
      "",
      "print(greet('KoMoriSam'))",
      "~~~",
      "",
      "~~~diff",
      "- const enabled = false;",
      "+ const enabled = true;",
      "~~~",
      "",
      "~~~",
      "没有声明语言的纯文本代码块",
      "用于检查 fallback 与复制按钮。",
      "~~~",
    ].join("\n"),
  },
  {
    name: "提示与折叠",
    content: [
      "> [!NOTE] 普通说明 `Markdown 格式支持`",
      "> 静态说明块，支持 **Markdown** 与 `行内代码`。",
      "",
      "> [!TIP]+ 默认展开",
      "> 这是可以折叠的提示块。",
      ">",
      "> - 支持列表",
      "> - 支持多段内容",
      "",
      "> [!WARNING]- 默认折叠",
      "> 点击标题后才能看到这段警告内容。",
      "",
      "> [!CAUTION] 危险操作",
      "> 请确认 error 语义色、图标与正文对比度。",
      "",
      "> [!SUCCESS] 操作成功",
      "> success 类型的渲染效果。",
      "",
      "> [!QUOTE] 自定义引用",
      "> 用于区别普通 blockquote 与项目提示块。",
    ].join("\n"),
  },
  {
    name: "脚注与锚点",
    content: [
      "# 可跳转的测试标题",
      "",
      "标题右侧应生成无障碍锚点。[跳转到标题](#可跳转的测试标题)",
      "",
      "这是数字脚注[^1]，这是命名脚注[^note]。同一个脚注可以再次引用[^1]。",
      "",
      "脚注中可以包含 **粗体**、链接和多段内容。[^long]",
      "",
      "[^1]: 第一条脚注内容。",
      "[^note]: 命名脚注会按照出现顺序编号。",
      "[^long]: 第一段脚注，包含 [外部链接](https://example.com)。",
      "",
      "    第二段脚注，用于检查缩进和返回链接。",
    ].join("\n"),
  },
  {
    name: "数学公式",
    content: [
      "## 行内公式",
      "",
      "质能方程 $E = mc^2$ 应与正文基线对齐，勾股定理为 $a^2 + b^2 = c^2$。",
      "",
      "## 块级公式",
      "",
      "$$",
      "a^2 + b^2 = c^2",
      "$$",
      "",
      "$$",
      "f(x) = x^3 + 2x^2 - x + 1",
      "$$",
      "",
      "公式后的正文用于检查异步加载 KaTeX 时是否闪烁或丢失内容。",
    ].join("\n"),
  },
  {
    name: "原生 HTML",
    content: [
      "## HTML 混排",
      "",
      "<u>下划线文本</u>、<small>小号文本</small> 与 <del>删除文本</del>。",
      "",
      "<details>",
      "  <summary>点击展开原生 details</summary>",
      "  <p>这里包含 <strong>HTML 粗体</strong> 和 <code>HTML code</code>。</p>",
      "</details>",
      "",
      '<div title="悬停提示">带有 title 属性的块级 HTML。</div>',
      "",
      "HTML 后的 **Markdown 正文** 应继续正常解析。",
    ].join("\n"),
  },
  {
    name: "聊天记录",
    content: [
      "> [!chat] **李焰老师** · 在线",
      ">",
      "> > **Mori** 10:30 · 已送达",
      "> > 老师，这是包含 **粗体**、`代码` 和 [链接](https://example.com) 的消息。",
      ">",
      "> 对方已加入会话",
      ">",
      "> > **李焰老师** 10:31 · 已读 · 👍",
      "> > 收到，聊天气泡与状态徽章渲染正常。",
      "> >",
      "> > 第二行消息用于测试气泡内的多段内容。",
      "",
      "## 仅聊天消息（无 ChatBar）",
      "",
      "> > [!chat] **Mori** 10:30 · 已送达",
      "> > 康神开播了，真的假的😲",
    ].join("\n"),
  },
  {
    name: "空间动态",
    content: [
      "> [!moment] **Mori** · 2026-08-06 10:30 · 昆明",
      ">",
      "> 今天在测试自定义 **空间动态** 渲染，正文支持 `Markdown` 和 :tada:。",
      ">",
      "> ![动态配图](/assets/images/avatar/komorisam.webp)",
      ">",
      "> ❤️ 12 · 💬 2 · 🔁 3",
      ">",
      "> **评论**",
      "> - **李焰老师** 10:35：渲染效果不错。",
      ">   - **Mori** 回复 **李焰老师** 10:36：收到，谢谢！",
      "> - **小群主** 10:40：评论也支持 **行内格式**。",
    ].join("\n"),
  },
  {
    name: "边界情况",
    content: [
      "## 中英文与标点",
      "",
      "中文English混排，数字1234567890，全角标点：，。！？；：“”‘’（）【】——……",
      "",
      "超长连续文本用于检查换行：LooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooongWord",
      "",
      "特殊字符：& < > © ™，以及已经转义的 HTML：&lt;script&gt;alert('safe')&lt;/script&gt;。",
      "",
      "连续分隔线：",
      "",
      "---",
      "",
      "***",
      "",
      "空链接 [空目标]()、不存在的图片 ![替代文本](/assets/images/not-found.webp)。",
    ].join("\n"),
  },
];
const currentMd = ref("标题与段落");
const mdContent = computed(
  () => mdSamples.find((s) => s.name === currentMd.value)?.content || "",
);
const mdHeaderData = computed(() => ({
  title: `Markdown 渲染测试：${currentMd.value}`,
  uuid: "markdown-test",
  page: mdSamples.findIndex((sample) => sample.name === currentMd.value) + 1,
  meta: "",
  sourceType: "article",
}));

// ───────── NumberController ─────────
const ncFontSize = ref(24);
const ncFontGap = ref(0);
const ncLineHeight = ref(1.5);

// ───────── Pagination ─────────
const paginationCurrentPage = ref(12);
const paginationTotalPages = ref(24);

function setPaginationScenario(currentPage, totalPages) {
  paginationTotalPages.value = totalPages;
  paginationCurrentPage.value = currentPage;
}

// ───────── Loading ─────────
const loadingOn = ref(false);
let loadingTimer;

function toggleLoading() {
  loadingOn.value = true;
  loadingTimer = window.setTimeout(() => {
    loadingOn.value = false;
    toast.success("加载完成！");
  }, 3000);
}

onBeforeUnmount(() => {
  window.clearTimeout(loadingTimer);
});

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
