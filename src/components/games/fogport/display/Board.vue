<template>
  <div
    class="relative flex min-h-0 flex-col overflow-hidden rounded-box border border-base-300 bg-base-200"
    :aria-label="t('fogport.board')"
  >
    <div class="absolute right-2 top-2 z-10 flex gap-1">
      <button
        class="btn btn-square btn-xs"
        :aria-label="t('fogport.zoomOut')"
        @click="zoom(-0.2)"
      >
        <i class="ri-subtract-line" aria-hidden="true"></i>
      </button>
      <button
        class="btn btn-square btn-xs"
        :aria-label="t('fogport.zoomIn')"
        @click="zoom(0.2)"
      >
        <i class="ri-add-line" aria-hidden="true"></i>
      </button>
      <button
        class="btn btn-square btn-xs"
        :aria-label="t('fogport.reset')"
        :title="t('fogport.reset')"
        @click="reset"
      >
        <i class="ri-focus-3-line" aria-hidden="true"></i>
      </button>
    </div>
    <span
      v-if="!mapArt"
      class="pointer-events-none absolute left-2 top-2 z-10 truncate max-lg:top-14 rounded bg-base-100/80 px-2 py-1 text-[9px] text-base-content/45 max-sm:max-w-[calc(100%-11rem)]"
      ><i class="ri-image-line" aria-hidden="true"></i>
      {{ t("fogport.visual.mapArt") }} · 1:1 · 1254 × 1254</span
    >
    <svg
      ref="svg"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      class="block min-h-0 w-full flex-1 touch-none select-none"
      role="group"
      :aria-label="t('fogport.board')"
      @pointerdown="panStart"
      @pointermove="panMove"
      @pointerup="panEnd"
      @pointercancel="panEnd"
      @wheel.prevent="wheel"
    >
      <defs v-if="routeArt">
        <pattern
          :id="routePatternId"
          patternUnits="userSpaceOnUse"
          width="125"
          height="10"
        >
          <image
            :key="routeArt"
            :href="routeArt"
            width="125"
            height="10"
            preserveAspectRatio="xMidYMid meet"
            @error="onArtError"
          />
        </pattern>
      </defs>
      <g :transform="transform(offset.x, offset.y, scale)">
        <g v-if="mapArt" pointer-events="none">
          <image
            :key="mapArt"
            :href="mapArt"
            x="0"
            y="0"
            width="1000"
            height="1000"
            preserveAspectRatio="xMidYMid meet"
            @error="onArtError"
          />
          <rect
            x="0"
            y="0"
            width="1000"
            height="1000"
            class="fill-base-100"
            opacity="0.38"
          />
        </g>
        <rect
          v-else
          x="5"
          y="5"
          width="990"
          height="990"
          rx="24"
          fill="none"
          stroke="currentColor"
          stroke-dasharray="12 10"
          class="text-base-content/10"
        />
        <g
          v-for="link in visibleLinks"
          :key="link.id"
          :opacity="linkAvailable(link) ? dim('link:' + link.id) : activeMode ? 0.22 : 0.55"
          @pointerenter="hover('link:' + link.id)"
          @pointerleave="hover(null)"
          :data-fogport-drop="linkAvailable(link) ? `link:${link.id}` : undefined"
          class="outline-none"
          role="button"
          :tabindex="canInteract('link:' + link.id) ? 0 : -1"
          :aria-disabled="!canInteract('link:' + link.id)"
          :pointer-events="canInteract('link:' + link.id) ? undefined : 'none'"
          :aria-label="linkLabel(link)"
          @click.stop="select({ kind: 'link', id: link.id })"
          @focusin="hover('link:' + link.id)"
          @focusout="hover(null)"
          @keydown.enter.prevent="select({ kind: 'link', id: link.id })"
          @keydown.space.prevent="select({ kind: 'link', id: link.id })"
        >
          <path
            v-if="
              isLegal('link:' + link.id) ||
              isChosen('link:' + link.id) ||
              isHovered('link:' + link.id)
            "
            :d="path(link)"
            fill="none"
            stroke="currentColor"
            :stroke-width="isHovered('link:' + link.id) ? 24 : 17"
            :class="
              isChosen('link:' + link.id)
                ? 'text-primary/45'
                : isLegal('link:' + link.id)
                  ? isHovered('link:' + link.id)
                    ? 'text-secondary/65'
                    : 'text-secondary/35'
                  : 'text-base-content/25'
            "
            stroke-linecap="round"
            stroke-linejoin="round"
            pointer-events="none"
          />
          <path
            :d="path(link)"
            fill="none"
            stroke="currentColor"
            stroke-width="24"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-base-content/0"
            :pointer-events="canInteract('link:' + link.id) ? 'stroke' : 'none'"
          />
          <path
            :d="path(link)"
            fill="none"
            stroke="currentColor"
            :stroke-width="linkWidth(link) + 6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-base-100"
            pointer-events="none"
          />
          <path
            :d="path(link)"
            fill="none"
            stroke="currentColor"
            :stroke-width="linkWidth(link)"
            :stroke-dasharray="
              transportKind(link) === 'canal' ? '7 6' : undefined
            "
            stroke-linecap="round"
            stroke-linejoin="round"
            :class="linkAvailable(link) ? transportTone(transportKind(link)) : 'text-base-content/65'"
            pointer-events="none"
          />
          <g
            v-if="
              builtLink(link) && routeArt && transportKind(link) === 'railway'
            "
            pointer-events="none"
          >
            <rect
              v-for="(segment, i) in segments(link)"
              :key="i"
              :transform="`translate(${segment.x},${segment.y}) rotate(${segment.angle})`"
              y="-5"
              :width="segment.length"
              height="10"
              :fill="`url(#${routePatternId})`"
              opacity="0.8"
            />
          </g>
          <foreignObject
            v-if="
              !builtLink(link) &&
              !isChosen('link:' + link.id) &&
              transportKind(link) === 'railway'
            "
            :x="mid(link).x - 11"
            :y="mid(link).y - 11"
            width="22"
            height="22"
            pointer-events="none"
            ><div
              xmlns="http://www.w3.org/1999/xhtml"
              class="flex h-full items-center justify-center rounded-full bg-base-100/95 text-base"
              :class="linkAvailable(link) ? transportTone(transportKind(link)) : 'text-base-content/65'"
            >
              <i
                :class="TRANSPORT_ICONS[transportKind(link)]"
                aria-hidden="true"
              ></i></div
          ></foreignObject>
          <circle
            v-if="builtLink(link)"
            :cx="mid(link).x"
            :cy="mid(link).y"
            r="13"
            stroke="currentColor"
            stroke-width="2"
            class="fill-base-100"
            :class="ownerTone(builtLink(link).owner)"
            pointer-events="none"
          />
          <foreignObject
            v-if="builtLink(link)"
            :x="mid(link).x - 9"
            :y="mid(link).y - 9"
            width="18"
            height="18"
            pointer-events="none"
            ><div
              xmlns="http://www.w3.org/1999/xhtml"
              class="flex h-full items-center justify-center text-[15px] font-bold"
              :class="ownerTone(builtLink(link).owner)"
            >
              <ArtIcon
                :asset="companyArtName(seat(builtLink(link).owner))"
                :icon="playerIcon(builtLink(link).owner)"
              /></div
          ></foreignObject>
          <foreignObject
            v-if="isChosen('link:' + link.id)"
            :x="mid(link).x - 12"
            :y="mid(link).y - 12"
            width="24"
            height="24"
            pointer-events="none"
            ><div
              xmlns="http://www.w3.org/1999/xhtml"
              class="flex h-full items-center justify-center rounded-full bg-primary text-lg text-primary-content"
            >
              <i class="ri-check-line" aria-hidden="true"></i></div
          ></foreignObject>
          <title>{{ linkLabel(link) }}</title>
        </g>
        <g
          v-for="place in mapPlaces"
          :key="place.id"
          :opacity="placeOpacity(place)"
          @pointerenter="hover('place:' + place.id)"
          @pointerleave="hover(null)"
          :transform="transform(place.x, place.y)"
          :data-fogport-drop="`place:${place.id}`"
        >
          <circle
            v-if="nodeActive(place) || (!activeMode && nodeHovered(place))"
            :r="nodeHovered(place) ? 56 : 49"
            stroke="none"
            :class="
              nodeChosen(place)
                ? 'fill-primary/50'
                : nodeActive(place)
                  ? nodeHovered(place)
                    ? 'fill-success/65'
                    : 'fill-success/40'
                  : 'fill-base-content/20'
            "
            pointer-events="none"
          />
          <g
            class="outline-none"
            role="button"
            :tabindex="canInteract('place:' + place.id) ? 0 : -1"
            :aria-disabled="!canInteract('place:' + place.id)"
            :pointer-events="
              canInteract('place:' + place.id) ? undefined : 'none'
            "
            :aria-label="placeName(place.id, t)"
            @focusin="hover('place:' + place.id)"
            @focusout="hover(null)"
            @click.stop="select({ kind: 'place', id: place.id })"
            @keydown.enter.stop.prevent="
              select({ kind: 'place', id: place.id })
            "
            @keydown.space.stop.prevent="
              select({ kind: 'place', id: place.id })
            "
          >
            <rect
              x="-62"
              :y="labelTop(place)"
              width="124"
              height="23"
              rx="11"
              stroke-width="1.5"
              class="fill-base-100 stroke-base-content/25"
            />
            <text
              :y="labelTop(place) + 17"
              text-anchor="middle"
              class="fill-base-content text-[17px] font-bold"
            >
              {{ placeName(place.id, t) }}
            </text>
          </g>
          <g
            v-if="place.id.startsWith('p')"
            :data-fogport-drop="`place:${place.id}`"
          >
            <image
              v-if="artSource(merchantArt(place))"
              :href="artSource(merchantArt(place))"
              x="-20"
              y="-18"
              width="40"
              height="40"
              preserveAspectRatio="xMidYMid meet"
              pointer-events="none"
              opacity="0.65"
              @error="onArtError"
            />
            <circle
              r="16"
              stroke-width="2"
              class="fill-base-100 stroke-base-content/60"
            />
            <foreignObject x="-21" y="-12" width="42" height="24"
              ><div
                xmlns="http://www.w3.org/1999/xhtml"
                class="flex h-full items-center justify-center gap-1 text-[17px] text-base-content"
              >
                <i class="ri-route-line" aria-hidden="true"></i><span>2</span>
              </div></foreignObject
            >
            <g
              v-for="(merchant, i) in game.merchants.filter(
                (m) => m.location === place.id,
              )"
              :key="merchant.id"
              :opacity="dim('merchant:' + merchant.id)"
              @pointerenter.stop="hover('merchant:' + merchant.id)"
              @pointerleave.stop="hover(null)"
              :transform="transform((i - (place.slots - 1) / 2) * 60, place.y > 920 ? -80 : 32)"
              :data-fogport-drop="`merchant:${merchant.id}`"
              class="outline-none"
              role="button"
              :tabindex="canInteract('merchant:' + merchant.id) ? 0 : -1"
              :aria-disabled="!canInteract('merchant:' + merchant.id)"
              :pointer-events="
                canInteract('merchant:' + merchant.id) ? undefined : 'none'
              "
              :aria-label="merchantLabel(merchant)"
              @click.stop="select({ kind: 'merchant', id: merchant.id })"
              @focusin="hover('merchant:' + merchant.id)"
              @focusout="hover(null)"
              @keydown.enter.prevent="
                select({ kind: 'merchant', id: merchant.id })
              "
              @keydown.space.prevent="
                select({ kind: 'merchant', id: merchant.id })
              "
            >
              <rect
                x="-27"
                y="-13"
                width="54"
                height="48"
                rx="6"
                class="fill-base-100"
              />
              <rect
                x="-27"
                y="-13"
                width="54"
                height="48"
                rx="6"
                :stroke-width="isHovered('merchant:' + merchant.id) ? 4 : 3"
                :class="
                  boxTone(
                    'merchant:' + merchant.id,
                    'fill-transparent stroke-base-content/60',
                  )
                "
              />
              <foreignObject
                v-if="merchant.buys.length"
                x="-26"
                y="-12"
                width="52"
                height="23"
                ><div
                  xmlns="http://www.w3.org/1999/xhtml"
                  class="flex h-full items-center justify-center gap-0.5 text-base-content"
                >
                  <i
                    v-for="type in merchant.buys"
                    :key="type"
                    :class="INDUSTRY_ICONS[type]"
                    class="text-[17px]"
                    aria-hidden="true"
                  ></i></div
              ></foreignObject>
              <text
                v-else
                text-anchor="middle"
                class="fill-base-content text-[16px]"
              >
                —
              </text>
              <foreignObject x="-24" y="10" width="48" height="23"
                ><div
                  xmlns="http://www.w3.org/1999/xhtml"
                  class="flex h-full items-center justify-center gap-1 text-[16px] text-base-content"
                >
                  <ArtIcon
                    asset="resource-beer"
                    icon="ri-goblet-line"
                  /><span>{{ merchant.beer ? 1 : 0 }}</span>
                </div></foreignObject
              >
              <title>{{ merchantLabel(merchant) }}</title>
            </g>
          </g>
          <g
            v-for="(slot, i) in place.id.startsWith('p') ? [] : place.slots"
            :key="i"
            :opacity="dim(slotKey(place.id, i))"
            @pointerenter.stop="hover(slotKey(place.id, i))"
            @pointerleave.stop="hover(null)"
            :transform="slotTransform(place, i)"
            :data-fogport-drop="`slot:${place.id}:${i}`"
            class="outline-none"
            role="button"
            :tabindex="canInteract(slotKey(place.id, i)) ? 0 : -1"
            :aria-disabled="!canInteract(slotKey(place.id, i))"
            :pointer-events="
              canInteract(slotKey(place.id, i)) ? undefined : 'none'
            "
            :aria-label="slotLabel(place, i)"
            @pointerdown="dragTile($event, place.id, i)"
            @click.stop="select({ kind: 'slot', location: place.id, slot: i })"
            @focusin="hover(slotKey(place.id, i))"
            @focusout="hover(null)"
            @keydown.enter.prevent="
              select({ kind: 'slot', location: place.id, slot: i })
            "
            @keydown.space.prevent="
              select({ kind: 'slot', location: place.id, slot: i })
            "
          >
            <rect
              v-if="
                isLegal(slotKey(place.id, i)) || isChosen(slotKey(place.id, i))
              "
              :x="isHovered(slotKey(place.id, i)) ? -25 : -22"
              :y="isHovered(slotKey(place.id, i)) ? -25 : -22"
              :width="isHovered(slotKey(place.id, i)) ? 50 : 44"
              :height="isHovered(slotKey(place.id, i)) ? 50 : 44"
              rx="8"
              stroke="none"
              :class="
                isChosen(slotKey(place.id, i))
                  ? 'fill-primary/50'
                  : isHovered(slotKey(place.id, i))
                    ? 'fill-success/60'
                    : 'fill-success/40'
              "
              pointer-events="none"
            />
            <rect
              x="-18"
              y="-18"
              width="36"
              height="36"
              rx="5"
              class="fill-base-100"
            />
            <rect
              x="-18"
              y="-18"
              width="36"
              height="36"
              rx="5"
              stroke-width="1.5"
              :class="
                boxTone(
                  slotKey(place.id, i),
                  building(place.id, i)
                    ? ownerTileTone(building(place.id, i).owner)
                    : 'fill-transparent stroke-base-content/60',
                )
              "
            />
            <template v-if="building(place.id, i)">
              <foreignObject x="-16" y="-16" width="32" height="19"
                ><div
                  xmlns="http://www.w3.org/1999/xhtml"
                  class="flex h-full items-center justify-center gap-1"
                  :class="ownerTone(building(place.id, i).owner)"
                >
                  <ArtIcon
                    :asset="`industry-${tileData(building(place.id, i)).type}`"
                    :icon="INDUSTRY_ICONS[tileData(building(place.id, i)).type]"
                    class="text-[16px]"
                  /><span class="text-[11px] font-bold">{{
                    tileData(building(place.id, i)).level
                  }}</span>
                </div></foreignObject
              >
              <foreignObject x="-16" y="4" width="32" height="12"
                ><div
                  xmlns="http://www.w3.org/1999/xhtml"
                  class="flex h-full items-center justify-center gap-1 text-[11px] text-base-content"
                >
                  <span
                    v-if="liquidationOffer(place.id, i)"
                    class="flex items-center gap-0.5 font-bold text-warning"
                    ><i class="ri-coins-line" aria-hidden="true"></i>+{{
                      liquidationOffer(place.id, i).amount
                    }}</span
                  ><ArtIcon
                    v-else
                    :asset="companyArtName(seat(building(place.id, i).owner))"
                    :icon="playerIcon(building(place.id, i).owner)"
                  /><i
                    v-if="
                      !liquidationOffer(place.id, i) &&
                      building(place.id, i).flipped
                    "
                    class="ri-check-line"
                    aria-hidden="true"
                  ></i
                  ><span
                    v-else-if="
                      !liquidationOffer(place.id, i) &&
                      building(place.id, i).resources
                    "
                    >{{ building(place.id, i).resources }}</span
                  ><i
                    v-else-if="!liquidationOffer(place.id, i)"
                    class="ri-time-line"
                    aria-hidden="true"
                  ></i></div
              ></foreignObject>
            </template>
            <foreignObject v-else x="-16" y="-14" width="32" height="28"
              ><div
                xmlns="http://www.w3.org/1999/xhtml"
                class="flex h-full items-center justify-center gap-0.5 text-base-content/75"
              >
                <i
                  v-for="type in slot"
                  :key="type"
                  :class="INDUSTRY_ICONS[type]"
                  class="text-[16px]"
                  aria-hidden="true"
                ></i></div
            ></foreignObject>
            <foreignObject
              v-if="isChosen(slotKey(place.id, i))"
              x="10"
              y="-29"
              width="22"
              height="22"
              pointer-events="none"
              ><div
                xmlns="http://www.w3.org/1999/xhtml"
                class="flex h-full items-center justify-center rounded-full bg-primary text-base text-primary-content"
              >
                <i class="ri-check-line" aria-hidden="true"></i></div
            ></foreignObject>
            <title>{{ slotLabel(place, i) }}</title>
          </g>
        </g>
      </g>
    </svg>
    <span
      class="pointer-events-none absolute bottom-8 left-2 rounded-field bg-base-100/85 px-2 py-1 text-[9px] text-base-content/60 sm:hidden"
      ><i class="ri-drag-move-2-line" aria-hidden="true"></i>
      {{ t("fogport.visual.touchMap") }}</span
    >
    <div
      class="pointer-events-none flex shrink-0 flex-wrap gap-x-3 gap-y-1 bg-base-100/85 px-2 py-1 text-[10px]"
    >
      <span
        v-for="kind in visibleKinds"
        :key="kind"
        class="border-r border-base-300 pr-2"
        :class="kind === 'railway' && game.era === 'canal' ? 'text-base-content/65' : transportTone(kind)"
        ><i :class="TRANSPORT_ICONS[kind]" aria-hidden="true"></i>
        {{ t(kind === 'railway' && game.era === 'canal' ? 'fogport.visual.railPreview' : 'fogport.transport.' + kind) }}</span
      ><span
        v-for="player in game.players"
        :key="player.id"
        :class="ownerTone(player.id)"
        ><ArtIcon
          :asset="companyArtName(player.seat)"
          :icon="playerIcon(player.id)"
        />
        {{ player.nickname }}</span
      >
    </div>
  </div>
