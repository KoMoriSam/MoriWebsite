<template>
  <div
    ref="toolbar"
    class="relative flex min-w-0 items-center gap-1"
    role="group"
    :aria-label="t('reader.comments.toolbar.label')"
  >
    <div
      v-for="(group, index) in visibleGroups"
      :key="group[0][0]"
      class="flex shrink-0 items-center"
    >
      <div
        v-if="index > 0"
        aria-hidden="true"
        class="self-stretch border-s border-base-300 px-1"
      ></div>
      <button
        v-for="[action, icon] in group"
        :key="action"
        type="button"
        class="btn btn-ghost btn-xs btn-square rounded-inner"
        :class="{ 'btn-active': action === 'monospace' && monospace }"
        :aria-pressed="action === 'monospace' ? monospace : undefined"
        :aria-label="label(action)"
        :disabled="disabled"
        :title="label(action)"
        @mousedown.prevent
        @click="choose(action)"
      >
        <i :class="icon" aria-hidden="true"></i>
      </button>
    </div>

    <ActionMenu
      :label="label('more')"
      :disabled="disabled"
      :groups="overflowGroups"
      trigger-class="btn btn-ghost btn-xs btn-square rounded-inner ms-auto @xl:ms-0"
      @select="choose"
    >
      <template #trigger>
        <i class="ri-more-line" aria-hidden="true"></i>
      </template>
    </ActionMenu>

    <div aria-hidden="true" class="pointer-events-none invisible absolute start-0 top-0 size-0 overflow-hidden">
      <span ref="buttonSize" class="btn btn-ghost btn-xs btn-square"></span>
      <span ref="dividerSize" class="inline-block border-s px-1"></span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "@/i18n";
import ActionMenu from "@/components/display/menu/ActionMenu.vue";

const monospace = defineModel({ type: Boolean, required: true });
const props = defineProps({ disabled: Boolean });
const emit = defineEmits(["format"]);
const { t } = useLocale();
const toolbar = ref(null);
const buttonSize = ref(null);
const dividerSize = ref(null);
const label = (action) => t("reader.comments.toolbar." + action);
const formatGroups = [
  [["heading", "ri-h-2"], ["bold", "ri-bold"], ["italic", "ri-italic"], ["strike", "ri-strikethrough"]],
  [["quote", "ri-double-quotes-l"], ["code", "ri-code-line"], ["link", "ri-link"]],
  [["bullet", "ri-list-unordered"], ["ordered", "ri-list-ordered"], ["task", "ri-list-check-2"]],
  [["mention", "ri-at-line"], ["image", "ri-image-line"], ["table", "ri-table-line"],
    ["codeBlock", "ri-code-box-line"], ["details", "ri-expand-up-down-line"], ["math", "ri-functions"]],
  [["monospace", "ri-font-mono"]],
];
const actions = formatGroups.flat();
const priority = [
  "bold", "italic", "code", "link", "heading", "strike", "quote", "bullet", "ordered", "task",
  "mention", "image", "table", "codeBlock", "details", "math", "monospace",
];
const groupByAction = new Map(formatGroups.flatMap((group, index) =>
  group.map(([action]) => [action, index]),
));
const visible = ref(new Set());
const visibleGroups = computed(() => formatGroups
  .map((group) => group.filter(([action]) => visible.value.has(action)))
  .filter((group) => group.length),
);
const overflowGroups = computed(() =>
  formatGroups
    .map((group) => ({
      items: group
        .filter(([action]) => !visible.value.has(action))
        .map(([action, icon]) => ({
          id: action,
          icon,
          label: label(action),
          checked: action === "monospace" ? monospace.value : undefined,
        })),
    })),
);
let observer;

function showActions(next) {
  if (visible.value.size === next.size && [...next].every((action) => visible.value.has(action))) return;
  visible.value = next;
}

function updateToolbar() {
  const bar = toolbar.value;
  if (!bar || !buttonSize.value || !dividerSize.value) return;
  const style = getComputedStyle(bar);
  const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const width = bar.clientWidth - padding;
  const button = buttonSize.value.getBoundingClientRect().width;
  const gap = parseFloat(style.columnGap) || 0;
  const groupSpace = dividerSize.value.getBoundingClientRect().width + gap;
  if (!button) return;

  if (actions.length * button + (formatGroups.length - 1) * groupSpace <= width) {
    showActions(new Set(priority));
    return;
  }

  // 先留出省略号的宽度，新分组第一次出现时再计入分隔线和间距。
  let used = button + gap;
  const groups = new Set();
  const fitted = new Set();
  for (const action of priority) {
    if (used + button > width) break;
    const group = groupByAction.get(action);
    const extra = groups.size && !groups.has(group) ? groupSpace : 0;
    if (used + button + extra > width) continue;
    used += button + extra;
    groups.add(group);
    fitted.add(action);
  }
  showActions(fitted);
}

onMounted(() => {
  updateToolbar();
  observer = new ResizeObserver(updateToolbar);
  observer.observe(toolbar.value);
  observer.observe(buttonSize.value);
  observer.observe(dividerSize.value);
});
onBeforeUnmount(() => observer?.disconnect());

function choose(action) {
  if (props.disabled) return;
  if (action === "monospace") {
    monospace.value = !monospace.value;
    return;
  }
  emit("format", action);
}
</script>
