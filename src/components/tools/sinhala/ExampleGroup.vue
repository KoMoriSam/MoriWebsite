<template>
  <div class="min-w-0">
    <table class="table w-full table-fixed">
      <caption class="mb-2 text-left text-sm font-medium text-base-content">
        <ExampleTitle :title-key="titleKey" :term-key="termKey" />
        <span
          v-if="noteKey"
          class="mt-1 block text-xs font-normal leading-6 text-base-content/60"
          >{{ translate(noteKey) }}</span
        >
      </caption>
      <colgroup>
        <col class="w-[46%]" />
        <col class="w-[8%]" />
        <col class="w-[46%]" />
      </colgroup>
      <thead class="text-xs text-base-content/55">
        <tr class="border-base-300">
          <th scope="col" class="px-2 py-2 text-left font-medium">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <span class="min-w-0">FM Abhaya</span>
              <button
                type="button"
                class="btn btn-ghost btn-xs ms-auto max-lg:tooltip max-lg:tooltip-left"
                :class="{ 'btn-active': showEncodings }"
                :aria-pressed="showEncodings"
                aria-controls="sinhala-converter-example-grid"
                :aria-label="
                  translate(
                    showEncodings
                      ? 'tools.info.showGlyphs'
                      : 'tools.info.showEncoding',
                  )
                "
                :title="
                  translate(
                    showEncodings
                      ? 'tools.info.showGlyphs'
                      : 'tools.info.showEncoding',
                  )
                "
                :data-tip="
                  translate(
                    showEncodings
                      ? 'tools.info.showGlyphs'
                      : 'tools.info.showEncoding',
                  )
                "
                @click="emit('toggle-encoding')"
              >
                <i
                  v-if="showEncodings"
                  class="ri-font-size-2 text-sm"
                  aria-hidden="true"
                ></i>
                <i v-else class="ri-code-line text-sm" aria-hidden="true"></i>
                <span class="hidden lg:block">
                  {{
                    translate(
                      showEncodings
                        ? "tools.info.showGlyphs"
                        : "tools.info.showEncoding",
                    )
                  }}
                </span>
              </button>
            </div>
          </th>
          <th scope="col" class="p-0">
            <span class="sr-only">{{
              translate("tools.info.conversionDirection")
            }}</span>
          </th>
          <th scope="col" class="px-2 py-2 text-left font-medium">
            Abhaya Libre
            <p
              v-if="compareForms"
              class="mt-1 font-normal text-base-content/80"
            >
              {{ translate("tools.info.conjunctGlyph")
              }}<span class="text-base-content/55"
                >（{{ translate("tools.info.plainForm") }}）</span
              >
            </p>
          </th>
        </tr>
      </thead>
      <tbody class="text-2xl leading-loose text-base-content">
        <tr
          v-for="(row, index) in rows"
          :key="index"
          class="border-base-300 align-middle"
        >
          <td class="min-w-0 px-2 py-1.5">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                v-for="(legacy, legacyIndex) in visibleLegacyInputs(row)"
                :key="legacy"
                class="inline-flex min-w-0 items-baseline gap-x-3"
              >
                <span
                  v-if="showEncodings && legacyIndex > 0"
                  class="shrink-0 font-serif text-xs text-base-content/55"
                  :lang="locale"
                  >{{ translate("tools.info.encodingAlternative") }}</span
                >
                <span
                  class="min-w-0"
                  :class="[
                    showEncodings ? 'font-mono text-lg' : 'font-abhaya-legacy',
                    row.sourceSegments
                      ? 'whitespace-pre-wrap wrap-anywhere'
                      : 'whitespace-nowrap',
                  ]"
                  :lang="showEncodings ? undefined : 'si'"
                >
                  <template v-if="row.sourceSegments && !showEncodings">
                    <span
                      v-for="(segment, segmentIndex) in row.sourceSegments"
                      :key="segmentIndex"
                      :class="
                        segment.useLegacyFont
                          ? 'font-abhaya-legacy'
                          : 'font-abhaya'
                      "
                    >
                      {{ segment.text }}
                    </span>
                  </template>
                  <template v-else>{{ legacy }}</template>
                </span>
              </span>
            </div>
          </td>
          <td
            class="p-0 text-center text-sm text-base-content/40"
            aria-hidden="true"
          >
            →
          </td>
          <td
            class="min-w-0 px-2 py-1.5 font-abhaya whitespace-pre-wrap wrap-anywhere"
            :class="targetClass"
            lang="si"
          >
            <div
              v-if="compareForms && row.plain"
              class="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              <span class="min-w-0">
                <span
                  class="whitespace-nowrap"
                  :aria-label="translate('tools.info.conjunctGlyph')"
                  >{{ row.unicode }}</span
                >
              </span>
              <span
                class="whitespace-nowrap text-base-content/55"
                :aria-label="translate('tools.info.plainForm')"
                >({{ row.plain }})</span
              >
            </div>
            <template v-else>{{ row.unicode }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
import ExampleTitle from "./ExampleTitle.vue";

const props = defineProps({
  titleKey: { type: String, required: true },
  termKey: { type: String, default: "" },
  noteKey: { type: String, default: "" },
  compareForms: { type: Boolean, default: false },
  rows: { type: Array, required: true },
  showEncodings: { type: Boolean, default: false },
  targetClass: { type: String, default: "" },
});

const { t: translate, locale } = useLocale();
const emit = defineEmits(["toggle-encoding"]);

function visibleLegacyInputs(row) {
  if (props.showEncodings) return row.legacyInputs;
  const singleSlot = row.legacyInputs.find(
    (legacy) => Array.from(legacy).length === 1,
  );
  return [singleSlot ?? row.legacyInputs[0]];
}
</script>
