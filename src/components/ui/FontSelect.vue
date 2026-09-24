<template>
  <div class="min-w-0 w-full">
    <button
      ref="trigger"
      class="select flex min-w-0 w-full items-center justify-between gap-2 text-left"
      :class="size ? selectSizeClasses[size] : 'max-sm:select-sm'"
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
        class="min-w-0 flex-1 truncate text-base-content"
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
      <div class="sticky top-0 z-20 bg-base-100 p-1">
        <input
          v-model="fontSearchQuery"
          type="search"
          class="input input-sm w-full"
          aria-label="搜索字体"
          placeholder="搜索字体"
          @keydown.stop
        />
      </div>

      <div
        v-for="group in filteredWebsiteGroups"
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
            :style="fontPreviewStyle(font)"
            type="button"
            role="option"
            :aria-selected="modelValue === font.id"
            @click="selectFont(font.id)"
          >
            <span class="min-w-0 truncate">{{ font.label }}</span>
            <span
              v-if="showFontPreview(font)"
              class="ml-auto shrink-0"
              :style="fontPreviewStyle(font, true)"
              :lang="fontPreview(font).language"
              aria-hidden="true"
              >{{ fontPreview(font).text }}</span
            >
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
          v-for="font in filteredUploadedFonts"
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
          <span class="min-w-0 truncate">{{ font.label }}</span>
          <span
            v-if="showFontPreview(font)"
            class="ml-auto shrink-0"
            :style="fontPreviewStyle(font, true)"
            :lang="fontPreview(font).language"
            aria-hidden="true"
            >{{ fontPreview(font).text }}</span
          >
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
              <span class="min-w-0 truncate">{{ entry.font.label }}</span>
              <span
                v-if="showFontPreview(entry.font)"
                class="ml-auto shrink-0"
                :style="fontPreviewStyle(entry.font, true)"
                :lang="fontPreview(entry.font).language"
                aria-hidden="true"
                >{{ fontPreview(entry.font).text }}</span
              >
            </button>
          </div>
        </div>
        <button
          v-if="
            !normalizedFontSearch &&
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

      <p
        v-if="normalizedFontSearch && !hasSearchResults"
        class="px-3 py-2 text-sm text-base-content/55"
        role="status"
      >
        未找到匹配字体
      </p>
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
  readLocalFontFaceWeight,
  readLocalizedFontFamilyBlob,
  shouldAvoidLocalFontPreview,
  stripLocalFontStyleSuffix,
} from "@/utils/font-name";

