<template>
  <client-only>
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header
        v-if="showHeader"
        class="flex shrink-0 items-start gap-3 border-b border-base-300 px-3 py-3"
      >
        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-base font-semibold tracking-wide">阅读排版</h3>
          <p class="mt-0.5 text-xs text-base-content/55">
            调整后可在下方即时预览
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-sm shrink-0"
          :disabled="isLayoutDefault"
          @click="resetLayout"
        >
          <i class="ri-reset-left-line" aria-hidden="true"></i>
          恢复默认
        </button>
      </header>

      <div class="shrink-0 border-b border-base-300 px-3 py-2.5">
        <div
          class="overflow-y-auto overscroll-contain rounded-box h-36 md:h-48 p-4 bg-base-300 scrollbar-none shadow-inner"
          :class="styleConfigs.fontStyle"
          :data-theme="mobile ? previewTheme || undefined : undefined"
          :style="[
            previewStyle,
            {
              '--para-text-indent': `calc(${styleConfigs.fontSize * 2}px + ${styleConfigs.fontGap * 0.6}rem)`,
            },
          ]"
          :aria-label="mobile ? '当前移动端排版预览' : '当前桌面排版预览'"
        >
          <p class="m-0 indent-(--para-text-indent) text-justify text-pretty">
            暮色沿着书页缓缓落下，字句之间留着呼吸。
          </p>
          <p
            class="mb-0 indent-(--para-text-indent) text-justify text-pretty"
            :style="{ marginBlockStart: previewParagraphGap }"
          >
            翻过书页，故事仍在前方延伸。
          </p>
        </div>
      </div>

      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-3"
      >
        <div
          v-if="mobile"
          role="tablist"
          class="tabs tabs-sm tabs-box mb-3 w-full"
        >
          <button
            v-for="mode in MOBILE_READING_MODE_OPTIONS"
            :key="mode.value"
            type="button"
            role="tab"
            class="tab min-w-0 flex-1 gap-1"
            :class="{ 'tab-active': mobileReadingMode === mode.value }"
            :aria-selected="mobileReadingMode === mode.value"
            @click="store.setMobileReadingMode(mode.value)"
          >
            <i :class="mode.icon" aria-hidden="true"></i>{{ mode.label }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          <label class="col-span-2 min-w-0">
            <span class="label block text-xs md:text-sm">正文字体</span>
            <select
              class="select select-sm xl:select-md w-full"
              :class="styleConfigs.fontStyle"
              :value="styleConfigs.fontStyle"
              @change="store.setStyle('fontStyle', $event.target.value)"
            >
              <option disabled selected class="font-sans">请选择字体</option>
              <option
                v-for="font in FONTS"
                :key="font.style"
                :value="font.style"
                :class="font.style"
              >
                {{ font.name }}
              </option>
            </select>
          </label>

          <label
            v-for="control in READER_TYPOGRAPHY_CONTROLS"
            :key="control.key"
            class="col-span-1 xl:col-span-2 md:my-1 min-w-0"
          >
            <span class="label block text-xs md:text-sm">
              {{ control.shortLabel }} {{ formatNumericValue(control) }}
            </span>
            <input
              type="range"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              class="range range-xs xl:range-sm mt-1 w-full"
              :value="styleConfigs[control.key]"
              @input="store.setStyle(control.key, Number($event.target.value))"
            />
          </label>
        </div>

        <template v-if="mobile">
          <fieldset class="mt-4">
            <legend class="label text-xs">阅读配色</legend>
            <div class="mt-2 grid grid-cols-4 gap-2">
              <button
                v-for="theme in MOBILE_READER_COLOR_THEMES"
                :key="theme.value"
                type="button"
                class="btn btn-sm h-auto min-h-12 flex-col gap-0.5 px-1 py-1.5"
                :class="{
                  'outline-2 outline-primary':
                    selectedColorTheme === theme.value,
                }"
                :data-theme="theme.value === 'site' ? undefined : theme.value"
                @click="selectColorTheme(theme.value)"
              >
                <i :class="theme.icon" aria-hidden="true"></i>
                <span class="text-[0.625rem]">{{ theme.label }}</span>
              </button>
              <button
                type="button"
                class="btn btn-sm h-auto min-h-12 flex-col gap-0.5 px-1 py-1.5"
                :class="{
                  'outline-2 outline-primary': selectedColorTheme === 'custom',
                }"
                @click="selectColorTheme('custom')"
              >
                <i class="ri-palette-line" aria-hidden="true"></i>
                <span class="text-[0.625rem]">自定义</span>
              </button>
            </div>
          </fieldset>

          <div
            v-if="selectedColorTheme === 'custom'"
            class="mt-2 grid grid-cols-2 gap-2"
          >
            <label
              class="input input-sm flex items-center justify-between gap-2"
            >
              <span class="text-xs">文字颜色</span>
              <input
                type="color"
                class="size-7 cursor-pointer border-0 bg-transparent p-0"
                :value="styleConfigs.textColor || '#1f2937'"
                @input="setCustomColor('textColor', $event.target.value)"
              />
            </label>
            <label
              class="input input-sm flex items-center justify-between gap-2"
            >
              <span class="text-xs">背景颜色</span>
              <input
                type="color"
                class="size-7 cursor-pointer border-0 bg-transparent p-0"
                :value="styleConfigs.backgroundColor || '#ffffff'"
                @input="setCustomColor('backgroundColor', $event.target.value)"
              />
            </label>
          </div>
        </template>

        <fieldset v-else class="mt-4">
          <legend class="label block text-xs md:text-sm">站点主题</legend>
          <div class="mt-2 grid grid-cols-5 gap-2">
            <button
              v-for="theme in siteThemeOptions"
              :key="theme.value"
              type="button"
              class="btn btn-sm h-auto min-h-12 flex-col gap-0.5 px-1 py-1.5"
              :class="{
                'outline-2 outline-primary': selectedSiteTheme === theme.value,
              }"
              :data-theme="theme.value === 'default' ? undefined : theme.value"
              :title="theme.description"
              :aria-label="`切换站点主题：${theme.label}，${theme.description}`"
              :aria-pressed="selectedSiteTheme === theme.value"
              @click="themeStore.setTheme(theme.value)"
            >
              <i :class="theme.icon" aria-hidden="true"></i>
              <span class="max-w-full truncate text-[0.625rem]">
                {{ theme.label }}
              </span>
            </button>
          </div>
        </fieldset>
      </div>

      <footer
        class="shrink-0 border-t border-base-300 px-3 pt-2"
        :class="
          mobile ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'pb-3'
        "
      >
        <div
          class="flex gap-3 overflow-x-auto px-1 py-1.5 scrollbar-thin"
          aria-label="系统推荐与用户保存的排版预设"
        >
          <button
            v-for="{ preset, label } in systemPresets"
            :key="preset.id"
            type="button"
            class="btn btn-circle shrink-0 flex-col gap-1 border-base-300 size-12 p-1 leading-tight shadow-sm"
            :class="[
              preset.styles.fontStyle,
              mobile ? '' : 'bg-base-100',
              {
                'btn-active outline-2 outline-primary outline-offset-2':
                  isPresetActive(preset),
              },
            ]"
            :data-theme="mobile ? presetTheme(preset) || undefined : undefined"
            :style="presetSampleStyle(preset)"
            :title="preset.description"
            :aria-label="`应用系统推荐预设 ${preset.name}：${preset.description}`"
            :aria-pressed="isPresetActive(preset)"
            @click="applyPreset(preset)"
          >
            <span class="font-sans text-[0.5rem]">{{ label }}</span>
            <span class="max-w-11 truncate text-[0.75rem]">
              {{ preset.name }}
            </span>
          </button>

          <div
            v-for="preset in readerLayoutPresets"
            :key="preset.id"
            class="relative shrink-0"
          >
            <button
              type="button"
              class="btn btn-circle size-12 border-base-300 p-1 text-[0.625rem] leading-tight shadow-sm"
              :class="[
                preset.styles.fontStyle,
                !mobile && 'bg-base-100',
                {
                  'btn-active outline-2 outline-primary outline-offset-2':
                    isPresetActive(preset),
                },
              ]"
              :data-theme="
                mobile ? presetTheme(preset) || undefined : undefined
              "
              :style="presetSampleStyle(preset)"
              :title="preset.name"
              :aria-label="`应用用户预设 ${preset.name}`"
              :aria-pressed="isPresetActive(preset)"
              @click="applyPreset(preset)"
            >
              <span class="line-clamp-2 max-w-11 whitespace-normal break-all">
                {{ preset.name }}
              </span>
            </button>
            <button
              type="button"
              class="btn btn-circle btn-xs absolute -right-1 -top-1 size-5 min-h-0 border-base-300 bg-base-100 p-0 shadow-sm"
              :aria-label="`删除预设 ${preset.name}`"
              @click="store.removeReaderLayoutPreset(preset.id)"
            >
              <i class="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <form class="join mt-1 flex" @submit.prevent="savePreset">
          <input
            v-model="presetName"
            class="input input-sm join-item min-w-0 flex-1"
            maxlength="24"
            placeholder="保存当前排版为预设"
            aria-label="排版预设名称"
          />
          <button class="btn btn-sm join-item" type="submit">保存</button>
        </form>
      </footer>
    </section>
  </client-only>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useReaderStore } from "@/stores/readerStore";
