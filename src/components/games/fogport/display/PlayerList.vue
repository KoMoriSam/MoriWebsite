<template>
  <div class="min-w-0">
    <ol class="divide-y divide-base-300">
      <li v-for="(id, index) in game.order" :key="id" class="py-3 first:pt-0">
        <div
          class="border-l-2 pl-3"
          :class="id === game.actorId ? 'border-primary' : 'border-transparent'"
        >
          <div class="flex items-center gap-3">
            <Avatar
              :src="profile(id)?.avatarUrl"
              :name="player(id).nickname"
              :class="profile(id)?.online ? 'avatar-online' : 'avatar-offline'"
            />
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-1.5 text-sm font-semibold">
                <ArtIcon
                  :asset="companyArtName(player(id).seat)"
                  :icon="PLAYER_ICONS[player(id).seat]"
                  :class="tones[player(id).seat]"
                /><span class="truncate">{{ player(id).nickname }}</span
                ><span
                  v-if="id === game.selfId"
                  class="badge badge-ghost badge-xs"
                  >{{ t("fogport.info.you") }}</span
                >
              </p>
              <p class="mt-1 text-xs text-base-content/60">
                {{ t("fogport.visual.turnOrder", { n: index + 1 }) }} ·
                {{ t("fogport.info.roundSpent", { n: player(id).spent }) }}
              </p>
            </div>
            <span
              v-if="id === game.actorId"
              class="badge badge-primary badge-sm shrink-0"
              >{{
                game.phase === "liquidation"
                  ? t("fogport.liquidate")
                  : t("fogport.active")
              }}</span
            >
          </div>
          <dl class="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt class="text-xs text-base-content/60">
                {{ t("fogport.cash") }}
              </dt>
              <dd class="mt-1 font-semibold tabular-nums">
                <i class="ri-coins-line text-warning" aria-hidden="true"></i>
                {{ player(id).money }}
              </dd>
            </div>
            <div
              class="tooltip tooltip-bottom text-left"
              :data-tip="t('fogport.info.incomeHint')"
            >
              <dt class="text-xs text-base-content/60">
                {{ t("fogport.info.roundIncome") }}
              </dt>
              <dd
                class="mt-1 font-semibold tabular-nums"
                :class="incomeLevel(player(id).income) < 0 ? 'text-error' : ''"
              >
                {{ signed(incomeLevel(player(id).income)) }}
              </dd>
            </div>
            <div
              class="tooltip tooltip-bottom text-left"
              :data-tip="t('fogport.info.scoreHint')"
            >
              <dt class="text-xs text-base-content/60">
                {{ t("fogport.info.scored") }}
              </dt>
              <dd class="mt-1 font-semibold tabular-nums">
                <i class="ri-star-line text-primary" aria-hidden="true"></i>
                {{ player(id).vp }}
              </dd>
            </div>
          </dl>
          <details class="mt-3 text-xs">
            <summary class="cursor-pointer text-base-content/60">
              {{ t("fogport.info.companyDetails") }}
            </summary>
            <div class="mt-2 space-y-2 leading-6">
              <p>{{ t("fogport.info.stockHint") }}</p>
              <div class="grid grid-cols-2 gap-x-3">
                <span v-for="type in INDUSTRIES" :key="type"
                  ><i :class="INDUSTRY_ICONS[type]" aria-hidden="true"></i>
                  {{ t(`fogport.industries.${type}`) }}
                  <b>{{ player(id).inventory[type].length }}</b></span
                >
              </div>
              <p>
                {{
                  t("fogport.info.handAndLinks", {
                    cards: player(id).handCount,
                    links:
                      14 -
                      game.links.filter((link) => link.owner === id).length,
                  })
                }}
              </p>
              <p v-if="player(id).discard.length" class="text-base-content/65">
                {{ t("fogport.discard") }}:
                {{
                  player(id)
                    .discard.map((card) => cardName(card, t))
                    .join(" / ")
                }}
              </p>
            </div>
          </details>
        </div>
      </li>
    </ol>
    <p class="mt-2 text-xs leading-6 text-base-content/60">
      {{ t("fogport.orderHint") }}
    </p>
  </div>
</template>
<script setup>
import Avatar from "@/components/auth/Avatar.vue";
import ArtIcon from "./ArtIcon.vue";
import {
  INDUSTRIES,
  incomeLevel,
} from "../../../../../shared/games/fogport/data.js";
import {
  PLAYER_ICONS,
  INDUSTRY_ICONS,
  cardName,
} from "@/games/fogport/presentation";
import { companyArtName } from "@/games/fogport/art-assets";
import { useLocale } from "@/i18n";
const props = defineProps({
  game: { type: Object, required: true },
  players: { type: Array, default: () => [] },
});
const { t } = useLocale();
const player = (id) => props.game.players.find((p) => p.id === id);
const profile = (id) => props.players.find((p) => p.id === id);
const signed = (n) => `${n >= 0 ? "+" : ""}${n}`;
const tones = ["text-primary", "text-secondary", "text-accent", "text-info"];
</script>
