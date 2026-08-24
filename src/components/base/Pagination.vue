<template>
  <nav
    ref="paginationRef"
    class="relative flex w-full min-w-0 justify-center px-1 sm:px-2 mt-4"
  >
    <!-- 分页按钮组 -->
    <section class="join max-w-full">
      <!-- 上一页 -->
      <RouterLink
        v-if="getPageRoute && currentPage > 1"
        :to="resolvePageRoute(currentPage - 1)"
        custom
        v-slot="{ href }"
      >
        <a
          :href="href"
          class="btn join-item min-w-9 px-1 min-h-10 h-10 sm:min-w-10"
          aria-label="上一页"
          @click="requestLinkedPage(currentPage - 1, $event)"
        >
          <i class="ri-arrow-left-s-line text-lg"></i>
        </a>
      </RouterLink>

      <button
        v-else
        type="button"
        class="btn join-item min-w-9 px-1 min-h-10 h-10 sm:min-w-10"
        :disabled="currentPage <= 1 && !canNavigateBefore"
        :aria-label="
          currentPage <= 1 && canNavigateBefore ? beforeBoundaryLabel : '上一页'
        "
        @click="requestPrevious"
      >
        <i class="ri-arrow-left-s-line text-lg"></i>
      </button>

      <!-- 移动端中间按钮 -->
      <button
        v-if="isCompactLayout"
        type="button"
        class="btn join-item h-10 min-h-10 min-w-0 max-w-[calc(100vw-7rem)] gap-1 overflow-hidden px-2 text-xs sm:max-w-48 sm:px-3 sm:text-sm"
        :class="{ 'btn-active': isPageMenuOpen }"
        :aria-expanded="isPageMenuOpen"
        aria-haspopup="dialog"
        @click="togglePageMenu"
      >
        <span class="truncate">
          <span class="hidden xs:inline">第 </span>
          <span class="font-semibold">{{ currentPage }}</span>
          <span class="hidden xs:inline"> 页</span>

          <span class="mx-1 opacity-40">/</span>

          <span class="opacity-70">
            <span class="hidden xs:inline">共 </span>
            {{ totalPages }}
            <span class="hidden xs:inline"> 页</span>
          </span>
        </span>

        <i
          class="ri-arrow-up-s-line shrink-0 text-base transition-transform duration-200"
          :class="{ 'rotate-180': !isPageMenuOpen }"
        ></i>
      </button>

      <!-- 桌面端页码 -->
      <template v-if="!isCompactLayout">
        <template v-for="item in visiblePages" :key="item.key">
          <RouterLink
            v-if="item.type === 'page' && getPageRoute"
            :to="resolvePageRoute(item.page)"
            custom
            v-slot="{ href }"
          >
            <a
              :href="href"
              class="btn join-item min-w-10 px-3"
              :class="{ 'btn-primary': item.page === currentPage }"
              :aria-current="item.page === currentPage ? 'page' : undefined"
              @click="requestLinkedPage(item.page, $event)"
            >
              {{ item.page }}
            </a>
          </RouterLink>

          <button
            v-else-if="item.type === 'page'"
            type="button"
            class="btn join-item min-w-10 px-3"
            :class="{ 'btn-primary': item.page === currentPage }"
            :aria-current="item.page === currentPage ? 'page' : undefined"
            @click="requestPage(item.page)"
          >
            {{ item.page }}
          </button>

          <button
            v-else
            type="button"
            class="btn join-item min-w-10 cursor-default px-1"
            disabled
          >
            …
          </button>
        </template>
      </template>

      <!-- 下一页 -->
      <RouterLink
        v-if="getPageRoute && currentPage < totalPages"
        :to="resolvePageRoute(currentPage + 1)"
        custom
        v-slot="{ href }"
      >
        <a
          :href="href"
          class="btn join-item min-w-9 px-1 min-h-10 h-10 sm:min-w-10"
          aria-label="下一页"
          @click="requestLinkedPage(currentPage + 1, $event)"
        >
          <i class="ri-arrow-right-s-line text-lg"></i>
        </a>
      </RouterLink>

      <button
        v-else
        type="button"
        class="btn join-item min-w-9 px-1 min-h-10 h-10 sm:min-w-10"
        :disabled="currentPage >= totalPages && !canNavigateAfter"
        :aria-label="
          currentPage >= totalPages && canNavigateAfter
            ? afterBoundaryLabel
            : '下一页'
        "
        @click="requestNext"
      >
        <i class="ri-arrow-right-s-line text-lg"></i>
      </button>
    </section>

    <!-- 移动端页码弹窗 -->
    <Modal
      v-if="isCompactLayout && isPageMenuOpen"
      :visible="true"
      button-mode="close"
      title="选择页码"
      @close="closePageMenu"
    >
      <template #title>
        <h3 class="text-lg font-bold">选择页码</h3>
        <p class="mt-1 text-sm font-normal text-base-content/60">
          当前第
          <span class="font-medium text-base-content">{{ currentPage }}</span>
          页，共
          <span class="font-medium text-base-content">{{ totalPages }}</span>
          页
        </p>
      </template>

      <template #description>
        <!-- 页码列表 -->
        <div
          ref="pageListRef"
          class="grid max-h-[min(24rem,calc(100dvh-15rem))] grid-cols-4 gap-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-thin min-[390px]:grid-cols-5 sm:grid-cols-6 sm:gap-3"
        >
          <template v-for="page in totalPages" :key="page">
            <RouterLink
              v-if="getPageRoute"
              :to="resolvePageRoute(page)"
              custom
              v-slot="{ href }"
            >
              <a
                :href="href"
                class="btn h-11 min-h-11 min-w-0 px-2 text-sm"
                :class="
                  page === currentPage
                    ? 'btn-primary'
                    : 'btn-ghost bg-base-200/70 hover:bg-base-300'
                "
                :aria-current="page === currentPage ? 'page' : undefined"
                @click="selectLinkedPage(page, $event)"
              >
                {{ page }}
              </a>
            </RouterLink>

            <button
              v-else
              type="button"
              class="btn h-11 min-h-11 min-w-0 px-2 text-sm"
              :class="
                page === currentPage
                  ? 'btn-primary'
                  : 'btn-ghost bg-base-200/70 hover:bg-base-300'
              "
              :aria-current="page === currentPage ? 'page' : undefined"
              @click="selectPage(page)"
            >
              {{ page }}
            </button>
          </template>
        </div>

        <!-- 底部快捷操作 -->
        <footer
          class="mt-4 grid grid-cols-2 gap-3 border-t border-base-300 pt-4"
        >
          <RouterLink
            v-if="getPageRoute && currentPage > 1"
            :to="resolvePageRoute(1)"
            custom
            v-slot="{ href }"
          >
            <a
              :href="href"
              class="btn min-w-0 gap-2"
              @click="selectLinkedPage(1, $event)"
            >
              <i class="ri-skip-left-line shrink-0"></i>
              <span>第一页</span>
            </a>
          </RouterLink>

          <button
            v-else
            type="button"
            class="btn min-w-0 gap-2"
            :disabled="currentPage <= 1"
            @click="selectPage(1)"
          >
            <i class="ri-skip-left-line shrink-0"></i>
            <span>第一页</span>
          </button>

          <RouterLink
            v-if="getPageRoute && currentPage < totalPages"
            :to="resolvePageRoute(totalPages)"
            custom
            v-slot="{ href }"
          >
            <a
              :href="href"
              class="btn min-w-0 gap-2"
              @click="selectLinkedPage(totalPages, $event)"
            >
              <span>最后一页</span>
              <i class="ri-skip-right-line shrink-0"></i>
            </a>
          </RouterLink>

          <button
            v-else
            type="button"
            class="btn min-w-0 gap-2"
            :disabled="currentPage >= totalPages"
            @click="selectPage(totalPages)"
          >
            <span>最后一页</span>
            <i class="ri-skip-right-line shrink-0"></i>
          </button>
        </footer>
      </template>
    </Modal>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Modal from "@/components/ui/Modal.vue";

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
    validator: (value) => Number.isInteger(value) && value >= 1,
  },
  totalPages: {
    type: Number,
    required: true,
    validator: (value) => Number.isInteger(value) && value >= 1,
  },
  canNavigateBefore: {
    type: Boolean,
    default: false,
  },
  canNavigateAfter: {
    type: Boolean,
    default: false,
  },
  beforeBoundaryLabel: {
    type: String,
    default: "上一项",
  },
  afterBoundaryLabel: {
    type: String,
    default: "下一项",
  },
  getPageRoute: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits([
  "update:currentPage",
  "change",
  "navigate-before",
  "navigate-after",
]);