import { useThemeStore } from "@/stores/themeStore";
import {
  FONTS,
  MOBILE_READING_MODE_OPTIONS,
  MOBILE_READER_COLOR_THEMES,
  READER_LAYOUT_STYLE_KEYS,
  READER_SYSTEM_PRESETS,
  READER_TYPOGRAPHY_CONTROLS,
  STYLE_CONFIG_KEYS,
} from "@/constants/reader";

const props = defineProps({
  showHeader: {
    type: Boolean,
    default: true,
  },
  mobile: {
    type: Boolean,
    default: false,
  },
});

const store = useReaderStore();
const themeStore = useThemeStore();
const {
  styleConfigs,
  mobileReadingMode,
  readerLayoutPresets,
  isMobileLayoutDefault,
  isReaderLayoutDefault,
} = storeToRefs(store);
const { theme: selectedSiteTheme, themeList: siteThemeList } =
  storeToRefs(themeStore);
const presetName = ref("");

const siteThemeOptions = computed(() => [
  {
    value: "default",
    label: "跟随系统",
    description: "自动匹配系统的浅色或深色外观",
    icon: "ri-contrast-line",
  },
  ...siteThemeList.value.map((theme) => ({
    ...theme,
    label: theme.name,
  })),
]);

const isLayoutDefault = computed(() =>
  props.mobile ? isMobileLayoutDefault.value : isReaderLayoutDefault.value,
);
const systemPresets = computed(() => {
  const presets = READER_SYSTEM_PRESETS.map((preset, index) => ({
    preset,
    label: `预设 ${index + 1}`,
  }));
  if (props.mobile) return presets;

  return presets.filter(
    ({ preset }, index, candidates) =>
      candidates.findIndex(({ preset: candidate }) =>
        READER_LAYOUT_STYLE_KEYS.every(
          (key) => candidate.styles[key] === preset.styles[key],
        ),
      ) === index,
  );
});

