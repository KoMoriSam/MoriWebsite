<template>
  <section class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="shrink-0 border-b border-base-300 bg-base-100 px-3 py-2.5">
      <div
        class="h-36 overflow-y-auto overscroll-contain rounded-box p-4 shadow-inner"
        :class="styleConfigs.fontStyle"
        :data-theme="previewTheme || undefined"
        :style="previewStyle"
        aria-label="当前排版预览"
      >
        <p class="m-0 indent-[2em] text-justify text-pretty">
          暮色沿着书页缓缓落下，字句之间留着呼吸。
        </p>
        <p
          class="mb-0 indent-[2em] text-justify text-pretty"
          :style="{ marginBlockStart: previewParagraphGap }"
        >
          翻过书页，故事仍在前方延伸。
        </p>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
      <div role="tablist" class="tabs tabs-sm tabs-box mb-3 w-full">
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
        <label class="min-w-0 col-span-2">
          <span class="label text-xs">正文字体</span>
          <select
            class="select select-sm w-full"
            :class="styleConfigs.fontStyle"
            :value="styleConfigs.fontStyle"
            @change="store.setStyle('fontStyle', $event.target.value)"
          >
            <option v-for="font in FONTS" :key="font.style" :value="font.style">
              {{ font.name }}
            </option>
          </select>
        </label>
        <label
          v-for="control in READER_TYPOGRAPHY_CONTROLS"
          :key="control.key"
          class="min-w-0 col-span-1"
        >
          <span class="label text-xs block">
            {{ control.shortLabel }} {{ formatNumericValue(control) }}
          </span>
          <input
            type="range"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            class="range range-xs w-full mt-2"
            :value="styleConfigs[control.key]"
            @input="store.setStyle(control.key, Number($event.target.value))"
          />
        </label>
      </div>

      <fieldset class="mt-4">
        <legend class="label text-xs">阅读配色</legend>
        <div class="mt-2 grid grid-cols-4 gap-2">
          <button
            v-for="theme in MOBILE_READER_COLOR_THEMES"
            :key="theme.value"
            type="button"
            class="btn btn-sm h-auto min-h-12 flex-col gap-0.5 px-1 py-1.5"
            :class="{
              'outline-2 outline-primary': selectedColorTheme === theme.value,
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
        <label class="input input-sm flex items-center justify-between gap-2">
          <span class="text-xs">文字颜色</span>
          <input
            type="color"
            class="size-7 cursor-pointer border-0 bg-transparent p-0"
            :value="styleConfigs.textColor || '#1f2937'"
            @input="setCustomColor('textColor', $event.target.value)"
          />
        </label>
        <label class="input input-sm flex items-center justify-between gap-2">
          <span class="text-xs">背景颜色</span>
          <input
            type="color"
            class="size-7 cursor-pointer border-0 bg-transparent p-0"
            :value="styleConfigs.backgroundColor || '#ffffff'"
            @input="setCustomColor('backgroundColor', $event.target.value)"
          />
        </label>
      </div>
    </div>

    <footer
      class="shrink-0 border-t border-base-300 bg-base-100 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div class="mb-2">
        <div
          class="flex gap-3 overflow-x-auto px-1 py-1"
          aria-label="系统推荐与用户保存的排版预设"
        >
          <button
            v-for="(preset, index) in MOBILE_READER_SYSTEM_PRESETS"
            :key="preset.id"
            type="button"
            class="btn btn-circle flex-col gap-0 size-12 shrink-0 border-base-300 p-0 text-[0.6875rem] shadow-sm"
            :class="[
              {
                'btn-active outline-2 outline-primary outline-offset-2':
                  isPresetActive(preset),
              },
            ]"
            :data-theme="presetTheme(preset) || undefined"
            :style="presetSampleStyle(preset)"
            :title="preset.description"
            :aria-label="`应用系统推荐预设 ${preset.name}：${preset.description}`"
            :aria-pressed="isPresetActive(preset)"
            @click="store.applyMobileLayoutPreset(preset)"
          >
            <span>预设{{ index + 1 }}</span>
            <span :class="preset.styles.fontStyle">
              {{ preset.name }}
            </span>
          </button>

          <div
            v-for="preset in mobileLayoutPresets"
            :key="preset.id"
            class="relative shrink-0"
          >
            <button
              type="button"
              class="btn btn-circle size-14 border-base-300 p-1 text-[0.625rem] leading-tight shadow-sm"
              :class="[
                preset.styles.fontStyle,
                {
                  'btn-active outline-2 outline-primary outline-offset-2':
                    isPresetActive(preset),
                },
              ]"
              :data-theme="presetTheme(preset) || undefined"
              :style="presetSampleStyle(preset)"
              :title="preset.name"
              :aria-label="`应用用户预设 ${preset.name}`"
              :aria-pressed="isPresetActive(preset)"
              @click="store.applyMobileLayoutPreset(preset)"
            >
              <span class="line-clamp-2 max-w-11 whitespace-normal break-all">
                {{ preset.name }}
              </span>
            </button>
            <button
              type="button"
              class="btn btn-circle btn-xs absolute -top-1 -right-1 size-5 min-h-0 border-base-300 bg-base-100 p-0 shadow-sm"
              :aria-label="`删除预设 ${preset.name}`"
              @click="store.removeMobileLayoutPreset(preset.id)"
            >
              <i class="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
      <form class="join flex" @submit.prevent="savePreset">
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
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useReaderStore } from "@/stores/readerStore";
import {
  FONTS,
  MOBILE_READING_MODE_OPTIONS,
  MOBILE_READER_COLOR_THEMES,
  MOBILE_READER_SYSTEM_PRESETS,
  READER_TYPOGRAPHY_CONTROLS,
  STYLE_CONFIG_KEYS,
} from "@/constants/reader";

const store = useReaderStore();
const { styleConfigs, mobileReadingMode, mobileLayoutPresets } =
  storeToRefs(store);
const presetName = ref("");
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
  backgroundColor:
    selectedColorTheme.value === "custom"
      ? styleConfigs.value.backgroundColor || "var(--color-base-200)"
      : "var(--color-base-200)",
  color:
    selectedColorTheme.value === "custom"
      ? styleConfigs.value.textColor || "var(--color-base-content)"
      : "var(--color-base-content)",
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
  const styles = preset?.styles || {};
  const custom =
    styles.colorTheme === "custom" ||
    (!styles.colorTheme && (styles.textColor || styles.backgroundColor));
  return {
    backgroundColor: custom
      ? styles.backgroundColor || "var(--color-base-100)"
      : "var(--color-base-100)",
    color: custom
      ? styles.textColor || "var(--color-base-content)"
      : "var(--color-base-content)",
    letterSpacing: `${(Number(styles.fontGap) || 0) * 0.125}rem`,
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
const isPresetActive = (preset) =>
  preset?.mode === mobileReadingMode.value &&
  STYLE_CONFIG_KEYS.every(({ key, default: defaultValue }) => {
    const expected = normalizePresetStyle(preset, key);
    if (expected === undefined) return false;
    return typeof defaultValue === "number"
      ? Number(styleConfigs.value[key]) === Number(expected)
      : Object.is(styleConfigs.value[key], expected);
  });

const savePreset = () => {
  if (store.saveMobileLayoutPreset(presetName.value)) presetName.value = "";
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
