<template>
  <div class="min-w-0 w-full">
    <button
      ref="trigger"
      class="select max-sm:select-sm flex min-w-0 w-full items-center justify-between gap-2 text-left"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-controls="popoverId"
      :aria-expanded="isOpen"
      :disabled="disabled"
      :popovertarget="popoverId"
      :style="{ anchorName }"
    >
      <span
        class="min-w-0 flex-1 truncate"
        :class="selectedFont?.style"
        :style="selectedFontStyle"
      >
        {{ selectedFontLabel }}
      </span>
    </button>

    <div
      :id="popoverId"
      ref="popover"
      popover="auto"
      class="dropdown dropdown-center dropdown-bottom m-0 max-h-72 min-w-56 overscroll-contain overflow-y-auto [overflow-anchor:none] scrollbar-thin rounded-box border border-base-300 bg-base-100! p-1 shadow-lg"
      :style="{
        positionAnchor: anchorName,
        width: 'anchor-size(width)',
      }"
      role="listbox"
      :aria-label="ariaLabel"
      @scroll.passive="onScroll"
      @wheel="onWheel"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="resetTouchPosition"
      @touchcancel="resetTouchPosition"
      @keydown="onKeydown"
      @toggle="onPopoverToggle"
    >
      <div
        v-for="group in websiteGroups"
        :key="group.id || group.label"
        role="group"
        :aria-label="group.label"
      >
        <div
          class="bg-base-100 border-b border-base-200 sticky -top-1 z-10 grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-1 py-1.5 text-xs leading-4 font-medium text-base-content/55"
        >
          <span class="px-3">{{ group.label }}</span>
          <span
            class="border-base-200 flex self-stretch items-center justify-center border-l text-[0.625rem]"
            title="默认回退字体"
          >
            回退
          </span>
        </div>
        <div
          v-for="font in group.fonts"
          :key="font.id"
          class="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-1"
        >
          <button
            class="btn btn-sm btn-block relative justify-start ps-7.5 font-normal before:pointer-events-none before:absolute before:left-4 before:font-mono before:opacity-0 before:content-['✓']"
            :class="[
              font.style,
              modelValue === font.id
                ? 'btn-active before:opacity-100'
                : 'btn-ghost',
            ]"
            :style="font.fontFamily ? { fontFamily: font.fontFamily } : null"
            type="button"
            role="option"
            :aria-selected="modelValue === font.id"
            @click="selectFont(font.id)"
          >
            <span class="truncate">{{ font.label }}</span>
          </button>
          <label
            class="tooltip tooltip-left border-base-200 flex h-8 w-10 cursor-pointer items-center justify-center border-l"
            :data-tip="`设为默认回退字体：${font.label}`"
          >
            <input
              class="radio radio-xs"
              type="radio"
              :name="fallbackRadioName"
              :value="font.id"
              :checked="effectiveFallbackFontId === font.id"
              :aria-label="`设为默认回退字体：${font.label}`"
              :disabled="disabled"
              @change="selectFallbackFont(font.id)"
            />
          </label>
        </div>
      </div>

      <div role="group" aria-label="自定义字体">
        <div
          class="bg-base-100 border-b border-base-200 sticky -top-1 z-10 px-3 py-1.5 text-xs leading-4 font-medium text-base-content/55"
        >
          自定义字体
        </div>
        <button
          v-for="font in uploadedFonts"
          :key="font.id"
          class="btn btn-sm btn-block relative justify-start ps-7.5 font-normal before:pointer-events-none before:absolute before:left-4 before:font-mono before:opacity-0 before:content-['✓']"
          :class="[
            modelValue === font.id
              ? 'btn-active before:opacity-100'
              : 'btn-ghost',
          ]"
          :style="{ fontFamily: font.fontFamily }"
          type="button"
          role="option"
          :aria-selected="modelValue === font.id"
          @click="selectFont(font.id)"
        >
          <span class="truncate">{{ font.label }}</span>
        </button>
        <button
          class="btn btn-ghost btn-sm w-full justify-start"
          type="button"
          :disabled="disabled || isUploadingFont"
          aria-live="polite"
          @click="openFontPicker"
        >
          <span
            v-if="isUploadingFont"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>
          <i v-else class="ri-upload-2-line" aria-hidden="true"></i>
          <span class="ml-0.5">{{
            isUploadingFont ? "正在加载字体" : "上传字体"
          }}</span>
          <span
            v-if="uploadHint"
            class="ml-1 font-normal text-xs text-base-content/55"
          >
            {{ uploadHint }}
          </span>
        </button>
      </div>

      <div role="group" :aria-label="virtualGroup.label">
        <div
          class="bg-base-100 border-b border-base-200 sticky -top-1 z-10 px-3 py-1.5 text-xs leading-4 font-medium text-base-content/55"
        >
          {{ virtualGroup.label }}
        </div>
        <button
          class="btn btn-ghost btn-sm w-full justify-start"
          type="button"
          :disabled="
            disabled ||
            isReadingLocalFonts ||
            isLoadingMoreLocalFonts ||
            hasReadLocalFonts ||
            !supportsLocalFontAccess
          "
          aria-live="polite"
          @click="readLocalFonts"
        >
          <span
            v-if="showLocalFontLoading && localFontLoadingPhase === 'initial'"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>
          <i v-else class="ri-computer-line" aria-hidden="true"></i>
          <span class="ml-0.5">{{ localFontActionLabel }}</span>
        </button>
        <div
          v-if="virtualFonts.length"
          ref="virtualContainer"
          class="relative [overflow-anchor:none]"
          :style="{
            contain: 'layout paint',
            height: `${virtualFonts.length * FONT_ROW_HEIGHT}px`,
          }"
        >
          <div
            class="absolute inset-x-0 top-0 flex flex-col will-change-transform"
            :style="virtualWindowStyle"
          >
            <button
              v-for="entry in visibleVirtualFonts"
              :key="entry.font.id"
              class="btn btn-sm btn-block relative shrink-0 justify-start ps-7.5 font-normal before:pointer-events-none before:absolute before:left-4 before:font-mono before:opacity-0 before:content-['✓']"
              :class="[
                entry.font.style,
                modelValue === entry.font.id
                  ? 'btn-active before:opacity-100'
                  : 'btn-ghost',
              ]"
              :style="fontPreviewStyle(entry.font)"
              type="button"
              role="option"
              :aria-selected="modelValue === entry.font.id"
              :aria-posinset="entry.index + 1"
              :aria-setsize="virtualFonts.length"
              @click="selectFont(entry.font.id)"
            >
              <span class="truncate">{{ entry.font.label }}</span>
            </button>
          </div>
        </div>
        <button
          v-if="
            localFontLoadingPhase !== 'initial' &&
            (virtualGroup.hasMore ||
              virtualGroup.loading ||
              showLocalFontLoading)
          "
          class="btn btn-ghost btn-sm btn-block pointer-events-none justify-start"
          type="button"
          tabindex="-1"
          aria-disabled="true"
          aria-live="polite"
        >
          <span
            v-if="showLocalFontLoading && localFontLoadingPhase === 'more'"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>

          <i
            v-if="!showLocalFontLoading || localFontLoadingPhase !== 'more'"
            class="ri-arrow-down-line"
            aria-hidden="true"
          ></i>
          <span class="ml-0.5">
            {{
              showLocalFontLoading && localFontLoadingPhase === "more"
                ? `正在加载${virtualGroup.label}`
                : "继续下拉加载更多"
            }}
          </span>
        </button>
      </div>
    </div>

    <input
      ref="fontInput"
      class="hidden"
      type="file"
      :accept="fontAccept"
      :disabled="disabled || isUploadingFont"
      @change="onFontFile"
    />
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import { useToast } from "@/composables/useToast";
import {
  localFontFamilySupportsWeight,
  localizeKnownFontFamily,
  shouldAvoidLocalFontPreview,
  stripLocalFontStyleSuffix,
} from "@/utils/font-name";

