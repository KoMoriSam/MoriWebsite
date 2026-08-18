<template>
  <main
    :class="['w-full min-w-0 max-w-full flex-1', pageClass]"
    :style="pageStyle"
    :data-theme="pageTheme || undefined"
  >
    <ReaderBody
      :container-class="containerClass"
      :grid-class="resolvedGridClass"
      :content-class="contentClass"
      :toc-class="tocClass"
      :aside-class="asideClass"
      :sticky-top="stickyTop"
      :show-toc="showToc"
      :show-aside="showAside"
      :reader-id="readerId"
    >
      <template #before><slot name="before" /></template>
      <template #mobile-toc="{ compact, expand, toggle, setMenuOpen }">
        <slot
          name="mobile-toc"
          :progress="readingProgress"
          :compact="compact"
          :expand="expand"
          :toggle="toggle"
          :setMenuOpen="setMenuOpen"
        >
          <ReaderToc
            v-if="showToc"
            mobile
            :compact="compact"
            :title="tocTitle"
            :headings="headings"
            :active-id="activeHeadingId"
            :progress="readingProgress"
            @select="scrollToHeading"
            @toggle-compact="toggle"
            @menu-open-change="setMenuOpen"
          />
        </slot>
      </template>
      <template #toc>
        <slot name="toc" :progress="readingProgress">
          <ReaderToc
            v-if="showToc"
            :title="tocTitle"
            :headings="headings"
            :active-id="activeHeadingId"
            :progress="readingProgress"
            @select="scrollToHeading"
          />
        </slot>
      </template>
      <template #default><slot /></template>
      <template #aside><slot name="aside" /></template>
      <template #after><slot name="after" /></template>
    </ReaderBody>

    <slot name="floating" />
  </main>

  <dialog
    v-if="$slots['format-setting']"
    ref="formatSettingDialogRef"
    class="modal modal-bottom lg:modal-start"
    @cancel.prevent="requestPlatformCloseFormatSetting"
  >
    <section
      class="modal-box flex h-full w-full lg:w-96 max-w-2xl flex-col overflow-hidden p-0 max-lg:mx-auto"
    >
      <slot name="format-setting" />
    </section>
    <form method="dialog" class="modal-backdrop">
      <button
        aria-label="关闭阅读排版设置"
        @click.prevent="requestCloseFormatSetting"
      >
        关闭阅读排版设置
      </button>
    </form>
  </dialog>

  <FootBar class="max-lg:hidden" />
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";
import ReaderBody from "@/components/reader/ReaderBody.vue";
import ReaderToc from "@/components/reader/ReaderToc.vue";
import FootBar from "@/components/layout/FootBar.vue";
import { useModalClose } from "@/composables/useModal";

const props = defineProps({
  toc: {
    type: Boolean,
    default: false,
  },
  tocTitle: {
    type: String,
    default: "阅读进度",
  },
  tocSelector: {
    type: String,
    // 始终相对当前 Reader 的正文容器查询，避免多个阅读器或页面切换时
    // 全局 #markdown-content 选择器命中旧节点。
    default: "h1, h2, h3, h4",
  },
  aside: {
    type: Boolean,
    default: true,
  },
  tocMinLevel: {
    type: Number,
    default: 1,
  },
  tocMaxLevel: {
    type: Number,
    default: 4,
  },
  pageClass: {
    type: [String, Array, Object],
    default: "mx-auto max-w-7xl px-6 sm:px-8 lg:px-10",
  },
  pageStyle: {
    type: [String, Array, Object],
    default: undefined,
  },
  pageTheme: {
    type: String,
    default: "",
  },
  containerClass: {
    type: [String, Array, Object],
    default: "py-6",
  },
  gridClass: {
    type: [String, Array, Object],
    default: "",
  },
  contentClass: {
    type: [String, Array, Object],
    default: "",
  },
  tocClass: {
    type: [String, Array, Object],
    default: "",
  },
  asideClass: {
    type: [String, Array, Object],
    default: "",
  },
  stickyTop: {
    type: String,
    default: "2rem",
  },
});

const slots = useSlots();
const contentElement = ref(null);
const formatSettingDialogRef = ref(null);
const headings = ref([]);
const activeHeadingId = ref("");
const readingProgressValue = ref(0);
let mutationObserver;
let intersectionObserver;
let updateTimer;
let progressFrame = 0;

const closeFormatSettingImmediately = () => {
  if (formatSettingDialogRef.value?.open) {
    formatSettingDialogRef.value.close();
  }
};
const formatSettingModal = useModalClose({
  onClose: closeFormatSettingImmediately,
});

const showToc = computed(
  () =>
    // SSR 预渲染阶段保留左栏空位作为宽屏下的左边距
    (typeof window === "undefined" && props.toc) ||
    (props.toc &&
      (headings.value.length > 0 ||
        Boolean(slots.toc) ||
        Boolean(slots["mobile-toc"]))),
);

const showAside = computed(
  () =>
    // SSR 预渲染阶段保留右栏空位作为宽屏下的右边距
    (typeof window === "undefined" && props.aside) ||
    (props.aside && Boolean(slots.aside)),
);

