<template>
  <div
    class="avatar-group overflow-visible p-1 [&_.avatar]:overflow-visible"
    :class="
      compact
        ? 'grid min-w-0 grid-cols-[var(--avatar-columns)] [--avatar-size:2rem] [&>.indicator]:justify-self-start sm:w-[var(--avatar-expanded-width)] sm:min-w-[var(--avatar-collapsed-width)] sm:shrink max-sm:flex-1 max-sm:[--avatar-size:1.75rem]'
        : '-space-x-3'
    "
    :style="
      compact
        ? {
            '--avatar-columns': avatarColumns,
            '--avatar-expanded-width': `${room.players.length * 2.25 + 0.25}rem`,
            '--avatar-collapsed-width': `${room.players.length + 1.5}rem`,
          }
        : undefined
    "
    role="group"
    :aria-label="
      label ||
      t('games.onlinePlayers', {
        n: room.players.filter((player) => player.online).length,
      })
    "
  >
    <div
      v-for="player in room.players"
      :key="player.id"
      class="indicator shrink-0"
      :class="{
        grayscale: !player.online,
      }"
      :title="playerLabel(player)"
    >
      <span
        v-if="
          !player.online ||
          (submissions && Object.hasOwn(submissions, player.id))
        "
        class="indicator-item indicator-bottom indicator-start z-10 grid size-3.5 place-items-center rounded-full text-[10px] ring-1"
        :class="
          !player.online
            ? 'text-base-content/60 bg-base-100 ring-base-100'
            : submissions[player.id]
              ? 'text-success-content bg-success/95 ring-success'
              : 'text-base-content/50 bg-base-100 ring-base-100'
        "
        style="--indicator-x: 0; --indicator-y: 0"
        aria-hidden="true"
        ><i
          :class="
            !player.online
              ? 'ri-wifi-off-line'
              : submissions[player.id]
                ? 'ri-check-line font-bold'
                : 'ri-time-line'
          "
        ></i
      ></span>
      <Avatar
        ring
        :ring-dashed="room.status === 'lobby' && !player.ready"
        :src="player.avatarUrl"
        :name="player.nickname"
        :aria-label="playerLabel(player)"
        :class="[
          compact
            ? '[&>div]:size-6 max-sm:[&>div]:size-5 [&_span]:text-xs [&_i]:text-sm'
            : '[&>div]:size-7 [&_span]:text-sm [&_i]:text-base',
          player.online && activeIds && !activeIds.includes(player.id)
            ? '[&_img]:opacity-40'
            : '',
        ]"
      />
    </div>
  </div>
</template>
<script setup>
import { computed } from "vue";
import Avatar from "@/components/auth/Avatar.vue";
import { useLocale } from "@/i18n";
const props = defineProps({
  room: { type: Object, required: true },
  compact: Boolean,
  activeIds: Array,
  submissions: Object,
  label: String,
});
const avatarColumns = computed(() =>
  props.room.players.length > 1
    ? `repeat(${props.room.players.length - 1}, minmax(0, 1fr)) var(--avatar-size)`
    : "var(--avatar-size)",
);
const { t } = useLocale();
function playerLabel(player) {
  if (!player.online) return `${player.nickname} · ${t("games.disconnected")}`;
  if (!props.submissions || !Object.hasOwn(props.submissions, player.id))
    return player.nickname;
  return `${player.nickname} · ${t(
    props.submissions[player.id]
      ? "games.progress.complete"
      : "games.progress.pending",
  )}`;
}
</script>