const paginationRef = ref(null);
const pageListRef = ref(null);
const isPageMenuOpen = ref(false);
const isCompactLayout = ref(true);
const maxVisibleItems = ref(7);
const COMPACT_LAYOUT_BREAKPOINT = 640;
const NINE_ITEM_BREAKPOINT = 880;
const ELEVEN_ITEM_BREAKPOINT = 1100;

let resizeObserver;

const updatePaginationLayout = (width) => {
  const shouldUseCompactLayout = width < COMPACT_LAYOUT_BREAKPOINT;

  if (!shouldUseCompactLayout && isPageMenuOpen.value) {
    isPageMenuOpen.value = false;
  }

  isCompactLayout.value = shouldUseCompactLayout;

  if (width < NINE_ITEM_BREAKPOINT) {
    maxVisibleItems.value = 7;
  } else if (width < ELEVEN_ITEM_BREAKPOINT) {
    maxVisibleItems.value = 9;
  } else {
    maxVisibleItems.value = 11;
  }
};

const scrollToCurrentPage = async () => {
  await nextTick();

  const pageList = pageListRef.value;
  const currentButton = pageList?.querySelector('[aria-current="page"]');

  if (!pageList || !currentButton) return;

  const listRect = pageList.getBoundingClientRect();
  const buttonRect = currentButton.getBoundingClientRect();
  const buttonTop = buttonRect.top - listRect.top + pageList.scrollTop;
  const targetTop =
    buttonTop - (pageList.clientHeight - currentButton.offsetHeight) / 2;

  // 只滚动页码弹层，避免 scrollIntoView 连带改变阅读页的垂直位置。
  pageList.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
};