</template>
<script setup>
import { computed, ref, useId } from "vue";
import ArtIcon from "./ArtIcon.vue";
import { companyArtName } from "@/games/fogport/art-assets";
import {
  useArtAsset,
  artSource,
} from "@/composables/games/fogport/useArtAsset";
import {
  MAP_POINTS,
  routePath,
  routeSegments,
  routeMark,
  displayedLinks,
  displayEra,
} from "@/games/fogport/map-layout";
import {
  PLACES,
  PLACE_BY_ID,
  LINKS,
  LINK_BY_ID,
  linkKind,
} from "../../../../../shared/games/fogport/data.js";
import { tileData } from "../../../../../shared/games/fogport/engine.js";
import {
  PLAYER_ICONS,
  INDUSTRY_ICONS,
  placeName,
  routeName,
  TRANSPORT_ICONS,
} from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  game: { type: Object, required: true },
  targets: { type: Array, default: () => [] },
  selectedTargets: { type: Array, default: () => [] },
  activeMode: { type: String, default: "" },
  hoverTarget: { type: String, default: null },
  liquidationOffers: { type: Array, default: () => [] },
  dragging: Boolean,
});
const emit = defineEmits(["select", "drag", "hover"]);
const { t } = useLocale();
const { src: mapArt, onError: onArtError } = useArtAsset(
  () => 'map',
);
const { src: routeArt } = useArtAsset(() => `route-${props.game.era}`);
const routePatternId = `fogport-route-${useId()}`;
const merchantArt = (place) =>
  `merchant-${String(place.number).padStart(2, "0")}`;
