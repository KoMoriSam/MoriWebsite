<template>
  <main :class="['w-full min-w-0 max-w-full flex-1', pageClass]">
    <SideBar
      v-if="drawer"
      :drawer-id="drawerId"
      class="min-w-0 w-full max-w-full"
    >
      <template #content>
        <ReaderBody
          :container-class="containerClass"
          :grid-class="resolvedGridClass"
          :content-class="contentClass"
          :toc-class="tocClass"
          :aside-class="asideClass"
          :sticky-top="stickyTop"
          :show-toc="showToc"
          :show-aside="showAside"
        >
          <template #before><slot name="before" /></template>
          <template #mobile-toc>
            <MobileToc
              v-if="showToc"
              :title="tocTitle"
              :headings="headings"
              :active-id="activeHeadingId"
              :progress="readingProgress"
              @select="scrollToHeading"
            />
          </template>
          <template #toc>
            <ReaderToc
              v-if="showToc"
              :title="tocTitle"
              :headings="headings"
              :active-id="activeHeadingId"
              :progress="readingProgress"
              @select="scrollToHeading"
            />
          </template>
          <template #default><slot /></template>
          <template #aside><slot name="aside" /></template>
          <template #after><slot name="after" /></template>
        </ReaderBody>

        <slot name="floating" />
      </template>

      <template v-if="$slots.drawer" #aside>
        <slot name="drawer" />
      </template>
    </SideBar>

    <template v-else>
      <ReaderBody
        :container-class="containerClass"
        :grid-class="resolvedGridClass"
        :content-class="contentClass"
        :toc-class="tocClass"
        :aside-class="asideClass"
        :sticky-top="stickyTop"
        :show-toc="showToc"
        :show-aside="showAside"
      >
        <template #before><slot name="before" /></template>
        <template #mobile-toc>
          <MobileToc
            v-if="showToc"
            :title="tocTitle"
            :headings="headings"
            :active-id="activeHeadingId"
            :progress="readingProgress"
            @select="scrollToHeading"
          />
        </template>
        <template #toc>
          <ReaderToc
            v-if="showToc"
            :title="tocTitle"
            :headings="headings"
            :active-id="activeHeadingId"
            :progress="readingProgress"
            @select="scrollToHeading"
          />
        </template>
        <template #default><slot /></template>
        <template #aside><slot name="aside" /></template>
        <template #after><slot name="after" /></template>
      </ReaderBody>

      <slot name="floating" />
    </template>
  </main>
</template>

<script setup>
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";
import SideBar from "@/components/layout/SideBar.vue";