const FONT_ROW_HEIGHT = 32;
const GROUP_HEADER_HEIGHT = 28;
const SEARCH_HEADER_HEIGHT = 40;
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
const SINHALA_UNICODE_DEVICE_FONT_NAMES = [
  "Nirmala UI",
  "Iskoola Pota",
  "Sinhala Sangam MN",
  "Sinhala MN",
  "Noto Sans Sinhala",
  "Noto Sans Sinhala UI",
  "Noto Serif Sinhala",
  "Abhaya Libre",
  "Gemunu Libre",
  "Maname",
  "LKLUG",
  "Potha",
  "Malithi Web",
  "Bhashitha",
  "DinaminaUniWeb",
];
const SINHALA_LEGACY_DEVICE_FONT_NAMES = [
  "FM Abhaya",
  "FM Malithi",
  "FM Gemunu",
  "FM Bindumathi",
  "FM Derana",
  "FM Ganganee",
  "FM Emanee",
  "FM Samantha",
  "FM Rajantha",
  "FM Arjunn",
  "FM Basuru",
  "FM Rashmee",
  "FM Sandhyanee",
  "FM Abbaya",
  "FM Aba",
  "FM Bindu",
  "FM Gangani",
  "FM Gemun",
  "FM Saman",
  "FM Ababld",
  "FM Econbld",
  "DL Araliya",
  "DL Manel",
  "DL Lihini",
  "DL Ridhma",
  "DL Sumudu",
  "DL Malathi",
  "DL Thisaru",
  "DL Anurada",
  "DL Anuradha",
  "DL Biso",
  "DL Champika",
  "DL Hansika",
  "DL Harini",
  "DL Kinduru",
  "DL Kusumi",
  "DL Nelumi",
  "DL Nirosha",
  "DL Nisansala",
  "DL Paras",
  "DL Priyanwada",
  "DL Pumi",
  "DL Sarala",
  "FS Araliya",
  "DS Araliya",
  "Kaputa.com",
  "Kaputadotcom",
  "Thibus Sinhala",
  "ThibusStru",
  "Amalee",
  "Tipitaka Sinhala1",
  "SinhManel",
  "SinNelumA",
  "aKandyNew",
  "aKandyNewSupplement",
  "Kandy",
  "Kandy Supplement",
  "Lankadeepa",
  "LankaNatha",
  "Lankapura",
  "Lankadveepa",
  "Lankathilaka",
  "Mahanuwara",
  "Matale",
  "MataraNormal",
  "MataraSupplement",
  "NidahasaHiru",
  "NidahasaChapa",
  "NidahasaMadu",
  "NidahasaSadareka",
  "NidahasaSarasavi",
  "Padma",
  "SinhalaTekTon",
  "Thara",
];
const sinhalaUnicodeDeviceFontOrder = new Map(
  SINHALA_UNICODE_DEVICE_FONT_NAMES.map((name, index) => [
    normalizeSinhalaFontName(name),
    index,
  ]),
);
const sinhalaLegacyDeviceFontOrder = new Map(
  SINHALA_LEGACY_DEVICE_FONT_NAMES.map((name, index) => [
    normalizeSinhalaFontName(name),
    index,
  ]),
);
const SINHALA_LEGACY_SERIES = [
  /^fm[\s_-]*/iu,
  /^dl[\s_-]+/iu,
  /^ds[\s_-]+/iu,
  /^fs[\s_-]+/iu,
  /^npw[\s_-]+/iu,
  /^ams[\s_-]*/iu,
  /^sara[\s_-]+/iu,
  /^apex\d/iu,
  /^ridi\d/iu,
  /^tharu[\s_-]*digital/iu,
  /^wije\d/iu,
  /^0kd/iu,
  /^4u[\s_-]+/iu,
  /^am[\s_-]+/iu,
  /^aa[\s_-]+/iu,
  /^thibus/iu,
];
const HAN_TEXT_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u;
const FONT_LANGUAGE_PREVIEWS = [
  [
    /sinhala|abhaya|gemunu|maname|nirmala|iskoola|potha|malithi|bhashitha|dinamina|lklug|^un[-_\s]/iu,
    "සිංහල 123",
    "si",
  ],
  [
    /japanese|hiragino|meiryo|yu\s*(?:gothic|mincho)|noto\s*(?:sans|serif)\s*jp/iu,
    "日本語 123",
    "ja",
  ],
  [/korean|hangul|malgun|nanum|noto\s*(?:sans|serif)\s*kr/iu, "한글 123", "ko"],
  [/arabic|naskh|kufi/iu, "عربي 123", "ar"],
  [/devanagari|hindi/iu, "हिन्दी 123", "hi"],
  [/bengali|bangla/iu, "বাংলা 123", "bn"],
  [/tamil/iu, "தமிழ் 123", "ta"],
  [/thai/iu, "ไทย 123", "th"],
  [/hebrew/iu, "עברית 123", "he"],
  [/cyrillic/iu, "Аа123", "ru"],
  [/chinese|cjk|han\b|[\u3400-\u9fff]/iu, "中文 123", "zh"],
];
const selectSizeClasses = {
  xs: "select-xs",
  sm: "select-sm",
  md: "select-md",
  lg: "select-lg",
  xl: "select-xl",
};

const props = defineProps({
  modelValue: { type: String, required: true },
  fallbackFontId: { type: String, default: "" },
  websiteFonts: { type: Array, default: () => [] },
  uploadedPreviewText: { type: String, default: "" },
  uploadedPreviewLanguage: { type: String, default: "" },
  localPreviewText: { type: String, default: "" },
  localPreviewLanguage: { type: String, default: "" },
  localFontCoverage: {
    type: String,
    default: "all",
    validator: (value) =>
      ["all", "sinhala-unicode", "sinhala-legacy"].includes(value),
  },
  disabled: { type: Boolean, default: false },
  size: {
    type: String,
    default: "",
    validator: (value) => ["", "xs", "sm", "md", "lg", "xl"].includes(value),
  },
  ariaLabel: { type: String, default: "字体" },
  fontAccept: { type: String, default: DEFAULT_FONT_ACCEPT },
  uploadHint: {
    type: String,
    default: "仅本地处理",
  },
});

