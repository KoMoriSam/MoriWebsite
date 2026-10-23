<template>
  <div class="min-w-0">
    <table class="table w-full table-fixed">
      <caption class="mb-1 text-left text-sm font-medium text-base-content">
        <ExampleTitle :title-key="titleKey" :term-key="termKey" />
        <span
          v-if="noteKey"
          class="mt-1 block text-xs font-normal leading-5 text-base-content/60"
          >{{ translate(noteKey) }}</span
        >
      </caption>
      <colgroup>
        <col :class="compareForms ? 'w-[30%]' : 'w-[46%]'" />
        <col :class="compareForms ? 'w-[6%]' : 'w-[8%]'" />
        <col :class="compareForms ? 'w-[28%]' : 'w-[46%]'" />
        <col v-if="compareForms" class="w-[36%]" />
      </colgroup>
      <thead class="text-xs text-base-content/55">
        <tr class="border-base-300">
          <th scope="col" class="px-2 py-1 text-left font-medium">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <span class="min-w-0">FM Abhaya</span>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square ms-auto tooltip tooltip-left"
                :class="{ 'btn-active': showEncodings }"
                :aria-pressed="showEncodings"
                aria-controls="sinhala-converter-example-grid"
                :aria-label="
                  translate(
                    showEncodings
                      ? 'sinhala.info.showGlyphs'
                      : 'sinhala.info.showEncoding',
                  )
                "
                :title="
                  translate(
                    showEncodings
                      ? 'sinhala.info.showGlyphs'
                      : 'sinhala.info.showEncoding',
                  )
                "
                :data-tip="
                  translate(
                    showEncodings
                      ? 'sinhala.info.showGlyphs'
                      : 'sinhala.info.showEncoding',
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
              </button>
            </div>
          </th>
          <th scope="col" class="p-0">
            <span class="sr-only">{{
              translate("sinhala.info.conversionDirection")
            }}</span>
          </th>
          <th
            :scope="compareForms ? 'colgroup' : 'col'"
            :colspan="compareForms ? 2 : 1"
            class="px-2 py-1 text-left font-medium"
          >
            Abhaya Libre
            <p
              v-if="compareForms"
              class="mt-1 font-normal text-base-content/80"
            >
              {{ translate("sinhala.info.conjunctGlyph")
              }}<span class="text-base-content/55"
                >（{{ translate("sinhala.info.expandedForm") }}）</span
              >
            </p>
          </th>
        </tr>
      </thead>
      <tbody class="text-2xl leading-normal text-base-content">
        <tr
          v-for="(row, index) in rows"
          :key="index"
          class="border-base-300 align-middle"
        >
          <td class="min-w-0 px-2 py-1">
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
                  >{{ translate("sinhala.info.encodingAlternative") }}</span
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
            class="min-w-0 px-2 py-1 font-abhaya whitespace-pre-wrap wrap-anywhere"
            :class="targetClass"
            lang="si"
          >
            <span
              v-if="compareForms"
              class="whitespace-nowrap"
              :aria-label="translate('sinhala.info.conjunctGlyph')"
              >{{ row.unicode }}</span
            >
            <template v-else>{{ row.unicode }}</template>
          </td>
          <td
            v-if="compareForms"
            class="px-2 py-1 font-abhaya text-base-content/55"
            :aria-label="translate('sinhala.info.expandedForm')"
            lang="si"
          >
            <span v-if="row.plain" class="whitespace-nowrap"
              >({{ row.plain }})</span
            >
          </td>
        </tr>
      </tbody>
    </table>
    <p
      v-if="footerNoteKey"
      class="mt-2 border-t border-base-300 pt-2 text-xs leading-5 text-base-content/60"
    >
      {{ translate(footerNoteKey) }}
    </p>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
import ExampleTitle from "./ExampleTitle.vue";

const props = defineProps({
  titleKey: { type: String, required: true },
  termKey: { type: String, default: "" },
  noteKey: { type: String, default: "" },
  footerNoteKey: { type: String, default: "" },
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