const props = defineProps({
  drawer: {
    type: Boolean,
    default: false,
  },
  drawerId: {
    type: String,
    default: "reader-sidebar",
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
const headings = ref([]);
const activeHeadingId = ref("");
const readingProgressValue = ref(0);
let mutationObserver;
let intersectionObserver;
let updateTimer;
let progressFrame = 0;

const showToc = computed(() => props.toc && headings.value.length > 0);

const showAside = computed(() => props.aside && Boolean(slots.aside));

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

const ReaderBody = defineComponent({
  props: {
    containerClass: { type: [String, Array, Object], default: "" },
    gridClass: { type: [String, Array, Object], default: "" },
    contentClass: { type: [String, Array, Object], default: "" },
    tocClass: { type: [String, Array, Object], default: "" },
    asideClass: { type: [String, Array, Object], default: "" },
    stickyTop: { type: String, default: "12rem" },
    showToc: { type: Boolean, default: false },
    showAside: { type: Boolean, default: false },
  },

  setup(bodyProps, { slots: bodySlots }) {
    const asideRef = ref(null);

    const asideMask = ref({
      top: false,
      bottom: false,
    });

    let observedAside = null;
    let resizeObserver = null;
    let asideMutationObserver = null;
    let maskFrame = 0;

    const resetAsideMask = () => {
      asideMask.value = {
        top: false,
        bottom: false,
      };
    };

    const updateAsideMask = () => {
      const el = observedAside;

      if (!el || !el.isConnected) {
        resetAsideMask();
        return;
      }

      const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);

      const hasOverflow = maxScrollTop > 1;
      const scrollTop = Math.max(0, el.scrollTop);

      const nextMask = {
        top: hasOverflow && scrollTop > 1,
        bottom: hasOverflow && scrollTop < maxScrollTop - 1,
      };

      // 避免每次 scroll 都创建无意义的响应式更新
      if (
        asideMask.value.top !== nextMask.top ||
        asideMask.value.bottom !== nextMask.bottom
      ) {
        asideMask.value = nextMask;
      }
    };

    const scheduleAsideMaskUpdate = () => {
      if (maskFrame || typeof window === "undefined") return;

      maskFrame = window.requestAnimationFrame(() => {
        maskFrame = 0;
        updateAsideMask();
      });
    };

    /**
     * aside 本身受到 max-height 限制后，内部内容继续变化时，
     * aside 的盒子尺寸不一定变化。
     *
     * 因此除了观察 aside，也观察它的直接子元素。
     * Giscus 外层容器高度变化时就能被捕获。
     */
    const syncResizeTargets = () => {
      const el = observedAside;

      if (!el || !resizeObserver) return;

      resizeObserver.disconnect();
      resizeObserver.observe(el);

      Array.from(el.children).forEach((child) => {
        resizeObserver.observe(child);
      });
    };

    const detachAside = (el = observedAside) => {
      if (el) {
        el.removeEventListener("scroll", scheduleAsideMaskUpdate);

        // 捕获模式必须保持一致
        el.removeEventListener("load", scheduleAsideMaskUpdate, true);
      }

      resizeObserver?.disconnect();
      asideMutationObserver?.disconnect();

      resizeObserver = null;
      asideMutationObserver = null;
      observedAside = null;

      resetAsideMask();
    };

    const attachAside = (el) => {
      if (!el) return;

      observedAside = el;

      el.addEventListener("scroll", scheduleAsideMaskUpdate, {
        passive: true,
      });

      /**
       * load 不冒泡，所以使用捕获阶段。
       * 可捕获 aside 内图片、iframe 等资源加载完成。
       */
      el.addEventListener("load", scheduleAsideMaskUpdate, true);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          scheduleAsideMaskUpdate();
        });

        syncResizeTargets();
      }

      if (typeof MutationObserver !== "undefined") {
        asideMutationObserver = new MutationObserver(() => {
          // 新增了根节点时，将其加入 ResizeObserver
          syncResizeTargets();
          scheduleAsideMaskUpdate();
        });

        asideMutationObserver.observe(el, {
          childList: true,
          subtree: true,

          // Giscus 可能通过修改 iframe style 更新高度
          attributes: true,
          attributeFilter: ["class", "style", "src"],

          characterData: true,
        });
      }

      scheduleAsideMaskUpdate();
    };

    /**
     * 关键修复：
     *
     * ArticleReader 首次渲染时 showAside=false，
     * asideRef 为 null；文章加载完成后 asideRef 才会出现。
     *
     * 监听 ref 后，无论 aside 何时挂载、替换或卸载，
     * 都能正确绑定和清理监听器。
     */
    watch(
      asideRef,
      (el, oldEl) => {
        if (oldEl) {
          detachAside(oldEl);
        }

        if (el) {
          attachAside(el);
        }
      },
      {
        flush: "post",
      },
    );

    onBeforeUnmount(() => {
      detachAside();

      if (maskFrame && typeof window !== "undefined") {
        window.cancelAnimationFrame(maskFrame);
        maskFrame = 0;
      }
    });

    const asideMaskImage = computed(() => {
      const { top, bottom } = asideMask.value;

      // 位于中间：上下都有渐隐
      if (top && bottom) {
        return [
          "linear-gradient(",
          "to bottom,",
          "transparent 0,",
          "black 2rem,",
          "black calc(100% - 2rem),",
          "transparent 100%",
          ")",
        ].join(" ");
      }

      // 已滚到底部：只有顶部渐隐
      if (top) {
        return [
          "linear-gradient(",
          "to bottom,",
          "transparent 0,",
          "black 2rem,",
          "black 100%",
          ")",
        ].join(" ");
      }

      // 位于顶部：只有底部渐隐
      if (bottom) {
        return [
          "linear-gradient(",
          "to bottom,",
          "black 0,",
          "black calc(100% - 2rem),",
          "transparent 100%",
          ")",
        ].join(" ");
      }

      // 内容没有溢出
      return "none";
    });

    return () =>
      h(
        "div",
        {
          class: ["min-w-0 w-full max-w-full", bodyProps.containerClass],
        },
        [
          bodySlots.before?.(),

          bodyProps.showToc
            ? h(
                "div",
                {
                  class: "sticky top-2 z-10 mb-4 xl:hidden",
                },
                bodySlots["mobile-toc"]?.(),
              )
            : null,

          h(
            "div",
            {
              class: [
                "grid min-w-0 w-full max-w-full grid-cols-1 items-start",
                bodyProps.gridClass,
              ],
            },
            [
              bodyProps.showToc
                ? h(
                    "aside",
                    {
                      class: [
                        "hidden min-w-0 w-full max-w-full xl:sticky xl:block xl:self-start",
                        bodyProps.tocClass,
                      ],
                      style: {
                        top: bodyProps.stickyTop,
                        height: `calc(90dvh - ${bodyProps.stickyTop})`,
                      },
                    },
                    bodySlots.toc?.(),
                  )
                : null,

              h(
                "section",
                {
                  "data-reader-content": readerId,
                  class: [
                    "min-w-0 w-full max-w-full",

                    bodyProps.showAside &&
                      "border-b border-base-300 pb-8 xl:border-r xl:border-b-0 xl:pr-8 xl:pb-0",

                    bodyProps.showToc &&
                      "xl:border-l xl:border-base-300 xl:pl-8",

                    bodyProps.contentClass,
                  ],
                },
                bodySlots.default?.(),
              ),

              bodyProps.showAside
                ? h(
                    "aside",
                    {
                      ref: asideRef,

                      class: [
                        "lg:sticky lg:self-start",
                        "max-h-[unset] lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto",
                        "scrollbar-none",
                        bodyProps.asideClass,
                      ],

                      style: {
                        top: bodyProps.stickyTop,

                        // 标准属性
                        maskImage: asideMaskImage.value,

                        // Safari 兼容
                        WebkitMaskImage: asideMaskImage.value,
                      },
                    },
                    bodySlots.aside?.(),
                  )
                : null,
            ],
          ),

          bodySlots.after?.(),
        ],
      );
  },
});