const mapPlaces = computed(() =>
  PLACES.map((place) => ({
    ...place,
    x: MAP_POINTS[place.id][0],
    y: MAP_POINTS[place.id][1],
  })),
);
const svg = ref(null),
  scale = ref(1),
  offset = ref({ x: 0, y: 0 });
const pointers = new Map();
let start = null,
  travel = 0;
const transform = (x, y, s = 1) => `matrix(${s},0,0,${s},${x},${y})`;
const labelTop = (place) =>
  !place.id.startsWith("p") && place.slots.length > 2 ? -65 : -43;
function slotTransform(place, index) {
  const count = place.slots.length;
  if (count <= 2) return transform((index - (count - 1) / 2) * 40, 0);
  const row = index < 2 ? 0 : 1,
    columns = Math.min(2, count - row * 2);
  return transform(
    (index - row * 2 - (columns - 1) / 2) * 40,
    row === 0 ? -20 : 20,
  );
}
const visibleLinks = computed(() => displayedLinks(LINKS, props.game.era));
const linkAvailable = (link) => !!link[props.game.era];
const linkEra = (link) => displayEra(link, props.game.era);
const transportKind = (link) => linkKind(link, linkEra(link));
const transportTone = (kind) =>
  ({
    canal: "text-info",
    railway: "text-success",
  })[kind];
