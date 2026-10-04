<template>
  <nav class="mb-4 shrink-0 lg:is-drawer-open:pr-10" :aria-label="label">
    <div
      role="tablist"
      class="tabs tabs-border tabs-sm hidden w-full flex-nowrap overflow-x-auto scrollbar-thin lg:is-drawer-open:flex"
    >
      <button
        v-for="item in items"
        :id="`${panelId}-menu-${item.id}`"
        :key="item.id"
        type="button"
        role="tab"
        class="tab min-w-0 shrink-0 gap-2 whitespace-nowrap"
        :class="panel === item.id ? 'tab-active' : ''"
        :aria-selected="panel === item.id"
        :aria-controls="`${panelId}-${item.id}`"
        @click="emit('select-panel', item.id)"
      >
        <span class="indicator"
          ><span
            v-if="item.badge"
            class="indicator-item badge badge-error badge-xs min-w-5 px-1 font-semibold tabular-nums"
            aria-hidden="true"
            >{{ item.badge }}</span
          ><i
            :class="item.icon"
            class="text-lg leading-none"
            aria-hidden="true"
          ></i
        ></span>
        {{ t(item.label)
        }}<span v-if="item.badge" class="sr-only">{{ item.badgeLabel }}</span>
      </button>
    </div>
    <ul class="menu w-full gap-1 p-0 lg:is-drawer-open:hidden">
      <li
        v-for="item in items"
        :key="item.id"
        class="lg:is-drawer-close:tooltip lg:is-drawer-close:tooltip-left lg:is-drawer-close:flex! lg:is-drawer-close:items-center"
        :data-tip="t(item.label)"
      >
        <button
          :id="`${panelId}-menu-${item.id}-collapsed`"
          type="button"
          class="btn btn-ghost btn-sm min-w-0 gap-2 whitespace-nowrap lg:is-drawer-close:btn-square"
          :class="panel === item.id ? 'btn-active' : ''"
          :aria-label="t(item.label)"
          :aria-pressed="panel === item.id"
          :aria-controls="`${panelId}-${item.id}`"
          @click="emit('select-panel', item.id)"
        >
          <span class="indicator"
            ><span
              v-if="item.badge"
              class="indicator-item badge badge-error badge-xs min-w-5 px-1 font-semibold tabular-nums"
              aria-hidden="true"
              >{{ item.badge }}</span
            ><i
              :class="item.icon"
              class="text-lg leading-none"
              aria-hidden="true"
            ></i
          ></span>
          <span class="lg:is-drawer-close:hidden">{{ t(item.label) }}</span
          ><span v-if="item.badge" class="sr-only">{{ item.badgeLabel }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
<script setup>
import { useLocale } from "@/i18n";
defineProps({
  items: { type: Array, required: true },
  panel: { type: String, required: true },
  panelId: { type: String, required: true },
  label: { type: String, required: true },
});
const emit = defineEmits(["select-panel"]);
const { t } = useLocale();
</script>