const tocList = (
  tocProps,
  emit,
  closeAfterSelect = false,
  listClass = "max-h-[min(55vh,32rem)] space-y-0.5 overflow-y-auto overscroll-contain pr-1 scrollbar-thin",
) =>
  h(
    "ol",
    {
      class: listClass,
    },
    tocProps.headings.map((heading) =>
      h("li", { key: heading.id }, [
        h(
          "button",
          {
            type: "button",
            title: heading.text,
            class: [
              "block w-full rounded-lg py-1.5 pr-2 text-left text-sm leading-snug transition-colors",
              heading.level === 1 ? "pl-2 font-bold" : "",
              heading.level === 2 ? "pl-4 font-medium" : "",
              heading.level === 3 ? "pl-6 text-xs" : "",
              heading.level >= 4 ? "pl-8 font-light text-xs" : "",
              heading.id === tocProps.activeId
                ? "border-primary bg-primary/10 text-primary font-black!"
                : "border-transparent text-base-content/60 hover:bg-base-200 hover:text-base-content",
            ],
            onClick: () => emit("select", heading.id, closeAfterSelect),
          },
          heading.text,
        ),
      ]),
    ),
  );

const ReaderToc = defineComponent({
  props: {
    title: { type: String, default: "阅读进度" },
    headings: { type: Array, default: () => [] },
    activeId: { type: String, default: "" },
    progress: { type: Number, default: 0 },
  },
  emits: ["select"],
  setup(tocProps, { emit }) {
    const progressValue = computed(() =>
      Math.min(100, Math.max(0, Math.round(tocProps.progress || 0))),
    );

    return () =>
      h(
        "nav",
        {
          class:
            "not-prose min-w-0 w-full max-w-full h-full min-h-0 flex flex-col",
          "aria-label": tocProps.title,
        },
        [
          h("div", { class: "mb-3" }, [
            h("div", { class: "flex items-center justify-between gap-2" }, [
              h("div", { class: "flex items-center gap-2" }, [
                h("i", {
                  class: "ri-list-unordered shrink-0 text-lg text-primary",
                }),
                h("h2", { class: "text-base font-bold" }, tocProps.title),
              ]),
              h("span", { class: "text-xs font-semibold text-primary" }, [
                `${progressValue.value}%`,
              ]),
            ]),
            h(
              "div",
              { class: "mt-2 h-1.5 w-full rounded-full bg-base-300/70" },
              [
                h("div", {
                  class:
                    "h-full rounded-full bg-primary transition-all duration-300 ease-out",
                  style: { width: `${progressValue.value}%` },
                }),
              ],
            ),
          ]),
          tocList(
            tocProps,
            (event, id) => emit(event, id),
            false,
            "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1 scrollbar-thin",
          ),
        ],
      );
  },
});