const visibleKinds = computed(() => [
  ...new Set(visibleLinks.value.map(transportKind)),
]);
const builtLink = (link) => props.game.links.find((l) => l.id === link.id);
const linkWidth = (link) =>
  isHovered("link:" + link.id)
    ? 10
    : isChosen("link:" + link.id) || isLegal("link:" + link.id)
      ? 8
      : builtLink(link)
        ? routeArt.value
          ? 13
          : 7
        : 5;
const building = (location, slot) =>
  props.game.buildings.find((t) => t.location === location && t.slot === slot);
const playerIcon = (id) =>
  PLAYER_ICONS[props.game.players.find((p) => p.id === id)?.seat ?? 0];
const seat = (id) => props.game.players.find((p) => p.id === id)?.seat ?? 0;
const ownerTone = (id) =>
  ["text-primary", "text-secondary", "text-accent", "text-info"][
    props.game.players.find((p) => p.id === id)?.seat ?? 0
  ];
const ownerTileTone = (id) =>
  [
    "fill-primary/10 stroke-primary",
    "fill-secondary/10 stroke-secondary",
    "fill-accent/10 stroke-accent",
    "fill-info/10 stroke-info",
  ][props.game.players.find((p) => p.id === id)?.seat ?? 0];
const mid = (link) => routeMark(link, linkEra(link));
const path = (link) => routePath(link, linkEra(link));
const segments = (link) => routeSegments(link, linkEra(link));
const linkLabel = (link) =>
  routeName(link, linkEra(link), t) +
  (!linkAvailable(link) ? " · " + t("fogport.visual.railPreview") : "") +
  (builtLink(link)
    ? " · " +
      props.game.players.find((p) => p.id === builtLink(link).owner)?.nickname
    : "");