const FONT_ROW_HEIGHT = 32;
const GROUP_HEADER_HEIGHT = 28;
const POPOVER_PADDING = 4;
const POPOVER_VIEWPORT_HEIGHT = 288;
const FONT_WINDOW_SIZE = 10;
const FONT_OVERSCAN = 1;
const LOCAL_FONT_BATCH_SIZE = 256;
const UPLOAD_ACTION_HEIGHT = 32;
const UPLOAD_HINT_HEIGHT = 20;
const DEVICE_ACTION_HEIGHT = 32;
const LOADING_INDICATOR_DELAY = 180;
const LOADING_INDICATOR_MIN_DURATION = 240;
const DEFAULT_FONT_ACCEPT =
  ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
const HAN_TEXT_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;

const props = defineProps({
  modelValue: { type: String, required: true },
  fallbackFontId: { type: String, default: "" },
  websiteFonts: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: "字体" },
  fontAccept: { type: String, default: DEFAULT_FONT_ACCEPT },
  uploadHint: {
    type: String,
    default: "仅本地处理",
  },
});

const emit = defineEmits(["update:modelValue", "update:fallbackFontId"]);
const toast = useToast();
const trigger = ref(null);
const popover = ref(null);
const fontInput = ref(null);
const virtualContainer = ref(null);
const isOpen = ref(false);
const virtualStart = ref(0);
const localFonts = shallowRef([]);
const uploadedFonts = ref([]);
const supportsLocalFontAccess = ref(false);
const isReadingLocalFonts = ref(false);
const isLoadingMoreLocalFonts = ref(false);
const showLocalFontLoading = ref(false);
const localFontLoadingPhase = ref(null);
const isUploadingFont = ref(false);
const hasReadLocalFonts = ref(false);
const pendingLocalFontCount = ref(0);
const totalLocalFontCount = ref(0);
const componentId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const popoverId = `font-select-${componentId}`;
const anchorName = `--${popoverId}`;
const fallbackRadioName = `font-fallback-${componentId}`;
const localFallbackFontId = ref(props.fallbackFontId);
let pendingVirtualStart = 0;
let scrollFrame = 0;
let pendingLocalFonts = [];
let uploadedFontId = 0;
let loadedFontFamilyId = 0;
let localFontLoadingDelayTimer = 0;
let localFontLoadingHideTimer = 0;
let localFontLoadingShownAt = 0;
let lastTouchY = null;
const customFontSources = new Map();
const localFontFamilies = new Map();
const loadedFontFaces = new Map();
const pendingFontLoads = new Map();

