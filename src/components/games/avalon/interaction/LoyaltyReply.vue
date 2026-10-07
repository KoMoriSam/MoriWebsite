<template>
  <template v-if="request && popover">
    <RolePreviewPopover
      ref="replyPopover"
      :dialog-label="t('avalon.loyalty.title')"
      :columns="request.choices.length"
      :close-on-card-click="false"
      persistent
    >
      <LoyaltyReply preview :request="request" :can-act="canAct" :run="run" />
    </RolePreviewPopover>
  </template>
  <section
    v-else-if="request || result"
    class="min-w-0 shrink-0"
    :class="inline || preview ? 'contents' : 'space-y-2'"
    aria-live="polite"
  >
    <div
      :class="
        inline
          ? 'contents'
          : preview
            ? 'grid gap-3'
            : 'grid max-w-xs grid-cols-2 gap-2'
      "
      :style="
        preview
          ? { gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }
          : undefined
      "
    >
      <div
        v-for="(side, index) in choices"
        :key="side"
        class="relative min-w-0 w-full"
        :class="[
          inline || preview ? 'aspect-[2/3]' : 'aspect-[4/5]',
          inline && choices.length === 2
            ? index === 0
              ? 'col-start-1 row-start-2 sm:row-start-1'
              : 'col-start-2 row-start-2 sm:col-start-3 sm:row-start-1'
            : '',
        ]"
      >
        <div
          class="hover-3d h-full w-full rounded-box text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          :class="[
            result || (canAct && !submitting) ? 'cursor-pointer' : 'opacity-50',
            preview ? 'shadow-2xl' : '',
          ]"
          role="button"
          :tabindex="result || (canAct && !submitting) ? 0 : -1"
          :aria-disabled="!result && (!canAct || submitting)"
          :aria-busy="submitting"
          :aria-label="
            result
              ? t('common.modal.close')
              : t('avalon.loyalty.confirm', { side: t(`avalon.night.${side}`) })
          "
          @click="choose(side)"
          @keydown.enter.prevent="choose(side)"
          @keydown.space.prevent="choose(side)"
        >
          <article
            class="card card-border @container relative h-full w-full overflow-hidden bg-base-200/50"
            :class="side === 'good' ? 'border-success/40' : 'border-error/40'"
          >
            <img
              v-bind="getImageAttrs('/assets/images/games/avalon/card.webp', '192px')"
              alt=""
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              class="absolute inset-0 flex flex-col items-center bg-black/40 pt-[12%]"
            >
              <i
                :class="
                  side === 'good'
                    ? 'ri-shield-line text-success'
                    : 'ri-skull-line text-error'
                "
                class="text-2xl @2xs:text-5xl"
                aria-hidden="true"
              ></i>
            </div>
            <div
              class="absolute inset-x-0 bottom-0 flex max-h-[78%] flex-col items-center gap-2 overflow-y-auto overscroll-contain bg-gradient-to-t from-black/95 via-black/85 to-transparent px-2 pb-3 pt-6 text-white @2xs:gap-3 @2xs:px-4 @2xs:pb-5 @2xs:pt-10"
            >
              <span class="text-[10px] text-white/65 @2xs:text-xs">{{
                t(
                  result
                    ? result.source === "cleric"
                      ? "avalon.opening.title"
                      : "avalon.lady.title"
                    : "avalon.loyalty.cardTitle",
                )
              }}</span>
              <p
                v-if="result"
                class="w-full wrap-break-word text-sm font-medium @2xs:text-lg"
              >
                {{ playerName(result.targetId) }}
              </p>
              <h3
                class="font-serif text-base font-bold leading-tight @2xs:text-3xl"
                :class="side === 'good' ? 'text-success' : 'text-error'"
              >
                {{ t(`avalon.night.${side}`) }}
              </h3>
              <div
                v-if="result"
                class="space-y-1 border-y border-white/20 py-2 text-xs leading-5 text-white/80"
              >
                <p>{{ t("avalon.loyalty.private") }}</p>
                <p v-for="key in resultWarnings" :key="key">{{ t(key) }}</p>
              </div>
              <ul
                v-else
                class="w-full space-y-1 border-y border-white/20 py-2 text-[10px] leading-4 text-white/80 @2xs:space-y-2 @2xs:text-xs"
              >
                <li class="flex items-start justify-center gap-1.5">
                  <i
                    :class="
                      request.choices.length === 2
                        ? 'ri-emotion-line'
                        : 'ri-shield-check-line'
                    "
                    class="shrink-0"
                    aria-hidden="true"
                  ></i>
                  <span>{{
                    t(
                      request.choices.length === 2
                        ? "avalon.loyalty.mayDisguise"
                        : "avalon.loyalty.truthful",
                    )
                  }}</span>
                </li>
                <li class="flex items-start justify-center gap-1.5">
                  <i class="ri-eye-off-line shrink-0" aria-hidden="true"></i>
                  <span>{{ t("avalon.loyalty.privateCard") }}</span>
                </li>
              </ul>
              <span
                class="flex items-center justify-center gap-1.5 text-[10px] font-medium @2xs:text-sm"
              >
                <i class="ri-cursor-line" aria-hidden="true"></i>
                {{
                  t(result ? "common.modal.close" : "avalon.loyalty.chooseCard")
                }}
              </span>
              <span
                v-if="!result"
                class="flex items-start justify-center gap-1 text-[9px] leading-3 text-white/60 @2xs:text-xs @2xs:leading-4"
              >
                <i class="ri-lock-line shrink-0" aria-hidden="true"></i>
                <span>{{ t("avalon.loyalty.finalCard") }}</span>
              </span>
              <span
                v-if="submitting"
                class="loading loading-spinner loading-xs"
                aria-hidden="true"
              ></span>
            </div>
          </article>
          <div v-for="zone in 8" :key="zone" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