const merchantLabel = (m) =>
  `${placeName(m.location, t)}: ${m.buys.map((type) => t(`fogport.industries.${type}`)).join(" / ") || t("fogport.blank")} · ${t("fogport.resources.beer")} ${m.beer}`;
const liquidationOffer = (location, slot) =>
  props.liquidationOffers.find(
    (c) => c.building === building(location, slot)?.id,
  );
function slotLabel(place, i) {
  const tile = building(place.id, i),
    offer = liquidationOffer(place.id, i);
  if (offer)
    return (
      placeName(place.id, t) +
      " · " +
      t("fogport.industries." + tileData(tile).type) +
      " " +
      tileData(tile).level +
      " · " +
      t("fogport.liquidationDetails", offer)
    );
  return `${placeName(place.id, t)} ${i + 1}: ${tile ? props.game.players.find((p) => p.id === tile.owner)?.nickname + " · " + t(`fogport.industries.${tileData(tile).type}`) + " " + tileData(tile).level + " · " + t(tile.flipped ? "fogport.flipped" : "fogport.unflipped") : place.slots[i].map((type) => t(`fogport.industries.${type}`)).join(" / ")}`;
}
const isLegal = (key) => props.targets.includes(key),
  isChosen = (key) => props.selectedTargets.includes(key),
  isHovered = (key) => props.hoverTarget === key;