const fontGroups = computed(() => [
  { id: "uploaded", label: "上传字体", fonts: uploadedFonts.value },
  { id: "website", label: "网站字体", fonts: props.websiteFonts },
  {
    id: "device",
    label: "设备字体",
    fonts: localFonts.value,
    virtual: true,
    hasMore: pendingLocalFontCount.value > 0,
    loading: isLoadingMoreLocalFonts.value,
    loadMore: loadMoreLocalFonts,
  },
]);

const websiteGroups = computed(() =>
  fontGroups.value.filter(
    (group) =>
      group.id !== "uploaded" &&
      !group.virtual &&
      Array.isArray(group.fonts) &&
      group.fonts.length,
  ),
);
const virtualGroup = computed(() =>
  fontGroups.value.find((group) => group.virtual),
);
const virtualFonts = computed(() => virtualGroup.value?.fonts || []);
const visibleVirtualFonts = computed(() =>
  virtualFonts.value
    .slice(virtualStart.value, virtualStart.value + FONT_WINDOW_SIZE)
    .map((font, offset) => ({
      font,
      index: virtualStart.value + offset,
    })),
);
const virtualWindowStyle = computed(() => ({
  transform: `translate3d(0, ${virtualStart.value * FONT_ROW_HEIGHT}px, 0)`,
}));
const selectedFont = computed(() =>
  fontGroups.value
    .map((group) => group.fonts?.find(({ id }) => id === props.modelValue))
    .find(Boolean),
);
const selectedFontStyle = computed(() => fontPreviewStyle(selectedFont.value));
const selectedFontLabel = computed(() =>
  selectedFont.value ? selectedFont.value.label : "选择字体",
);
const effectiveFallbackFontId = computed(
  () =>
    props.fallbackFontId ||
    localFallbackFontId.value ||
    props.websiteFonts[0]?.id ||
    "",
);
const localFontActionLabel = computed(() => {
  if (!supportsLocalFontAccess.value) return "当前浏览器不支持读取设备字体";
  if (showLocalFontLoading.value && localFontLoadingPhase.value === "initial")
    return "正在读取设备字体";
  if (isReadingLocalFonts.value) return "读取设备字体";
  if (pendingLocalFontCount.value)
    return `已加载 ${localFonts.value.length}/${totalLocalFontCount.value} 款设备字体`;
  if (localFonts.value.length)
    return `已读取 ${localFonts.value.length} 款设备字体`;
  if (hasReadLocalFonts.value) return "没有可用的设备字体";
  return "读取设备字体";
});
const isLocalFontLoading = computed(
  () => isReadingLocalFonts.value || isLoadingMoreLocalFonts.value,
);