const MobileToc = defineComponent({
  props: {
    title: { type: String, default: "阅读进度" },
    headings: { type: Array, default: () => [] },
    activeId: { type: String, default: "" },
    progress: { type: Number, default: 0 },
  },
  emits: ["select"],
  setup(tocProps, { emit }) {
    const expanded = ref(false);
    const activeText = computed(
      () =>
        tocProps.headings.find((heading) => heading.id === tocProps.activeId)
          ?.text,
    );
    const progressValue = computed(() =>
      Math.min(100, Math.max(0, Math.round(tocProps.progress || 0))),
    );

    const select = (event, id) => {
      emit(event, id);
      expanded.value = false;
    };

    return () =>
      h("div", { class: "not-prose relative" }, [
        h(
          "div",
          {
            class:
              "rounded-box border border-base-300/90 bg-base-100/96 p-2 backdrop-blur-md supports-[backdrop-filter]:bg-base-100/88",
          },
          [
            h(
              "button",
              {
                type: "button",
                class:
                  "flex h-auto min-h-6 w-full min-w-0 flex-nowrap items-center justify-start gap-2 rounded-box text-left transition-colors hover:bg-base-200/80",
                "aria-expanded": expanded.value,
                onClick: () => (expanded.value = !expanded.value),
              },
              [
                h("i", {
                  class: "ri-list-unordered shrink-0 text-lg text-primary",
                }),
                h("span", { class: "shrink-0 font-bold" }, tocProps.title),
                h(
                  "span",
                  { class: "shrink-0 text-xs font-semibold text-primary" },
                  [`${progressValue.value}%`],
                ),
                activeText.value
                  ? h(
                      "span",
                      {
                        class:
                          "min-w-0 flex-1 truncate text-left text-sm font-medium text-base-content/80",
                      },
                      activeText.value,
                    )
                  : null,
                h("i", {
                  class: [
                    "ri-arrow-down-s-line ml-auto shrink-0 transition-transform",
                    expanded.value && "rotate-180",
                  ],
                }),
              ],
            ),
            h(
              "div",
              {
                class:
                  "my-1 h-1.5 w-full rounded-full bg-base-300/85 ring-1 ring-base-300/70",
              },
              [
                h("div", {
                  class:
                    "h-full rounded-full bg-primary transition-all duration-300 ease-out",
                  style: { width: `${progressValue.value}%` },
                }),
              ],
            ),
          ],
        ),
        expanded.value
          ? h(
              "div",
              {
                class:
                  "absolute inset-x-0 top-full z-30 mt-2 rounded-box border border-base-300 bg-base-100/98 p-3 shadow-xl backdrop-blur-md",
              },
              tocList(tocProps, select, true),
            )
          : null,
      ]);
  },
});
</script>
