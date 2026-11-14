<template>
  <component
    :is="rootTag"
    ref="layoutElement"
    v-bind="$attrs"
    :class="['w-full min-w-0 max-w-full flex-1', scrollWithin && '@container/reader', pageClass]"
    :style="pageStyle"
    :data-theme="pageTheme || undefined"
  >
    <slot name="before" />

    <ContentGrid
      :container-class="containerClass"
      :grid-class="resolvedGridClass"
      :content-class="contentClass"
      :toc-class="tocClass"
      :aside-class="asideClass"
      :sticky-top="stickyTop"
      :scroll-container="scrollContainer"
      :show-toc="showToc"
      :show-aside="showAside"
      @content-ready="handleContentReady"
    >
      <template #mobile-toc="{ compact, expand, toggle, setMenuOpen }">
        <slot
          name="mobile-toc"
          :progress="readingProgress"
          :compact="compact"
          :expand="expand"
          :toggle="toggle"
          :setMenuOpen="setMenuOpen"
        >
          <Toc
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
          <Toc
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
    </ContentGrid>

    <slot name="after" />
    <slot name="floating" />
  </component>

  <dialog
    v-if="$slots['format-setting']"
    ref="formatSettingDialogRef"
    class="modal modal-bottom lg:modal-start"
    @cancel.prevent="requestPlatformCloseFormatSetting"
  >
    <div
      class="modal-box flex h-full w-full max-w-2xl flex-col overflow-hidden p-0 max-lg:mx-auto lg:w-96"
    >
      <slot name="format-setting" />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button
        :aria-label="translate('reader.settings.close')"
        @click.prevent="requestCloseFormatSetting"
      >
        {{ translate('reader.settings.close') }}
      </button>
    </form>
  </dialog>

  <Footer v-if="showFooter" class="max-lg:hidden" />
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import "@/assets/font/reader-fonts.css";
import { useEventListener, useResizeObserver } from "@vueuse/core";

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";
import ContentGrid from "@/components/reader/layout/ContentGrid.vue";
import { getNavbarScrollOffset } from "@/utils/layout/navbar";
import { READER_PAGE_CLASS, READER_GRID_CLASS } from '@/constants/reader-layout';
import Toc from "@/components/reader/navigation/Toc.vue";
import Footer from "@/components/layout/Footer.vue";
import { useModalClose } from "@/composables/useModal";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  rootTag: {
    type: String,
    default: "main",
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
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
    // 全局 #markdown 选择器命中旧节点。
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
    default: READER_PAGE_CLASS,
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
  scrollWithin: {
    type: Boolean,
    default: false,
  },
  stickyTop: {
    type: String,
    default: "2rem",
  },
});

const slots = useSlots();
const layoutElement = ref(null);
const scrollContainer = computed(() => props.scrollWithin ? layoutElement.value : null);
const contentElement = ref(null);
const formatSettingDialogRef = ref(null);
const headings = ref([]);
const activeHeadingId = ref("");
const readingProgressValue = ref(0);
let mutationObserver;
let intersectionObserver;
let updateTimer;
let pendingHeadingId = "";
let pendingHeadingTimer;
let progressFrame = 0;

const closeFormatSettingImmediately = () => {
  if (formatSettingDialogRef.value?.open) {
    formatSettingDialogRef.value.close();
  }
};
const formatSettingModal = useModalClose({
  onClose: closeFormatSettingImmediately,
});

const showToc = computed(() => props.toc);

const showAside = computed(
  () => props.aside && Boolean(slots.aside),
);

const readingProgress = computed(() => readingProgressValue.value);
const tocScrollOffset = () =>
  scrollContainer.value?.getBoundingClientRect().top ?? getNavbarScrollOffset();

const resolvedGridClass = computed(() => {
  if (props.gridClass) return props.gridClass;

  if (showToc.value && showAside.value) {
    return READER_GRID_CLASS;
  }

  if (showToc.value) {
    if (props.scrollWithin) {
      return "gap-y-8 @min-[48rem]/reader:grid-cols-[12rem_minmax(0,1fr)] @min-[48rem]/reader:gap-x-4";
    }
    return "gap-y-8 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-8 2xl:grid-cols-[17rem_minmax(0,1fr)]";
  }

  if (showAside.value) {
    return "gap-y-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-8 2xl:grid-cols-[minmax(0,1fr)_22rem]";
  }

  return "";
});

const getHeadingText = (element, index) => {
  const heading = element.cloneNode(true);
  heading
    .querySelectorAll(".comment-trigger, .header-anchor")
    .forEach((trigger) => trigger.remove());

  return heading.textContent?.trim() || translate('reader.settings.heading', { p0: index + 1 });
};