watch(isLocalFontLoading, updateLocalFontLoadingIndicator, {
  flush: "sync",
});

onMounted(() => {
  supportsLocalFontAccess.value =
    window.isSecureContext && typeof window.queryLocalFonts === "function";
});

onBeforeUnmount(() => {
  cancelPendingWork();
  clearTimeout(localFontLoadingDelayTimer);
  clearTimeout(localFontLoadingHideTimer);
  for (const { face } of loadedFontFaces.values()) document.fonts?.delete(face);
});

function onPopoverToggle(event) {
  isOpen.value = event.newState === "open";
  if (isOpen.value) {
    const list = event.currentTarget;
    list.scrollTop = prepareSelectedFontPosition();
    syncVirtualWindow(list, true);
    return;
  }
  cancelPendingWork();
}

function onScroll(event) {
  syncVirtualWindow(event.currentTarget);
}

function onWheel(event) {
  if (event.deltaY <= 0 || !tryLoadMoreAtEnd(event.currentTarget)) return;
  event.preventDefault();
}

function onTouchStart(event) {
  lastTouchY = event.touches[0]?.clientY ?? null;
}

function onTouchMove(event) {
  const touchY = event.touches[0]?.clientY;
  if (touchY == null) return;
  const pullingDown = lastTouchY != null && lastTouchY - touchY > 2;
  lastTouchY = touchY;
  if (!pullingDown || !tryLoadMoreAtEnd(event.currentTarget)) return;
  event.preventDefault();
}

function resetTouchPosition() {
  lastTouchY = null;
}

function onKeydown(event) {
  if (
    !["ArrowDown", "PageDown", "End"].includes(event.key) ||
    !tryLoadMoreAtEnd(event.currentTarget)
  )
    return;
  event.preventDefault();
}

function tryLoadMoreAtEnd(list) {
  if (
    !list ||
    !virtualGroup.value?.hasMore ||
    isLocalFontLoading.value ||
    showLocalFontLoading.value ||
    list.scrollHeight - list.clientHeight - list.scrollTop > 2
  )
    return false;
  loadMoreFonts();
  return true;
}