const readingProgress = computed(() => readingProgressValue.value);

const resolvedGridClass = computed(() => {
  if (props.gridClass) return props.gridClass;

  if (showToc.value && showAside.value) {
    return "gap-y-8 xl:grid-cols-[15rem_minmax(0,1fr)_20rem] xl:gap-x-8 2xl:grid-cols-[17rem_minmax(0,1fr)_22rem]";
  }

  if (showToc.value) {
    return "gap-y-8 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-8 2xl:grid-cols-[17rem_minmax(0,1fr)]";
  }

  if (showAside.value) {
    return "gap-y-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-8 2xl:grid-cols-[minmax(0,1fr)_22rem]";
  }

  return "";
});

const createHeadingId = (element, index) => {
  if (element.id) return element.id;

  const base =
    element.textContent
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}\-_]/gu, "") || `heading-${index + 1}`;

  let id = base;
  let suffix = 2;
  while (document.getElementById(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  element.id = id;
  return id;
};

const observeHeadings = (elements) => {
  intersectionObserver?.disconnect();

  if (!elements.length) {
    activeHeadingId.value = "";
    return;
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length) {
        activeHeadingId.value = visible[0].target.id;
        return;
      }

      const passed = elements.filter(
        (element) => element.getBoundingClientRect().top < 120,
      );
      activeHeadingId.value = passed.at(-1)?.id || elements[0].id;
    },
    {
      rootMargin: "-96px 0px -70% 0px",
      threshold: [0, 1],
    },
  );

  elements.forEach((element) => intersectionObserver.observe(element));
  activeHeadingId.value = elements[0].id;
};

const updateReadingProgress = () => {
  const element = contentElement.value;
  if (!element) {
    readingProgressValue.value = 0;
    return;
  }

  const rect = element.getBoundingClientRect();
  const contentTop = window.scrollY + rect.top;
  const contentHeight = element.scrollHeight;
  const viewportHeight = window.innerHeight;
  const maxScrollable = Math.max(contentHeight - viewportHeight, 0);

  if (maxScrollable === 0) {
    const isVisible = rect.bottom > 0 && rect.top < viewportHeight;
    readingProgressValue.value = isVisible ? 100 : 0;
    return;
  }

  const scrolled = window.scrollY - contentTop;
  const progress = Math.round((Math.max(0, scrolled) / maxScrollable) * 100);
  readingProgressValue.value = Math.min(100, Math.max(0, progress));
};

const scheduleProgressUpdate = () => {
  if (progressFrame) return;

  progressFrame = window.requestAnimationFrame(() => {
    progressFrame = 0;
    updateReadingProgress();
  });
};

const collectHeadings = () => {
  if (!props.toc || !contentElement.value) {
    headings.value = [];
    scheduleProgressUpdate();
    return;
  }

  const elements = Array.from(
    contentElement.value.querySelectorAll(props.tocSelector),
  ).filter((element) => {
    const level = Number(element.tagName.slice(1));
    return level >= props.tocMinLevel && level <= props.tocMaxLevel;
  });

  headings.value = elements.map((element, index) => ({
    id: createHeadingId(element, index),
    text: element.textContent?.trim() || `标题 ${index + 1}`,
    level: Number(element.tagName.slice(1)),
  }));

  observeHeadings(elements);
  scheduleProgressUpdate();
};

const scheduleCollectHeadings = () => {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(collectHeadings, 60);
};

const scrollToHeading = (id) => {
  const element = contentElement.value?.querySelector(`#${CSS.escape(id)}`);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  activeHeadingId.value = id;
  window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
};

const openFormatSetting = () => {
  const dialog = formatSettingDialogRef.value;
  if (!dialog || dialog.open) return;

  formatSettingModal.activate();
  dialog.showModal();
};

const requestCloseFormatSetting = () => formatSettingModal.requestClose();
const requestPlatformCloseFormatSetting = () =>
  formatSettingModal.requestPlatformClose();

onMounted(async () => {
  await nextTick();
  contentElement.value = document.querySelector(
    `[data-reader-content="${readerId}"]`,
  );
  collectHeadings();
  scheduleProgressUpdate();

  window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  window.addEventListener("resize", scheduleProgressUpdate);

  if (contentElement.value) {
    mutationObserver = new MutationObserver(scheduleCollectHeadings);
    mutationObserver.observe(contentElement.value, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
});

watch(
  () => [props.toc, props.tocSelector, props.tocMinLevel, props.tocMaxLevel],
  () => nextTick(collectHeadings),
);

onBeforeUnmount(() => {
  mutationObserver?.disconnect();
  intersectionObserver?.disconnect();
  window.clearTimeout(updateTimer);
  window.removeEventListener("scroll", scheduleProgressUpdate);
  window.removeEventListener("resize", scheduleProgressUpdate);
  if (progressFrame) {
    window.cancelAnimationFrame(progressFrame);
  }
});

const readerId = `reader-${Math.random().toString(36).slice(2, 10)}`;

defineExpose({ openFormatSetting });
</script>