const formatNumericValue = (control) => {
  const value = Number(styleConfigs.value[control.key]);
  const normalizedValue = Number.isFinite(value) ? value : control.default;
  return `${Number(normalizedValue.toFixed(control.places))} ${control.unit}`;
};

const semanticReaderThemes = new Set(
  MOBILE_READER_COLOR_THEMES.map(({ value }) => value).filter(
    (value) => value !== "site",
  ),
);
const selectedColorTheme = computed(() => {
  const theme = styleConfigs.value.colorTheme;
  if (theme === "custom" || semanticReaderThemes.has(theme)) return theme;
  return styleConfigs.value.textColor || styleConfigs.value.backgroundColor
    ? "custom"
    : "site";
});
const previewTheme = computed(() =>
  semanticReaderThemes.has(selectedColorTheme.value)
    ? selectedColorTheme.value
    : "",
);

const previewStyle = computed(() => ({
  ...(props.mobile
    ? {
        backgroundColor:
          selectedColorTheme.value === "custom"
            ? styleConfigs.value.backgroundColor || "var(--color-base-200)"
            : "var(--color-base-200)",
        color:
          selectedColorTheme.value === "custom"
            ? styleConfigs.value.textColor || "var(--color-base-content)"
            : "var(--color-base-content)",
      }
    : {}),
  fontSize: `${Math.max(1, Number(styleConfigs.value.fontSize) || 20)}px`,
  letterSpacing: `${(Number(styleConfigs.value.fontGap) || 0) * 0.25}rem`,
  lineHeight: Number(styleConfigs.value.lineHeight) || 1.6,
}));
const previewParagraphGap = computed(() => {
  const fontSize = Math.max(1, Number(styleConfigs.value.fontSize) || 20);
  const lineHeight = Math.max(1, Number(styleConfigs.value.lineHeight) || 1.6);
  const paragraphGap = Math.max(0, Number(styleConfigs.value.paraHeight) || 0);
  return `${paragraphGap * fontSize * lineHeight}px`;
});