function syncVirtualWindow(list, immediate = false) {
  if (!list) return;
  const virtualScrollTop = Math.max(0, list.scrollTop - getVirtualListTop());
  const maxStart = Math.max(0, virtualFonts.value.length - FONT_WINDOW_SIZE);
  pendingVirtualStart = Math.min(
    maxStart,
    Math.max(0, Math.floor(virtualScrollTop / FONT_ROW_HEIGHT) - FONT_OVERSCAN),
  );

  if (immediate) {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    virtualStart.value = pendingVirtualStart;
    return;
  }

  if (!scrollFrame) {
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      virtualStart.value = pendingVirtualStart;
    });
  }
}

function prepareSelectedFontPosition() {
  let contentTop =
    POPOVER_PADDING +
    GROUP_HEADER_HEIGHT +
    UPLOAD_ACTION_HEIGHT +
    (props.uploadHint ? UPLOAD_HINT_HEIGHT : 0);
  const uploadedIndex = uploadedFonts.value.findIndex(
    ({ id }) => id === props.modelValue,
  );
  if (uploadedIndex >= 0) {
    virtualStart.value = 0;
    pendingVirtualStart = 0;
    return centerRow(contentTop + uploadedIndex * FONT_ROW_HEIGHT);
  }
  contentTop += uploadedFonts.value.length * FONT_ROW_HEIGHT;

  for (const group of websiteGroups.value) {
    contentTop += GROUP_HEADER_HEIGHT;
    const selectedIndex = group.fonts.findIndex(
      ({ id }) => id === props.modelValue,
    );
    if (selectedIndex >= 0) {
      virtualStart.value = 0;
      pendingVirtualStart = 0;
      return centerRow(contentTop + selectedIndex * FONT_ROW_HEIGHT);
    }
    contentTop += group.fonts.length * FONT_ROW_HEIGHT;
  }

  const selectedIndex = virtualFonts.value.findIndex(
    ({ id }) => id === props.modelValue,
  );
  if (selectedIndex < 0) {
    virtualStart.value = 0;
    pendingVirtualStart = 0;
    return 0;
  }
  const maxStart = Math.max(0, virtualFonts.value.length - FONT_WINDOW_SIZE);
  const nextStart = Math.max(
    0,
    Math.min(maxStart, selectedIndex - Math.floor(FONT_WINDOW_SIZE / 2)),
  );
  virtualStart.value = nextStart;
  pendingVirtualStart = nextStart;
  return centerRow(getVirtualListTop() + selectedIndex * FONT_ROW_HEIGHT);
}

function getVirtualListTop() {
  if (virtualContainer.value) return virtualContainer.value.offsetTop;
  return (
    POPOVER_PADDING +
    GROUP_HEADER_HEIGHT +
    UPLOAD_ACTION_HEIGHT +
    (props.uploadHint ? UPLOAD_HINT_HEIGHT : 0) +
    uploadedFonts.value.length * FONT_ROW_HEIGHT +
    websiteGroups.value.reduce(
      (height, group) =>
        height + GROUP_HEADER_HEIGHT + group.fonts.length * FONT_ROW_HEIGHT,
      0,
    ) +
    GROUP_HEADER_HEIGHT +
    DEVICE_ACTION_HEIGHT
  );
}

function centerRow(rowTop) {
  return Math.max(0, rowTop - (POPOVER_VIEWPORT_HEIGHT - FONT_ROW_HEIGHT) / 2);
}

function fontPreviewStyle(font) {
  if (!font) return null;
  const family = Object.hasOwn(font, "previewFontFamily")
    ? font.previewFontFamily
    : font.fontFamily;
  return family ? { fontFamily: family } : null;
}

function loadMoreFonts() {
  const group = virtualGroup.value;
  if (
    !group?.hasMore ||
    group.loading ||
    isReadingLocalFonts.value ||
    showLocalFontLoading.value ||
    typeof group.loadMore !== "function"
  )
    return;
  try {
    void Promise.resolve(group.loadMore()).catch(() => {});
  } catch {
    // The group owns its loading error state.
  }
}

function openFontPicker() {
  if (props.disabled || isUploadingFont.value) return;
  fontInput.value?.click();
}