const togglePageMenu = async () => {
  isPageMenuOpen.value = !isPageMenuOpen.value;

  if (isPageMenuOpen.value) {
    await scrollToCurrentPage();
  }
};

const closePageMenu = () => {
  isPageMenuOpen.value = false;
};

const resolvePageRoute = (page) => props.getPageRoute?.(page) || "/";

const isPlainPrimaryClick = (event) => {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
};

const requestPage = (page) => {
  const targetPage = Math.min(props.totalPages, Math.max(1, Math.trunc(page)));

  if (targetPage === props.currentPage) return;

  emit("update:currentPage", targetPage);
  emit("change", targetPage);
};

const requestPrevious = () => {
  if (props.currentPage > 1) {
    requestPage(props.currentPage - 1);
    return;
  }

  if (props.canNavigateBefore) emit("navigate-before");
};

const requestNext = () => {
  if (props.currentPage < props.totalPages) {
    requestPage(props.currentPage + 1);
    return;
  }

  if (props.canNavigateAfter) emit("navigate-after");
};

const selectPage = (page) => {
  closePageMenu();
  requestPage(page);
};

const requestLinkedPage = (page, event) => {
  if (!isPlainPrimaryClick(event)) return;

  event.preventDefault();
  requestPage(page);
};

const selectLinkedPage = (page, event) => {
  if (!isPlainPrimaryClick(event)) return;

  event.preventDefault();
  selectPage(page);
};

onMounted(() => {
  if (paginationRef.value) {
    updatePaginationLayout(paginationRef.value.getBoundingClientRect().width);

    resizeObserver = new ResizeObserver(([entry]) => {
      updatePaginationLayout(entry.contentRect.width);
    });

    resizeObserver.observe(paginationRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

const visiblePages = computed(() => {
  const total = props.totalPages;
  const current = props.currentPage;
  const limit = maxVisibleItems.value;

  if (total <= limit) {
    return Array.from({ length: total }, (_, index) => ({
      type: "page",
      page: index + 1,
      key: `page-${index + 1}`,
    }));
  }

  const siblingCount = Math.max(0, Math.floor((limit - 5) / 2));

  let start = Math.max(2, current - siblingCount);
  let end = Math.min(total - 1, current + siblingCount);

  if (current <= siblingCount + 3) {
    start = 2;
    end = limit - 2;
  }

  if (current >= total - siblingCount - 2) {
    start = total - limit + 3;
    end = total - 1;
  }

  const items = [
    {
      type: "page",
      page: 1,
      key: "page-1",
    },
  ];

  if (start > 2) {
    items.push({
      type: "ellipsis",
      key: "ellipsis-left",
    });
  }

  for (let page = start; page <= end; page++) {
    items.push({
      type: "page",
      page,
      key: `page-${page}`,
    });
  }

  if (end < total - 1) {
    items.push({
      type: "ellipsis",
      key: "ellipsis-right",
    });
  }

  items.push({
    type: "page",
    page: total,
    key: `page-${total}`,
  });

  return items;
});
</script>