const presetTheme = (preset) =>
  semanticReaderThemes.has(preset?.styles?.colorTheme)
    ? preset.styles.colorTheme
    : "";
const presetSampleStyle = (preset) => {
  const sample = {
    letterSpacing: `${(Number(preset?.styles?.fontGap) || 0) * 0.125}rem`,
  };
  if (!props.mobile) return sample;

  const styles = preset?.styles || {};
  const custom =
    styles.colorTheme === "custom" ||
    (!styles.colorTheme && (styles.textColor || styles.backgroundColor));
  return {
    ...sample,
    backgroundColor: custom
      ? styles.backgroundColor || "var(--color-base-100)"
      : "var(--color-base-100)",
    color: custom
      ? styles.textColor || "var(--color-base-content)"
      : "var(--color-base-content)",
  };
};

const normalizePresetStyle = (preset, key) => {
  const styles = preset?.styles || {};
  if (key === "colorTheme") {
    return (
      styles.colorTheme ||
      (styles.textColor || styles.backgroundColor ? "custom" : "site")
    );
  }
  return styles[key];
};
const isPresetActive = (preset) => {
  const includesMobileAppearance = [
    "colorTheme",
    "textColor",
    "backgroundColor",
  ].some((key) => preset?.styles?.[key] !== undefined);
  const comparedKeys =
    props.mobile && includesMobileAppearance
      ? STYLE_CONFIG_KEYS.map(({ key }) => key)
      : READER_LAYOUT_STYLE_KEYS;
  const modeMatches =
    !props.mobile ||
    preset?.mode === undefined ||
    preset.mode === mobileReadingMode.value;

  return (
    modeMatches &&
    comparedKeys.every((key) => {
      const defaultValue = STYLE_CONFIG_KEYS.find(
        (item) => item.key === key,
      )?.default;
      const expected = normalizePresetStyle(preset, key);
      if (expected === undefined) return false;
      return typeof defaultValue === "number"
        ? Number(styleConfigs.value[key]) === Number(expected)
        : Object.is(styleConfigs.value[key], expected);
    })
  );
};

const applyPreset = (preset) => {
  if (props.mobile) store.applyMobileLayoutPreset(preset);
  else store.applyReaderLayoutPreset(preset);
};
const savePreset = () => {
  const saved = props.mobile
    ? store.saveMobileLayoutPreset(presetName.value)
    : store.saveReaderLayoutPreset(presetName.value);
  if (saved) presetName.value = "";
};
const resetLayout = () => {
  if (props.mobile) store.resetMobileLayout();
  else store.resetReaderLayout();
};
const selectColorTheme = (theme) => {
  store.setStyle("colorTheme", theme);
  if (theme === "custom") return;

  store.resetStyle("textColor");
  store.resetStyle("backgroundColor");
};
const setCustomColor = (key, value) => {
  store.setStyle("colorTheme", "custom");
  store.setStyle(key, value);
};
</script>