async function onFontFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const id = `upload:${++uploadedFontId}`;
  const entry = {
    id,
    label: file.name.replace(/\.[^.]+$/, "") || file.name,
    supportsFontWeight: false,
  };
  customFontSources.set(id, file);
  isUploadingFont.value = true;
  try {
    entry.fontFamily = await loadCustomFont(id);
    uploadedFonts.value.unshift(entry);
    emit("update:modelValue", id);
  } catch (error) {
    customFontSources.delete(id);
    toast.error(
      `${file.name}：${error instanceof Error ? error.message : "无法加载字体"}`,
    );
  } finally {
    isUploadingFont.value = false;
  }
}

async function readLocalFonts() {
  if (
    !supportsLocalFontAccess.value ||
    isReadingLocalFonts.value ||
    isLoadingMoreLocalFonts.value ||
    hasReadLocalFonts.value
  )
    return;
  localFontLoadingPhase.value = "initial";
  isReadingLocalFonts.value = true;
  try {
    const fonts = await window.queryLocalFonts();
    hasReadLocalFonts.value = true;
    const uniqueFonts = new Map();
    const nextLocalFontFamilies = new Map();
    for (const font of fonts) {
      const family =
        font.family || font.fullName || font.postscriptName || "未命名字体";
      const sourceKey = family.toLocaleLowerCase();
      const existing = uniqueFonts.get(sourceKey);
      if (existing) {
        existing.faces.push(font);
        continue;
      }
      const id = `local:${encodeURIComponent(sourceKey)}`;
      const fontFamily = quoteFontFamily(family);
      const metadataLabel = [font.family, font.fullName].find((name) =>
        HAN_TEXT_PATTERN.test(name || ""),
      );
      const fallbackLabel =
        metadataLabel || localizeKnownFontFamily(family) || family;
      nextLocalFontFamilies.set(id, fontFamily);
      uniqueFonts.set(sourceKey, {
        faces: [font],
        entry: {
          id,
          label: stripLocalFontStyleSuffix(fallbackLabel, font),
          fontFamily,
          previewFontFamily: shouldAvoidLocalFontPreview(font)
            ? null
            : fontFamily,
        },
      });
    }
    const nextLocalFonts = [...uniqueFonts.values()]
      .map(({ entry, faces }) => ({
        entry: {
          ...entry,
          supportsFontWeight: localFontFamilySupportsWeight(faces),
        },
      }))
      .sort((a, b) => a.entry.label.localeCompare(b.entry.label));
    localFontFamilies.clear();
    for (const [id, family] of nextLocalFontFamilies)
      localFontFamilies.set(id, family);
    localFonts.value = [];
    pendingLocalFonts = nextLocalFonts;
    pendingLocalFontCount.value = nextLocalFonts.length;
    totalLocalFontCount.value = nextLocalFonts.length;
    await loadMoreLocalFonts();
    if (totalLocalFontCount.value)
      toast.success(`已读取 ${totalLocalFontCount.value} 款设备字体`);
    else toast.info("没有读取到可用的设备字体");
  } catch (error) {
    if (error?.name === "NotAllowedError")
      toast.warning("未获得设备字体访问权限");
    else
      toast.error(error instanceof Error ? error.message : "无法读取设备字体");
  } finally {
    isReadingLocalFonts.value = false;
  }
}

async function loadMoreLocalFonts() {
  if (isLoadingMoreLocalFonts.value || !pendingLocalFonts.length) return;
  if (!isReadingLocalFonts.value) localFontLoadingPhase.value = "more";
  isLoadingMoreLocalFonts.value = true;
  const batch = pendingLocalFonts.slice(0, LOCAL_FONT_BATCH_SIZE);
  try {
    await waitForPaint();
    pendingLocalFonts = pendingLocalFonts.slice(batch.length);
    pendingLocalFontCount.value = pendingLocalFonts.length;
    localFonts.value = [
      ...localFonts.value,
      ...batch.map(({ entry }) => entry),
    ];
    await nextTick();
    syncVirtualWindow(popover.value, true);
    await waitForPaint();
  } finally {
    isLoadingMoreLocalFonts.value = false;
  }
}

