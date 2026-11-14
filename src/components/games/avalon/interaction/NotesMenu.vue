<template>
  <ActionMenu
    ref="menu"
    :label="t('avalon.notes.player', { name: player?.nickname || '' })"
    :title="t('avalon.notes.title', { name: player?.nickname || '' })"
    :groups="menuGroups"
    panel-class="w-56!"
    align="start"
    :gap="6"
    @select="choose"
  />
</template>
<script setup>
import ActionMenu from "@/components/display/menu/ActionMenu.vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useLocale } from "@/i18n";
import { possibleMarks } from "@/games/avalon/notes";
import { ROLE_ICONS, currentRoleAlignment } from "@/games/avalon/presentation";
const props = defineProps({
  room: { type: Object, required: true },
  marks: { type: Object, required: true },
});
const emit = defineEmits(["mark"]);
const { t } = useLocale();
const menu = ref(null);
const player = ref(null);
const options = computed(() =>
  player.value ? possibleMarks(props.room, player.value.id) : [],
);
const groups = computed(() =>
  [
    {
      id: "good",
      label: "avalon.night.good",
      icon: "ri-shield-star-line",
      tone: "text-success",
      mark: options.value.includes("good") ? "good" : null,
      roles: options.value.filter(
        (mark) =>
          Object.hasOwn(ROLE_ICONS, mark) &&
          currentRoleAlignment(props.room, mark) === "good",
      ),
    },
    {
      id: "evil",
      label: "avalon.night.evil",
      icon: "ri-skull-line",
      tone: "text-error",
      mark: options.value.includes("evil") ? "evil" : null,
      roles: options.value.filter(
        (mark) =>
          Object.hasOwn(ROLE_ICONS, mark) &&
          currentRoleAlignment(props.room, mark) === "evil",
      ),
    },
    {
      id: "unknown",
      label: "avalon.knowledge.currentUnknown",
      icon: "ri-question-line",
      tone: "text-base-content/70",
      mark: null,
      roles: options.value.filter(
        (mark) =>
          Object.hasOwn(ROLE_ICONS, mark) &&
          currentRoleAlignment(props.room, mark) === null,
      ),
    },
  ].filter((group) => group.roles.length),
);
const markLabel = (mark) =>
  ({ good: "avalon.night.good", evil: "avalon.night.evil" })[mark] ||
  `avalon.roles.${mark}`;
const markIcon = (mark) =>
  ROLE_ICONS[mark] ||
  { good: "ri-shield-star-line", evil: "ri-skull-line" }[mark];
const menuGroups = computed(() => {
  const currentMark = props.marks[player.value?.id] ?? "";
  const item = (id, label, icon) => ({
    id,
    label,
    icon,
    checked: currentMark === id,
    active: currentMark === id,
    role: "menuitemradio",
  });
  return [
    { items: [item("", t("avalon.notes.none"), "ri-eraser-line")] },
    ...groups.value.map((group) => ({
      label: group.mark ? undefined : t(group.label),
      icon: group.icon,
      tone: group.tone,
      items: [
        ...(group.mark ? [{ ...item(group.mark, t(group.label), group.icon), tone: group.tone }] : []),
        ...group.roles.map((mark) => ({
          ...item(mark, t(markLabel(mark)), markIcon(mark)),
          indented: true,
        })),
      ],
    })),
  ];
});

let opening = 0;
function close() {
  opening++;
  menu.value?.close();
}

async function open(seat, event) {
  if (seat.id === props.room.selfId || props.room.phase === "finished") return;
  event.preventDefault();
  const samePlayer = player.value?.id === seat.id && menu.value?.isOpen();
  close();
  if (samePlayer) return;

  const request = opening;
  const source = event.currentTarget;
  const bounds = source.getBoundingClientRect();
  player.value = seat;
  await nextTick();
  if (request === opening) {
    void menu.value?.show({
      left: bounds.right,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
    }, source);
  }
}

function choose(mark) {
  if (
    player.value &&
    props.room.players.some((seat) => seat.id === player.value.id) &&
    (!mark || options.value.includes(mark))
  ) {
    emit("mark", player.value.id, mark);
  }
}

function onScroll(event) {
  if (!menu.value?.contains(event.target)) close();
}

watch(
  [
    () => props.room.code,
    () => props.room.selfId,
    () => props.room.game,
    () => props.room.phase,
  ],
  close,
);
onMounted(() => {
  window.addEventListener("resize", close);
  window.addEventListener("scroll", onScroll, true);
});
onBeforeUnmount(() => {
  close();
  window.removeEventListener("resize", close);
  window.removeEventListener("scroll", onScroll, true);
});
defineExpose({ open });
</script>