const emit = defineEmits([
  "update:modelValue",
  "update:fallbackFontId",
  "select",
]);
const toast = useToast();
const trigger = ref(null);
const popover = ref(null);
const fontSearchQuery = ref("");
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
const registeredCssLocalFonts = new Map();
const localFontSources = new Map();
const registeredLocalFonts = new Set();
let localFontStyle = null;
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
const normalizedFontSearch = computed(() =>
  fontSearchQuery.value.trim().toLocaleLowerCase(),
);
function matchesFontSearch(font) {
  if (!normalizedFontSearch.value) return true;
  return [font.label, font.fontFamily, font.id].some((value) =>
    String(value || "")
      .toLocaleLowerCase()
      .includes(normalizedFontSearch.value),
  );
}
const filteredWebsiteGroups = computed(() =>
  websiteGroups.value
    .map((group) => ({
      ...group,
      fonts: group.fonts.filter(matchesFontSearch),
    }))
    .filter((group) => group.fonts.length),
);
const filteredUploadedFonts = computed(() =>
  uploadedFonts.value.filter(matchesFontSearch),
);
const virtualGroup = computed(() =>
  fontGroups.value.find((group) => group.virtual),
);
const virtualFonts = computed(() => {
  if (!normalizedFontSearch.value) return virtualGroup.value?.fonts || [];
  return [
    ...localFonts.value,
    ...pendingLocalFonts.map(({ entry }) => entry),
  ].filter(matchesFontSearch);
});
const hasSearchResults = computed(
  () =>
    filteredWebsiteGroups.value.length > 0 ||
    filteredUploadedFonts.value.length > 0 ||
    virtualFonts.value.length > 0,
);
const visibleVirtualFonts = computed(() =>
  virtualFonts.value
    .slice(virtualStart.value, virtualStart.value + FONT_WINDOW_SIZE)
    .map((font, offset) => ({
      font,
      index: virtualStart.value + offset,
    })),
);
watch(
  visibleVirtualFonts,
  (fonts) => {
    for (const { font } of fonts) ensureLocalFontAlias(font.id);
  },
  { flush: "post" },
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

watch(fontSearchQuery, async () => {
  cancelPendingWork();
  virtualStart.value = 0;
  pendingVirtualStart = 0;
  if (popover.value) popover.value.scrollTop = 0;
  await nextTick();
  syncVirtualWindow(popover.value, true);
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
  localFontStyle?.remove();
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
  fontSearchQuery.value = "";
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
    normalizedFontSearch.value ||
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
  let contentTop = POPOVER_PADDING + SEARCH_HEADER_HEIGHT;
  for (const group of filteredWebsiteGroups.value) {
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

  contentTop += GROUP_HEADER_HEIGHT;
  const uploadedIndex = filteredUploadedFonts.value.findIndex(
    ({ id }) => id === props.modelValue,
  );
  if (uploadedIndex >= 0) {
    virtualStart.value = 0;
    pendingVirtualStart = 0;
    return centerRow(contentTop + uploadedIndex * FONT_ROW_HEIGHT);
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
    SEARCH_HEADER_HEIGHT +
    filteredWebsiteGroups.value.reduce(
      (height, group) =>
        height + GROUP_HEADER_HEIGHT + group.fonts.length * FONT_ROW_HEIGHT,
      0,
    ) +
    GROUP_HEADER_HEIGHT +
    filteredUploadedFonts.value.length * FONT_ROW_HEIGHT +
    UPLOAD_ACTION_HEIGHT +
    (props.uploadHint ? UPLOAD_HINT_HEIGHT : 0) +
    GROUP_HEADER_HEIGHT +
    DEVICE_ACTION_HEIGHT
  );
}

function centerRow(rowTop) {
  return Math.max(
    0,
    rowTop -
      SEARCH_HEADER_HEIGHT -
      (POPOVER_VIEWPORT_HEIGHT - SEARCH_HEADER_HEIGHT - FONT_ROW_HEIGHT) / 2,
  );
}

function fontPreview(font) {
  if (font.previewText) {
    return { text: font.previewText, language: font.previewLanguage || "" };
  }
  const name = [font.label, font.id].filter(Boolean).join(" ");
  const match = FONT_LANGUAGE_PREVIEWS.find(([pattern]) => pattern.test(name));
  return match
    ? { text: match[1], language: match[2] }
    : { text: "Aa123", language: "en" };
}

function showFontPreview(font) {
  return font?.previewFontFamily !== null || Boolean(font.previewText);
}

function fontPreviewStyle(font, sample = false) {
  if (!font) return null;
  if (sample && font.cssVariable)
    return { fontFamily: `var(${font.cssVariable})` };
  const family = Object.hasOwn(font, "previewFontFamily")
    ? font.previewFontFamily
    : font.fontFamily;
  return family || (sample && font.fontFamily)
    ? { fontFamily: family || font.fontFamily }
    : null;
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
    previewText: props.uploadedPreviewText,
    previewLanguage: props.uploadedPreviewLanguage,
  };
  customFontSources.set(id, file);
  isUploadingFont.value = true;
  try {
    entry.fontFamily = await loadCustomFont(id);
    uploadedFonts.value.unshift(entry);
    emit("select", id);
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
    const registeredCssFonts =
      props.localFontCoverage === "sinhala-unicode"
        ? getRegisteredCssFontFamilies()
        : new Map();
    registeredCssLocalFonts.clear();
    const fontPriority =
      props.localFontCoverage === "sinhala-unicode"
        ? sinhalaFontPriority
        : props.localFontCoverage === "sinhala-legacy"
          ? sinhalaLegacyFontPriority
          : null;
    const readableFonts =
      props.localFontCoverage === "sinhala-legacy"
        ? [...fonts, ...(await probeLegacyLocalFonts(fonts))]
        : fonts;
    const availableFonts = fontPriority
      ? readableFonts
          .map((font) => ({ font, priority: fontPriority(font) }))
          .filter(({ priority }) => priority !== Infinity)
          .sort((a, b) => a.priority - b.priority)
          .map(({ font }) => font)
      : readableFonts;
    for (const font of availableFonts) {
      const family =
        font.family || font.fullName || font.postscriptName || "未命名字体";
      const sourceKey = family.toLocaleLowerCase();
      const existing = uniqueFonts.get(sourceKey);
      if (existing) {
        existing.faces.push(font);
        continue;
      }
      const id = `local:${encodeURIComponent(sourceKey)}`;
      const registeredCssFont = registeredCssFonts.get(
        normalizeSinhalaFontName(family),
      );
      const fontFamily = quoteFontFamily(
        `Mori Device Font ${componentId} ${uniqueFonts.size}`,
      );
      const metadataLabel = [font.family, font.fullName].find((name) =>
        HAN_TEXT_PATTERN.test(name || ""),
      );
      const fallbackLabel =
        metadataLabel || localizeKnownFontFamily(family) || family;
      const avoidPreview = shouldAvoidLocalFontPreview(font);
      nextLocalFontFamilies.set(id, fontFamily);
      if (registeredCssFont)
        registeredCssLocalFonts.set(id, {
          family: quoteFontFamily(registeredCssFont.family),
          inputFallbackFamily: registeredCssFont.sizeAdjust
            ? quoteFontFamily(
                `Mori Device Input Font ${componentId} ${uniqueFonts.size}`,
              )
            : fontFamily,
          sizeAdjust: registeredCssFont.sizeAdjust,
        });
      uniqueFonts.set(sourceKey, {
        faces: [font],
        entry: {
          id,
          label: stripLocalFontStyleSuffix(fallbackLabel, font),
          fontFamily,
          previewFontFamily: avoidPreview ? null : fontFamily,
          previewText:
            props.localFontCoverage === "sinhala-unicode" || !avoidPreview
              ? props.localPreviewText
              : "",
          previewLanguage: props.localPreviewLanguage,
        },
      });
    }
    const nextLocalFonts = [...uniqueFonts.values()].map(
      ({ entry, faces }) => ({
        entry: {
          ...entry,
          supportsFontWeight: localFontFamilySupportsWeight(faces),
        },
      }),
    );
    if (props.localFontCoverage === "all")
      nextLocalFonts.sort((a, b) => a.entry.label.localeCompare(b.entry.label));
    localFontFamilies.clear();
    localFontSources.clear();
    for (const { entry, faces } of uniqueFonts.values())
      localFontSources.set(entry.id, faces);
    for (const { entry } of nextLocalFonts)
      localFontFamilies.set(entry.id, nextLocalFontFamilies.get(entry.id));
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

function normalizeSinhalaFontName(name) {
  return String(name || "")
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/(?:regular|semilight|semibold|medium|light|bold|variable)$/u, "");
}

function getRegisteredCssFontFamilies() {
  const families = new Map();
  function collect(rules) {
    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const family = rule.style
          .getPropertyValue("font-family")
          .trim()
          .replace(/^(?:"([^"]+)"|'([^']+)')$/u, "$1$2");
        const key = normalizeSinhalaFontName(family);
        if (!key || family.startsWith("Mori Device Font ")) continue;
        const sizeAdjust = rule.style.getPropertyValue("size-adjust").trim();
        if (!families.has(key) || (sizeAdjust && !families.get(key).sizeAdjust))
          families.set(key, { family, sizeAdjust });
      } else if ("cssRules" in rule) {
        try {
          collect(rule.cssRules);
        } catch {
          // Cross-origin stylesheets cannot be inspected.
        }
      } else if (rule.styleSheet) {
        try {
          collect(rule.styleSheet.cssRules);
        } catch {
          // Cross-origin imports cannot be inspected.
        }
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      collect(sheet.cssRules);
    } catch {
      // Cross-origin stylesheets cannot be inspected.
    }
  }
  return families;
}

function sinhalaFontPriority(font) {
  let isUnSeries = false;
  for (const name of [font.family, font.fullName, font.postscriptName]) {
    const priority = sinhalaUnicodeDeviceFontOrder.get(
      normalizeSinhalaFontName(name),
    );
    if (priority !== undefined) return priority;
    if (/^UN[-_\s]+/iu.test(name || "")) isUnSeries = true;
  }
  return isUnSeries ? SINHALA_UNICODE_DEVICE_FONT_NAMES.length : Infinity;
}

function sinhalaLegacyFontPriority(font) {
  const names = [font.family, font.fullName, font.postscriptName].filter(Boolean);
  if (names.some((name) => /unicode|uniweb|malithi[\s_-]*web/iu.test(name)))
    return Infinity;
  let seriesPriority = Infinity;
  for (const name of names) {
    const priority = sinhalaLegacyDeviceFontOrder.get(
      normalizeSinhalaFontName(name),
    );
    if (priority !== undefined) return priority;
    const seriesIndex = SINHALA_LEGACY_SERIES.findIndex((pattern) =>
      pattern.test(name),
    );
    if (seriesIndex >= 0)
      seriesPriority = Math.min(seriesPriority, seriesIndex);
  }
  return seriesPriority === Infinity
    ? Infinity
    : SINHALA_LEGACY_DEVICE_FONT_NAMES.length + seriesPriority;
}

async function probeLegacyLocalFonts(fonts) {
  if (typeof FontFace !== "function") return [];
  const existingFamilies = new Set(
    fonts.map((font) => normalizeLegacyFamilyKey(font.family || font.fullName)),
  );
  const found = [];
  for (const name of SINHALA_LEGACY_DEVICE_FONT_NAMES) {
    const family = name.replace(/[\s_-]+/g, "");
    const key = normalizeLegacyFamilyKey(family);
    if (existingFamilies.has(key)) continue;
    const candidates = name.startsWith("FM ")
      ? [
          `${family} x`,
          `${family}  Bold`,
          `${family} Bold`,
          family,
          `${name} x`,
          name,
        ]
      : [name, name.replaceAll(" ", "-"), family];
    for (const candidate of new Set(candidates)) {
      try {
        await new FontFace(
          "Mori Legacy Font Probe",
          `local(${quoteFontFamily(candidate)})`,
        ).load();
        found.push({
          family,
          fullName: candidate,
          style: /bold/iu.test(candidate) ? "Bold" : "Regular",
        });
        existingFamilies.add(key);
        break;
      } catch {
        // This font name is not available on the device.
      }
    }
  }
  return found;
}

function normalizeLegacyFamilyKey(name) {
  const key = normalizeSinhalaFontName(name);
  return key.startsWith("fm") ? key.replace(/x$/u, "") : key;
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
    if (websiteFont.inputFontFamily) return websiteFont.inputFontFamily;
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue(websiteFont.cssVariable)
      .trim();
    return family || "sans-serif";
  }
  const localFontFamily = localFontFamilies.get(fontId);
  if (localFontFamily) {
    ensureLocalFontAlias(fontId);
    const registeredCssFont = registeredCssLocalFonts.get(fontId);
    return registeredCssFont
      ? `${registeredCssFont.family}, ${registeredCssFont.inputFallbackFamily}`
      : localFontFamily;
  }
  return loadCustomFont(fontId);
}

function ensureLocalFontAlias(fontId) {
  if (registeredLocalFonts.has(fontId)) return;
  const family = localFontFamilies.get(fontId);
  const faces = localFontSources.get(fontId);
  const registeredCssFont = registeredCssLocalFonts.get(fontId);
  if (!family || !faces?.length) return;
  if (!localFontStyle) {
    localFontStyle = document.createElement("style");
    document.head.append(localFontStyle);
  }
  for (const face of faces) {
    const names = [
      ...new Set([face.postscriptName, face.fullName].filter(Boolean)),
    ];
    if (!names.length && face.family) names.push(face.family);
    if (!names.length) continue;
    const sources = names.map((name) => `local(${quoteFontFamily(name)})`);
    const style = /\bitalic\b/i.test(face.style || "")
      ? "italic"
      : /\boblique\b/i.test(face.style || "")
        ? "oblique"
        : "normal";
    const weight = /\b(?:variable|wght)\b/i.test(face.style || "")
      ? "100 900"
      : readLocalFontFaceWeight(face.style) || 400;
    localFontStyle.sheet?.insertRule(
      `@font-face { font-family: ${family}; src: ${sources.join(", ")}; font-style: ${style}; font-weight: ${weight}; }`,
    );
    if (registeredCssFont?.sizeAdjust)
      localFontStyle.sheet?.insertRule(
        `@font-face { font-family: ${registeredCssFont.inputFallbackFamily}; src: ${sources.join(", ")}; font-style: ${style}; font-weight: ${weight}; size-adjust: ${registeredCssFont.sizeAdjust}; }`,
      );
  }
  registeredLocalFonts.add(fontId);
}

async function resolveFont(
  fontId = props.modelValue,
  text = "",
  requestedWeight = "normal",
  fallbackFontId = effectiveFallbackFontId.value,
  nonSinhalaFallbackFamily = "",
) {
  const primaryFamily = await resolveFontFamily(fontId, text);
  const fallbackFamily =
    fallbackFontId && fallbackFontId !== fontId
      ? await resolveFontFamily(fallbackFontId, text)
      : "";
  const family = [
    primaryFamily,
    nonSinhalaFallbackFamily,
    fallbackFamily,
  ]
    .filter(Boolean)
    .join(", ");
  const font = fontGroups.value
    .map((group) => group.fonts?.find(({ id }) => id === fontId))
    .find(Boolean);
  const weight = font?.supportsFontWeight ? requestedWeight : "normal";
  try {
    await document.fonts?.load(`${weight} 200px ${family}`, text || "字体");
  } catch {
    // Consumers can continue through the font stack's fallbacks.
  }
  return {
    family,
    weight,
    sourceFamily: localFontSources.get(fontId)?.[0]?.family || "",
    usesRegisteredCssFont: registeredCssLocalFonts.has(fontId),
  };
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
  return `"${String(family)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/[\n\r\f]/g, " ")}"`;
}

function selectFont(fontId) {
  cancelPendingWork();
  popover.value?.hidePopover();
  trigger.value?.focus();
  emit("select", fontId);
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

function selectedDocumentFontName() {
  return (
    localFontSources.get(props.modelValue)?.[0]?.family ||
    selectedFont.value?.label ||
    ""
  );
}

async function selectedDocumentFontInfo() {
  const fontId = props.modelValue;
  const source = customFontSources.get(fontId);
  const family =
    (source && (await readLocalizedFontFamilyBlob(source, ["en-US"]))) ||
    selectedDocumentFontName();
  return { family };
}

defineExpose({ resolveFont, resolveFontFamily, selectedDocumentFontInfo });
</script>
