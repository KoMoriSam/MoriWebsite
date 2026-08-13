<template>
  <section
    class="fixed inset-0 z-[95] bg-neutral/30 text-base-content"
    data-reader-interactive
    aria-label="九宫格点击区域设置"
  >
    <header
      class="absolute inset-x-2 top-2 z-10 flex items-center gap-2 rounded-box border border-base-300 bg-base-100/95 p-2 shadow-lg backdrop-blur"
    >
      <div class="min-w-0 flex-1 px-1">
        <h2 class="text-sm font-bold">点击区域设置</h2>
        <p class="truncate text-[0.6875rem] text-base-content/55">
          点击区域选择对应操作
        </p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-sm shrink-0"
        @click="store.resetMobileTapZones"
      >
        <i class="ri-reset-left-line" aria-hidden="true"></i>
        恢复默认
      </button>
      <button type="button" class="btn btn-sm shrink-0" @click="emit('close')">
        完成
      </button>
    </header>

    <div
      class="absolute inset-x-0 top-18 bottom-6 grid grid-cols-3 grid-rows-3 p-1"
      aria-label="正文九宫格区域"
    >
      <button
        v-for="(action, index) in mobileTapZones"
        :key="index"
        type="button"
        class="group flex min-h-0 min-w-0 items-center justify-center border border-base-content/25 bg-base-100/25 px-1 text-center transition-colors active:bg-primary/25"
        :class="{ 'border-primary bg-primary/20': selectedZoneIndex === index }"
        :aria-label="`当前操作为 ${actionLabel(action)}，点击打开操作菜单`"
        :aria-expanded="selectedZoneIndex === index"
        @click="openActionMenu(index)"
      >
        <span
          class="max-w-full rounded-field bg-base-100/90 px-2 py-1 text-xs font-semibold shadow-sm"
        >
          {{ actionLabel(action) }}
        </span>
      </button>
    </div>

    <div
      v-if="selectedZoneIndex !== null"
      class="absolute inset-0 z-20 flex items-end bg-neutral/35 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      role="presentation"
      @click.self="closeActionMenu"
    >
      <div
        class="w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="选择点击区域操作"
      >
        <ul class="menu grid w-full grid-cols-2 gap-1 p-0">
          <li v-for="action in MOBILE_READER_ZONE_ACTIONS" :key="action.value">
            <button
              type="button"
              class="justify-center"
              :class="{
                'menu-active':
                  mobileTapZones[selectedZoneIndex] === action.value,
              }"
              :aria-pressed="mobileTapZones[selectedZoneIndex] === action.value"
              @click="selectZoneAction(action.value)"
            >
              {{ action.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { MOBILE_READER_ZONE_ACTIONS } from "@/constants/reader";
import { useReaderStore } from "@/stores/readerStore";

const emit = defineEmits(["close"]);
const store = useReaderStore();
const { mobileTapZones } = storeToRefs(store);
const selectedZoneIndex = ref(null);

const actionLabel = (value) =>
  MOBILE_READER_ZONE_ACTIONS.find((item) => item.value === value)?.label ||
  "无操作";
const openActionMenu = (index) => {
  selectedZoneIndex.value = index;
};
const closeActionMenu = () => {
  selectedZoneIndex.value = null;
};
const selectZoneAction = (action) => {
  if (selectedZoneIndex.value === null) return;
  store.setMobileTapZone(selectedZoneIndex.value, action);
  closeActionMenu();
};
</script>
