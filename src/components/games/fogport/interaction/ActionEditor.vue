<template>
  <dialog
    ref="dialog"
    class="modal"
    :aria-label="t('fogport.actions.' + kind)"
    @cancel.prevent="modalClose.requestPlatformClose()"
  >
    <div class="modal-box max-w-2xl">
      <div class="flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-3 font-serif text-xl font-bold">
          <i
            :class="ACTION_ICONS[kind]"
            class="text-primary"
            aria-hidden="true"
          ></i
          >{{ t("fogport.actions." + kind) }}
        </h2>
        <button
          class="btn btn-square btn-ghost btn-sm"
          :aria-label="t('common.modal.close')"
          @click="modalClose.requestClose()"
        >
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>
      <p class="my-3 text-sm leading-6 text-base-content/70">
        {{ t("fogport.actionHints." + kind) }}
      </p>
      <fieldset class="fieldset mb-4">
        <legend
          class="fieldset-legend flex w-full items-center justify-between gap-2"
        >
          <span>{{
            t(kind === "scout" ? "fogport.chooseThree" : "fogport.card")
          }}</span
          ><span
            v-if="kind === 'scout'"
            class="badge badge-sm"
            role="status"
            aria-live="polite"
            >{{ draft.cards.length }} / 3</span
          >
        </legend>
        <p v-if="kind === 'scout'" class="mb-2 text-xs text-base-content/60">
          {{ t("fogport.ui.scoutReplace") }}
        </p>
        <HandSelector
          :cards="availableCards"
          :selected="selection"
          :multiple="kind === 'scout'"
          :max="3"
          :disabled="!canAct || submitted"
          @change="selectCards"
        />
      </fieldset>
      <div class="rounded-box bg-base-200 p-4" role="status" aria-live="polite">
        <template v-if="preview.valid"
          ><h3 class="font-semibold">{{ t("fogport.preview") }}</h3>
          <div
            class="mt-3 grid grid-cols-3 divide-x divide-base-300 py-2 text-center"
          >
            <div
              v-for="stat in [
                {
                  icon: 'ri-coins-line',
                  value: preview.delta.money,
                  label: 'fogport.cash',
                },
                {
                  icon: 'ri-arrow-up-circle-line',
                  value: preview.delta.income,
                  label: 'fogport.incomeSpaces',
                },
                {
                  icon: 'ri-star-line',
                  value: preview.delta.vp,
                  label: 'fogport.vp',
                },
              ]"
              :key="stat.label"
            >
              <p class="text-lg font-bold">
                <i
                  :class="stat.icon"
                  class="text-sm text-primary"
                  aria-hidden="true"
                ></i
                >{{ signed(stat.value) }}
              </p>
              <p class="text-[10px] text-base-content/60">
                {{ t(stat.label) }}
              </p>
            </div>
          </div>
          <p
            v-if="kind === 'scout'"
            class="mt-2 flex items-center gap-2 text-xs"
          >
            <i class="ri-compass-3-line" aria-hidden="true"></i
            >{{ t("fogport.wild_location") }} + {{ t("fogport.wild_industry") }}
          </p>
          <p class="mt-2 text-xs text-base-content/60">
            {{ t("fogport.confirmHint") }}
          </p></template
        >
        <p
          v-else-if="kind === 'scout' && draft.cards.length !== 3"
          class="text-sm text-base-content/60"
        >
          {{ t("fogport.chooseThree") }} · {{ draft.cards.length }} / 3
        </p>
        <p v-else class="text-sm text-error">
          {{ t("fogport.errors." + preview.error) }}
        </p>
      </div>
      <p v-if="!canAct" class="mt-3 text-sm text-warning" role="status">
        {{ t("fogport.ui.offline") }}
      </p>
      <p v-if="error" class="mt-3 text-sm text-error" role="alert">
        {{ error }}
      </p>
      <div class="modal-action">
        <button class="btn" @click="emit('close')">
          {{ t("fogport.cancel") }}</button
        ><button
          class="btn btn-primary"
          :disabled="
            !preview.valid ||
            !canAct ||
            submitted ||
            (kind === 'scout' && draft.cards.length !== 3)
          "
          @click="submit"
        >
          <span
            v-if="submitted"
            class="loading loading-spinner loading-xs"
          ></span
          >{{ t("fogport.confirm") }}
        </button>
      </div>
    </div>
    <form
      method="dialog"
      class="modal-backdrop"
      @submit.prevent="modalClose.requestClose()"
    >
      <button>{{ t("fogport.cancel") }}</button>
    </form>
  </dialog>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue";
import { previewAction } from "../../../../../shared/games/fogport/engine.js";
import { legalActions } from "../../../../../shared/games/fogport/options.js";
import { ACTION_ICONS } from "@/games/fogport/presentation";
import HandSelector from "./HandSelector.vue";
import { useLocale } from "@/i18n";
import { useModalClose } from "@/composables/useModal";
const props = defineProps({
  game: { type: Object, required: true },
  initial: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
  error: { type: String, default: "" },
});
const emit = defineEmits(["close"]);
const { t } = useLocale(),
  dialog = ref(null),
  submitted = ref(false);
const kind = props.initial.kind,
  draft = reactive(JSON.parse(JSON.stringify(props.initial.command)));
const self = computed(() =>
  props.game.players.find((p) => p.id === props.game.selfId),
);
const command = computed(() => JSON.parse(JSON.stringify(draft)));
const availableCards = computed(() =>
  kind === "scout"
    ? self.value.hand
    : self.value.hand.filter((card) =>
        legalActions(props.game, props.game.selfId, kind).some(
          (c) => c.card === card.id,
        ),
      ),
);
const selection = computed(() =>
  kind === "scout" ? draft.cards : [draft.card],
);
const preview = computed(() =>
  previewAction(props.game, props.game.selfId, command.value),
);
function selectCards(ids) {
  if (!props.canAct || submitted.value) return;
  if (kind === "scout") draft.cards = ids;
  else if (ids.length === 1) draft.card = ids[0];
  draft.resources = [];
}
const signed = (value) => (value >= 0 ? "+" + value : value);
async function submit() {
  if (
    !preview.value.valid ||
    !props.canAct ||
    submitted.value ||
    (kind === "scout" && draft.cards.length !== 3)
  )
    return;
  submitted.value = true;
  try {
    const saved = await props.run(command.value.type, command.value);
    if (!saved) submitted.value = false;
  } catch {
    submitted.value = false;
  }
}
const modalClose = useModalClose({ onClose: () => emit("close") });
onMounted(() => {
  modalClose.activate();
  dialog.value.showModal();
});
onBeforeUnmount(() => dialog.value?.close());
</script>
