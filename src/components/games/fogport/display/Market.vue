<template>
  <div class="min-w-0 space-y-5">
    <section class="divide-y divide-base-300 border-y border-base-300">
      <article v-for="type in ['coal', 'iron']" :key="type" class="py-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 font-semibold">
            <i :class="INDUSTRY_ICONS[type]" aria-hidden="true"></i
            >{{ t(`fogport.resources.${type}`) }}
          </h3>
          <span class="text-xs text-base-content/60">{{
            t("fogport.info.marketStock", { n: game.markets[type] })
          }}</span>
        </div>
        <dl class="mt-2 flex items-baseline justify-between gap-2">
          <dt class="text-sm">{{ t("fogport.info.buyUnit") }}</dt>
          <dd class="font-semibold tabular-nums">
            <i class="ri-coins-line text-warning" aria-hidden="true"></i>
            {{ nextPrice(type) }}
          </dd>
        </dl>
        <dl
          class="mt-1 flex items-baseline justify-between gap-2 text-xs text-base-content/65"
        >
          <dt>{{ t("fogport.info.restockUnit") }}</dt>
          <dd class="tabular-nums">
            {{ restockPrice(type) ?? t("fogport.info.marketFull") }}
          </dd>
        </dl>
        <p v-if="!game.markets[type]" class="mt-1 text-xs text-warning">
          {{ t("fogport.info.externalSupply") }}
        </p>
        <p class="mt-2 text-xs leading-6 text-base-content/65">
          {{ t(`fogport.info.${type}Market`) }}
        </p>
      </article>
    </section>
    <p class="text-xs leading-6 text-base-content/65">
      {{ t("fogport.info.restockHint") }}
    </p>
    <section>
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <i class="ri-store-2-line" aria-hidden="true"></i
        >{{ t("fogport.merchant") }}
      </h3>
      <p class="mt-1 text-xs leading-6 text-base-content/65">
        {{ t("fogport.info.merchantHint") }}
      </p>
      <div v-for="port in activePorts" :key="port.id" class="mt-3">
        <h4 class="border-b border-base-300 pb-1.5 text-sm font-medium">
          {{ placeName(port.id, t) }}
        </h4>
        <ul class="divide-y divide-base-300/50">
          <li
            v-for="(merchant, index) in merchants(port.id)"
            :key="merchant.id"
            class="py-2 text-xs"
          >
            <p class="flex flex-wrap items-center gap-1.5">
              <span
                v-if="merchants(port.id).length > 1"
                class="text-base-content/50"
                >{{ t("fogport.info.buyer", { n: index + 1 }) }}</span
              ><span
                v-for="type in merchant.buys"
                :key="type"
                class="inline-flex items-center gap-1"
                ><i :class="INDUSTRY_ICONS[type]" aria-hidden="true"></i
                >{{ t(`fogport.industries.${type}`) }}</span
              ><span
                v-if="!merchant.buys.length"
                class="text-base-content/50"
                >{{ t("fogport.info.noBuyer") }}</span
              >
            </p>
            <template v-if="merchant.buys.length"
              ><p
                class="mt-1.5 flex items-center gap-1"
                :class="
                  merchant.beer ? 'text-base-content' : 'text-base-content/50'
                "
              >
                <i class="ri-goblet-line" aria-hidden="true"></i
                >{{
                  t(
                    merchant.beer
                      ? "fogport.info.merchantBeerReady"
                      : "fogport.info.merchantBeerUsed",
                  )
                }}
              </p>
              <p v-if="merchant.beer" class="mt-1 text-base-content/65">
                {{
                  t("fogport.info.beerReward", {
                    reward: t(`fogport.bonuses.${port.bonus}`),
                    n: port.amount,
                  })
                }}
              </p></template
            >
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
<script setup>
import { computed } from "vue";
import {
  PORTS,
  MARKET_PRICES,
} from "../../../../../shared/games/fogport/data.js";
import { INDUSTRY_ICONS, placeName } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({ game: { type: Object, required: true } });
const { t } = useLocale();
const merchants = (id) => props.game.merchants.filter((m) => m.location === id);
const activePorts = computed(() =>
  PORTS.filter((port) => merchants(port.id).length),
);
const nextPrice = (type) =>
  props.game.markets[type]
    ? MARKET_PRICES[type][MARKET_PRICES[type].length - props.game.markets[type]]
    : type === "coal"
      ? 8
      : 6;
const restockPrice = (type) =>
  MARKET_PRICES[type][
    MARKET_PRICES[type].length - 1 - props.game.markets[type]
  ];
</script>