const slotKey = (location, slot) =>
  ["sell", "liquidate"].includes(props.activeMode) && building(location, slot)
    ? "building:" + building(location, slot).id
    : "slot:" + location + ":" + slot;
const dim = (key) =>
  props.activeMode && !isLegal(key) && !isChosen(key) ? 0.22 : 1;
function placeOpacity(place) {
  return props.activeMode &&
    !isLegal("place:" + place.id) &&
    !isChosen("place:" + place.id) &&
    !props.targets.some(
      (key) =>
        key.startsWith("slot:" + place.id + ":") ||
        (key.startsWith("building:") &&
          props.game.buildings.find((b) => b.id === key.slice(9))?.location ===
            place.id) ||
        (key.startsWith("merchant:") &&
          props.game.merchants.find((m) => m.id === key.slice(9))?.location ===
            place.id),
    ) &&
    !props.selectedTargets.some(
      (key) =>
        (key.startsWith("building:") &&
          props.game.buildings.find((b) => b.id === key.slice(9))?.location ===
            place.id) ||
        (key.startsWith("merchant:") &&
          props.game.merchants.find((m) => m.id === key.slice(9))?.location ===
            place.id),
    )
    ? 0.35
    : 1;
}
function nodeKeys(place) {
  return [
    "place:" + place.id,
    ...(Array.isArray(place.slots)
      ? place.slots.map((_, i) => slotKey(place.id, i))
      : props.game.merchants
          .filter((m) => m.location === place.id)
          .map((m) => "merchant:" + m.id)),
  ];
}
const nodeActive = (place) =>
  nodeKeys(place).some((key) => isLegal(key) || isChosen(key));