const getHeadingId = (element) => element.dataset.readerHeadingId || element.id;

const createHeadingId = (element, index, text) => {
  if (getHeadingId(element)) return getHeadingId(element);

  const base =
    text
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

  const container = scrollContainer.value;
  const scrollOffset = container ? 0 : getNavbarScrollOffset();
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (pendingHeadingId) {
        activeHeadingId.value = pendingHeadingId;
        return;
      }

      if (visible.length) {
        activeHeadingId.value = getHeadingId(visible[0].target);
        return;
      }

      const passed = elements.filter(
        (element) => element.getBoundingClientRect().top < tocScrollOffset() + 24,
      );
      activeHeadingId.value = getHeadingId(passed.at(-1) || elements[0]);
    },
    {
      root: container,
      rootMargin: `-${scrollOffset}px 0px -70% 0px`,
      threshold: [0, 1],
    },
  );

  elements.forEach((element) => intersectionObserver.observe(element));
  activeHeadingId.value = pendingHeadingId || getHeadingId(elements[0]);
};

const updateReadingProgress = () => {
  const element = contentElement.value;
  if (!element) {
    readingProgressValue.value = 0;
    return;
  }

  const container = scrollContainer.value;
  const rect = element.getBoundingClientRect();
  const viewportHeight = container?.clientHeight ?? window.innerHeight;
  const contentHeight = container?.scrollHeight ?? element.scrollHeight;
  const maxScrollable = Math.max(contentHeight - viewportHeight, 0);

  if (maxScrollable === 0) {
    const isVisible = container ? viewportHeight > 0 : rect.bottom > 0 && rect.top < viewportHeight;
    readingProgressValue.value = isVisible ? 100 : 0;
    return;
  }

  const scrolled = container?.scrollTop ?? -rect.top;
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

  headings.value = elements.map((element, index) => {
    const text = getHeadingText(element, index);

    return {
      id: createHeadingId(element, index, text),
      text,
      level: Number(element.tagName.slice(1)),
    };
  });

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

  pendingHeadingId = id;
  activeHeadingId.value = id;
  window.clearTimeout(pendingHeadingTimer);
  const container = scrollContainer.value;
  if (!("onscrollend" in (container || window))) {
    pendingHeadingTimer = window.setTimeout(() => {
      pendingHeadingId = "";
    }, 2000);
  }

  if (container) {
    const mobileTocHeight = container.querySelector("[data-reader-mobile-toc]")?.offsetHeight ?? 0;
    container.scrollBy({
      top: element.getBoundingClientRect().top - tocScrollOffset() - (mobileTocHeight ? mobileTocHeight + 8 : 0),
      behavior: "smooth",
    });
  } else {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.history.replaceState(window.history.state, "", `#${id}`);
};

const handleScrollEnd = () => {
  if (!pendingHeadingId) return;

  pendingHeadingId = "";
  window.clearTimeout(pendingHeadingTimer);
};

const handleContentReady = async (element) => {
  mutationObserver?.disconnect();
  contentElement.value = element || null;

  await nextTick();
  collectHeadings();
  scheduleProgressUpdate();

  if (contentElement.value) {
    mutationObserver = new MutationObserver(scheduleCollectHeadings);
    mutationObserver.observe(contentElement.value, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
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

const scrollTarget = computed(() =>
  scrollContainer.value || (typeof window !== "undefined" ? window : null),
);
useEventListener(scrollTarget, "scroll", scheduleProgressUpdate, { passive: true });
useEventListener(scrollTarget, "scrollend", handleScrollEnd);
useResizeObserver(
  computed(() => props.scrollWithin ? contentElement.value : null),
  scheduleProgressUpdate,
);
onMounted(() => {
  scheduleProgressUpdate();
  window.addEventListener("resize", scheduleProgressUpdate);
});

watch(
  () => [props.toc, props.tocSelector, props.tocMinLevel, props.tocMaxLevel, scrollContainer.value],
  () => nextTick(collectHeadings),
);

onBeforeUnmount(() => {
  mutationObserver?.disconnect();
  intersectionObserver?.disconnect();
  window.clearTimeout(updateTimer);
  window.clearTimeout(pendingHeadingTimer);
  window.removeEventListener("resize", scheduleProgressUpdate);
  if (progressFrame) {
    window.cancelAnimationFrame(progressFrame);
  }
});

defineExpose({ layoutElement, openFormatSetting });
</script>