import { useModal } from "@/composables/useModal";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import RolePreviewPopover from "./RolePreviewPopover.vue";
import { loyaltyWarningKeys } from "@/games/avalon/presentation";
const props = defineProps({
  request: { type: Object, default: null },
  result: { type: Object, default: null },
  gameConfig: { type: Object, default: () => ({}) },
  playerName: { type: Function, default: () => "" },
  canAct: Boolean,
  run: { type: Function, required: true },
  inline: Boolean,
  popover: Boolean,
  preview: Boolean,
});
const emit = defineEmits(["dismiss"]);
const choices = computed(() =>
  props.result ? [props.result.alignment] : (props.request?.choices ?? []),
);
const resultWarnings = computed(() =>
  loyaltyWarningKeys(props.gameConfig, props.result?.source),
);
const { t } = useLocale();
const modal = useModal();
const submitting = ref(false);
const replyPopover = ref(null);
let confirmation = null;
function closeConfirmation() {
  confirmation?.close();
  confirmation = null;
}
watch(() => props.request?.id, closeConfirmation);
watch(
  [() => props.request?.id, () => props.popover],
  async ([id, asPopover]) => {
    if (!asPopover || !id) return;
    await nextTick();
    if (props.popover && props.request?.id === id)
      void replyPopover.value?.open();
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(closeConfirmation);
function choose(alignment) {
  if (props.result) emit("dismiss");
  else report(alignment);
}
function report(alignment) {
  if (
    !props.canAct ||
    submitting.value ||
    !props.request?.choices.includes(alignment)
  )
    return;
  const request = props.request;
  closeConfirmation();
  confirmation = modal.confirm(
    t("avalon.loyalty.title"),
    t("avalon.loyalty.confirm", { side: t(`avalon.night.${alignment}`) }),
    {
      onSubmit: async () => {
        if (
          !props.canAct ||
          submitting.value ||
          props.request?.id !== request.id ||
          !props.request?.choices.includes(alignment)
        )
          return;
        submitting.value = true;
        try {
          await props.run("report_loyalty", { alignment, checkId: request.id });
        } finally {
          submitting.value = false;
        }
      },
    },
  );
}
</script>