function updateLocalFontLoadingIndicator(loading) {
  clearTimeout(localFontLoadingDelayTimer);
  clearTimeout(localFontLoadingHideTimer);
  if (loading) {
    if (showLocalFontLoading.value) return;
    localFontLoadingDelayTimer = setTimeout(() => {
      localFontLoadingShownAt = performance.now();
      showLocalFontLoading.value = true;
    }, LOADING_INDICATOR_DELAY);
    return;
  }
  if (!showLocalFontLoading.value) {
    localFontLoadingPhase.value = null;
    return;
  }
  const elapsed = performance.now() - localFontLoadingShownAt;
  localFontLoadingHideTimer = setTimeout(
    () => {
      showLocalFontLoading.value = false;
      localFontLoadingPhase.value = null;
    },
    Math.max(0, LOADING_INDICATOR_MIN_DURATION - elapsed),
  );
}

function waitForPaint() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

async function resolveFontFamily(fontId = props.modelValue, text = "") {
  const websiteFont = props.websiteFonts.find(({ id }) => id === fontId);
  if (websiteFont) {
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue(websiteFont.cssVariable)
      .trim();
    return family || "sans-serif";
  }
  const localFontFamily = localFontFamilies.get(fontId);
  if (localFontFamily) return localFontFamily;
  return loadCustomFont(fontId);
}

async function resolveFont(
  fontId = props.modelValue,
  text = "",
  requestedWeight = "normal",
  fallbackFontId = effectiveFallbackFontId.value,
) {
  const primaryFamily = await resolveFontFamily(fontId, text);
  const fallbackFamily =
    fallbackFontId && fallbackFontId !== fontId
      ? await resolveFontFamily(fallbackFontId, text)
      : "";
  const family = fallbackFamily
    ? `${primaryFamily}, ${fallbackFamily}`
    : primaryFamily;
  const font = fontGroups.value
    .map((group) => group.fonts?.find(({ id }) => id === fontId))
    .find(Boolean);
  const weight = font?.supportsFontWeight ? requestedWeight : "normal";
  try {
    await document.fonts?.load(`${weight} 200px ${family}`, text || "字体");
  } catch {
    // Consumers can continue through the font stack's fallbacks.
  }
  return { family, weight };
}

async function loadCustomFont(id) {
  const loaded = loadedFontFaces.get(id);
  if (loaded) return quoteFontFamily(loaded.family);
  const pending = pendingFontLoads.get(id);
  if (pending) return pending;
  const promise = (async () => {
    const source = customFontSources.get(id);
    if (!(source instanceof Blob))
      throw new Error("所选自定义字体已不可用，请重新选择");
    const family = `Mori Custom Font ${++loadedFontFamilyId}`;
    const face = new FontFace(family, await source.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    loadedFontFaces.set(id, { face, family });
    return quoteFontFamily(family);
  })();
  pendingFontLoads.set(id, promise);
  try {
    return await promise;
  } finally {
    pendingFontLoads.delete(id);
  }
}

function quoteFontFamily(family) {
  return `"${String(family).replaceAll('"', '\\"')}"`;
}

function selectFont(fontId) {
  cancelPendingWork();
  popover.value?.hidePopover();
  trigger.value?.focus();
  if (fontId === props.modelValue) return;
  requestAnimationFrame(() => emit("update:modelValue", fontId));
}

function selectFallbackFont(fontId) {
  if (props.disabled || fontId === effectiveFallbackFontId.value) return;
  localFallbackFontId.value = fontId;
  emit("update:fallbackFontId", fontId);
}

function cancelPendingWork() {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
}

defineExpose({ resolveFont, resolveFontFamily });
</script>
