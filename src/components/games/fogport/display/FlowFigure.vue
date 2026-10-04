<template>
  <figure
    class="flex h-full flex-col overflow-hidden rounded-box bg-base-200/60 p-2"
    :aria-label="caption"
    aria-live="off"
  >
    <svg
      viewBox="0 0 300 120"
      preserveAspectRatio="xMidYMid meet"
      class="block min-h-0 w-full flex-1"
      aria-hidden="true"
    >
      <template v-if="step === 'turn' || step === 'maintenance'">
        <g
          v-for="(name, index) in [
            t('fogport.visual.demoA'),
            t('fogport.visual.demoB'),
          ]"
          :key="index"
          :transform="playerPosition(index)"
          class="flow-move"
        >
          <circle
            r="22"
            class="fill-base-100"
            :class="
              step === 'turn' && (frame < 3 ? index === 0 : index === 1)
                ? 'stroke-primary'
                : 'stroke-base-300'
            "
            stroke-width="3"
          />
          <text
            y="6"
            text-anchor="middle"
            class="fill-base-content text-[19px] font-bold"
          >
            {{ name }}
          </text>
          <foreignObject x="-42" y="33" width="84" height="34"
            ><div
              class="flex h-full items-center justify-center gap-1.5 text-sm"
            >
              <i
                :class="step === 'turn' ? 'ri-stack-line' : 'ri-coins-line'"
              ></i
              ><b>{{
                step === "turn"
                  ? index === 0
                    ? [8, 7, 6, 8][frame]
                    : 8
                  : frame === 3
                    ? index === 0
                      ? "+4"
                      : "+2"
                    : index === 0
                      ? 8
                      : 3
              }}</b>
            </div></foreignObject
          >
        </g>
        <foreignObject x="116" y="21" width="68" height="36"
          ><div
            class="flex h-full items-center justify-center gap-2 text-primary"
          >
            <template v-if="step === 'turn'"
              ><i
                v-for="n in 2"
                :key="n"
                class="ri-flashlight-line text-xl"
                :class="n > [2, 1, 0, 2][frame] ? 'text-base-content/20' : ''"
              ></i></template
            ><i
              v-else
              :class="
                frame === 3
                  ? 'ri-coins-line'
                  : frame < 2
                    ? 'ri-sort-asc'
                    : 'ri-arrow-right-line'
              "
              class="text-2xl"
            ></i></div
        ></foreignObject>
        <foreignObject
          v-if="step === 'turn'"
          :x="frame === 3 ? 197 : 73"
          y="25"
          width="28"
          height="28"
          class="flow-move"
          ><div class="flex h-full items-center justify-center text-primary">
            <i class="ri-arrow-right-line text-xl"></i></div
        ></foreignObject>
        <text
          v-if="step === 'maintenance'"
          x="150"
          y="114"
          text-anchor="middle"
          class="fill-base-content text-[12px]"
        >
          {{
            t(frame === 3 ? "fogport.info.roundIncome" : "fogport.visual.spent")
          }}
        </text>
      </template>
      <template v-else-if="step === 'build' || step === 'network'">
        <foreignObject x="240" y="6" width="48" height="43"
          ><div
            class="flex h-full items-center justify-center text-2xl text-base-content/40"
          >
            <i class="ri-delete-bin-line"></i></div
        ></foreignObject>
        <g
          :transform="'translate(' + (frame >= 1 ? 250 : 28) + ',10)'"
          class="flow-move"
        >
          <rect
            width="28"
            height="40"
            rx="3"
            class="fill-base-100 stroke-base-content/40"
          />
          <foreignObject x="2" y="4" width="24" height="32"
            ><div class="flex h-full items-center justify-center text-xl">
              <i
                :class="step === 'build' ? 'ri-map-pin-line' : 'ri-stack-line'"
              ></i></div
          ></foreignObject>
        </g>
        <foreignObject x="80" y="8" width="136" height="40"
          ><div class="flex h-full items-center justify-center gap-3 text-sm">
            <span class="inline-flex items-center gap-1"
              ><i class="ri-coins-line text-warning"></i
              ><b>{{ frame >= 2 ? 0 : step === "build" ? 5 : 3 }}</b></span
            ><span
              v-if="step === 'build'"
              class="inline-flex items-center gap-1"
              ><i class="ri-hammer-line"></i
              ><b>{{ frame >= 2 ? 0 : 1 }}</b></span
            >
          </div></foreignObject
        >
        <template v-if="step === 'build'">
          <rect
            x="207"
            y="61"
            width="64"
            height="42"
            rx="4"
            stroke-dasharray="4 3"
            class="fill-none stroke-primary"
          />
          <g
            :transform="'translate(' + (frame === 3 ? 215 : 96) + ',62)'"
            class="flow-move"
          >
            <rect
              width="48"
              height="40"
              rx="4"
              class="fill-base-100 stroke-primary"
              stroke-width="2"
            />
            <foreignObject x="1" y="2" width="46" height="36"
              ><div
                class="flex h-full items-center justify-center gap-1 text-primary"
              >
                <i class="ri-goblet-line text-xl"></i
                ><b>{{ frame === 3 ? 1 : "I" }}</b>
              </div></foreignObject
            >
          </g>
          <text
            x="239"
            y="118"
            text-anchor="middle"
            class="fill-base-content text-[11px]"
          >
            {{ placeName("d3", t) }}
          </text>
        </template>
        <template v-else>
          <path
            d="M52 83 H244"
            class="stroke-base-content/20"
            stroke-width="3"
          />
          <path
            d="M52 83 H244"
            pathLength="1"
            stroke-dasharray="1"
            :stroke-dashoffset="frame === 3 ? 0 : 1"
            class="flow-route stroke-primary"
            stroke-width="5"
          />
          <circle
            cx="52"
            cy="83"
            r="19"
            class="fill-base-100 stroke-primary"
            stroke-width="2"
          />
          <circle
            cx="244"
            cy="83"
            r="19"
            class="fill-base-100"
            :class="frame === 3 ? 'stroke-primary' : 'stroke-base-300'"
            stroke-width="2"
          />
          <foreignObject x="37" y="68" width="30" height="30"
            ><div
              class="flex h-full items-center justify-center text-xl text-primary"
            >
              <i class="ri-building-2-line"></i></div
          ></foreignObject>
          <foreignObject x="229" y="68" width="30" height="30"
            ><div class="flex h-full items-center justify-center text-xl">
              <i class="ri-map-pin-line"></i></div
          ></foreignObject>
          <text
            x="52"
            y="118"
            text-anchor="middle"
            class="fill-base-content text-[11px]"
          >
            {{ placeName("d3", t) }}
          </text>
          <text
            x="244"
            y="118"
            text-anchor="middle"
            class="fill-base-content text-[11px]"
          >
            {{ placeName("d15", t) }}
          </text>
        </template>
      </template>
      <template v-else-if="step === 'sell'">
        <path d="M69 42 H228" class="stroke-base-content/30" stroke-width="3" />
        <foreignObject x="15" y="15" width="58" height="58"
          ><div
            class="flex h-full items-center justify-center rounded-field border-2"
            :class="
              frame >= 2
                ? 'border-success bg-success/15 text-success'
                : 'border-primary bg-base-100 text-primary'
            "
          >
            <i
              :class="frame >= 2 ? 'ri-check-double-line' : 'ri-t-shirt-line'"
              class="text-3xl"
            ></i
            ><small>I</small>
          </div></foreignObject
        >
        <foreignObject x="232" y="15" width="54" height="56"
          ><div class="flex h-full items-center justify-center text-4xl">
            <i class="ri-store-2-line"></i></div
        ></foreignObject>
        <foreignObject
          :x="frame >= 1 ? 80 : 184"
          y="21"
          width="38"
          height="34"
          class="flow-move"
          ><div
            class="flex h-full items-center justify-center gap-1 text-primary"
            :class="frame >= 2 ? 'invisible' : ''"
          >
            <i class="ri-goblet-line text-xl"></i><b>1</b>
          </div></foreignObject
        >
        <foreignObject x="12" y="80" width="132" height="33"
          ><div
            class="flex h-full items-center justify-center gap-1 text-xs"
            :class="frame >= 2 ? 'text-success' : 'text-base-content/40'"
          >
            <i class="ri-arrow-up-circle-line text-xl"></i
            >{{ frame >= 2 ? "+5" : "0" }} {{ t("fogport.incomeSpaces") }}
          </div></foreignObject
        >
        <foreignObject x="179" y="80" width="109" height="33"
          ><div
            class="flex h-full items-center justify-center gap-2 text-sm"
            :class="frame === 3 ? 'text-primary' : 'text-base-content/40'"
          >
            <i class="ri-star-line text-xl"></i>{{ frame === 3 ? "+4" : "0" }}
          </div></foreignObject
        >
      </template>
      <template v-else>
        <foreignObject x="10" y="17" width="72" height="68"
          ><div class="flex h-full flex-col items-center justify-center gap-1">
            <i
              :class="
                frame < 2
                  ? 'ri-ship-line text-primary'
                  : 'ri-train-line text-secondary'
              "
              class="text-3xl"
            ></i
            ><span class="text-xs">{{
              t(frame < 2 ? "fogport.canal" : "fogport.rail")
            }}</span>
          </div></foreignObject
        >
        <foreignObject x="97" y="17" width="88" height="68"
          ><div
            class="flex h-full items-center justify-center gap-2 text-primary"
          >
            <i
              class="ri-route-line text-2xl"
              :class="frame === 1 || frame === 2 ? 'invisible' : ''"
            ></i
            ><i
              class="ri-star-line text-2xl"
              :class="frame === 1 ? 'invisible' : ''"
            ></i></div
        ></foreignObject>
        <foreignObject x="211" y="17" width="75" height="68"
          ><div
            class="flex h-full flex-col items-center justify-center gap-1 text-sm"
          >
            <i
              :class="
                frame === 3
                  ? 'ri-trophy-line text-warning'
                  : frame === 1
                    ? 'ri-delete-bin-line'
                    : 'ri-building-2-line'
              "
              class="text-3xl"
            ></i
            ><span>{{
              frame === 1 ? "I" : frame === 2 ? "II+" : t("fogport.vp")
            }}</span>
          </div></foreignObject
        >
        <path
          v-if="frame === 0 || frame === 3"
          d="M178 52 H204"
          class="stroke-primary"
          stroke-width="2"
        />
      </template>
    </svg>
    <figcaption
      class="mt-1 flex min-h-10 shrink-0 items-center justify-center text-center text-xs leading-5"
    >
      <span class="mr-1.5 font-semibold tabular-nums text-primary"
        >{{ frame + 1 }}.</span
      >{{ caption }}
    </figcaption>
  </figure>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { usePreferredReducedMotion } from "@vueuse/core";
import { placeName } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({ step: { type: String, required: true } });
const emit = defineEmits(["cycle-complete"]);
const { t } = useLocale();
const reduced = usePreferredReducedMotion(),
  phase = ref(0),
  frame = computed(() => (reduced.value === "reduce" ? 3 : phase.value));
const caption = computed(() =>
  t("fogport.visual.film." + props.step + "." + frame.value),
);
const playerPosition = (index) =>
  "translate(" +
  (props.step === "maintenance" && frame.value >= 2
    ? index
      ? 52
      : 248
    : index
      ? 248
      : 52) +
  ",37)";
let timer;
function restart() {
  clearInterval(timer);
  phase.value = 0;
  if (reduced.value !== "reduce")
    timer = setInterval(() => {
      if (phase.value === 3) {
        emit("cycle-complete", props.step);
        phase.value = 0;
      } else phase.value++;
    }, 1800);
}
onMounted(restart);
watch(() => [props.step, reduced.value], restart);
onBeforeUnmount(() => clearInterval(timer));
</script>
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .flow-move {
    transition:
      transform 600ms ease,
      x 600ms ease;
  }
  .flow-route {
    transition: stroke-dashoffset 700ms ease;
  }
}
</style>