const nodeChosen = (place) => nodeKeys(place).some(isChosen);
const nodeHovered = (place) =>
  nodeKeys(place).some(
    (key) =>
      isHovered(key) && (isLegal(key) || isChosen(key) || !props.activeMode),
  );
function boxTone(key, normal) {
  return isChosen(key)
    ? "fill-primary/25 stroke-primary"
    : isHovered(key) && isLegal(key)
      ? "fill-success/40 stroke-success"
      : isLegal(key)
        ? "fill-success/20 stroke-success"
        : normal;
}
const canInteract = (key) =>
  (!key.startsWith('link:') || !!LINK_BY_ID[key.slice(5)]?.[props.game.era]) &&
  (!props.activeMode || isLegal(key) || isChosen(key));
function hover(key) {
  if (!props.dragging) emit("hover", key);
}
function select(target) {
  if (target.kind === 'link' && !canInteract('link:' + target.id)) return;
  if (travel < 8 && !props.dragging) emit("select", target);
}
function dragTile(event, location, slot) {
  const tile = building(location, slot);
  if (
    (!props.activeMode || props.activeMode === "sell") &&
    tile &&
    tile.owner === props.game.selfId &&
    !tile.flipped
  )
    emit(
      "drag",
      event,
      { kind: "building", id: tile.id },
      slotLabel(PLACE_BY_ID[location], slot),
    );
}
function changeScale(value, pivot = { x: 500, y: 500 }) {
  const next = Math.min(3, Math.max(0.7, value)),
    ratio = next / scale.value;
  offset.value = {
    x: pivot.x - (pivot.x - offset.value.x) * ratio,
    y: pivot.y - (pivot.y - offset.value.y) * ratio,
  };
  scale.value = next;
}
function zoom(amount) {
  changeScale(scale.value + amount);
}
function reset() {
  scale.value = 1;
  offset.value = { x: 0, y: 0 };
}
function wheel(event) {
  zoom(event.deltaY > 0 ? -0.1 : 0.1);
}
function panStart(event) {
  if (props.dragging || event.button !== 0) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  travel = 0;
  start = {
    x: event.clientX,
    y: event.clientY,
    offset: { ...offset.value },
    scale: scale.value,
    distance: pinchDistance(),
  };
}
function pinchDistance() {
  const ps = [...pointers.values()];
  return ps.length < 2 ? 0 : Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
}
function panMove(event) {
  if (!pointers.has(event.pointerId) || !start || props.dragging) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const dx = event.clientX - start.x,
    dy = event.clientY - start.y;
  travel = Math.max(travel, Math.hypot(dx, dy));
  if (travel >= 8) svg.value.setPointerCapture(event.pointerId);
  const matrix = svg.value.getScreenCTM();
  if (!matrix) return;
  if (pointers.size === 2 && start.distance) {
    const ps = [...pointers.values()];
    changeScale((start.scale * pinchDistance()) / start.distance, {
      x: ((ps[0].x + ps[1].x) / 2 - matrix.e) / matrix.a,
      y: ((ps[0].y + ps[1].y) / 2 - matrix.f) / matrix.d,
    });
  } else {
    offset.value = {
      x: start.offset.x + dx / matrix.a,
      y: start.offset.y + dy / matrix.d,
    };
  }
}
function panEnd(event) {
  pointers.delete(event.pointerId);
  if (!pointers.size) {
    start = null;
    setTimeout(() => {
      travel = 0;
    }, 0);
  }
}
</script>
