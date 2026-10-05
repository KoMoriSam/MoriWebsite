<template>
  <section
    role="status"
    aria-live="polite"
    class="card card-border min-w-0"
    :class="
      result.winner === 'good'
        ? 'border-success/40 bg-success/10'
        : result.winner === 'evil'
          ? 'border-error/40 bg-error/10'
          : 'border-base-300 bg-base-200/40'
    "
  >
    <div
      class="card-body items-center gap-2 p-4 text-center"
    >
      <span class="shrink-0 text-xs text-base-content/60">{{
        t("avalon.phases.finished")
      }}</span>
      <i
        class="shrink-0 text-3xl sm:text-5xl"
        :class="
          result.winner === 'good'
            ? 'ri-shield-check-line text-success'
            : result.winner === 'evil'
              ? 'ri-sword-line text-error'
              : 'ri-stop-circle-line text-base-content/60'
        "
        aria-hidden="true"
      ></i>
      <h3 class="shrink-0 font-serif text-base font-semibold sm:text-2xl">
        {{ t(`avalon.winners.${result.winner || "none"}`) }}
      </h3>
      <div class="max-w-full space-y-1 text-pretty text-xs leading-5 text-base-content/70 sm:text-sm sm:leading-6">
        <p>{{ t(`avalon.reasons.${result.reason}`) }}</p>
        <p v-if="won !== null && alignment">
          {{ t(won ? 'avalon.lancelot.won' : 'avalon.lancelot.lost', { side: t(`avalon.night.${alignment}`) }) }}
        </p>
        <p v-if="result.targetId">
          {{
            t(
              result.targetId === selfId
                ? "avalon.targetNameSelf"
                : "avalon.targetName",
              { name: playerName(result.targetId) },
            )
          }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLocale } from "@/i18n";
defineProps({
  result: { type: Object, required: true },
  selfId: { type: String, required: true },
  won: { type: Boolean, default: null },
  alignment: { type: String, default: null },
  playerName: { type: Function, required: true },
});
const { t } = useLocale();
</script>
