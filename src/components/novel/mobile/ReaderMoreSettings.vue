<template>
  <section class="space-y-4 p-4">
    <label class="flex min-h-11 items-center justify-between gap-4">
      <span>
        <span class="block text-sm font-medium">鼠标滚轮翻页</span>
        <span class="block text-xs text-base-content/55">
          分页模式下滚动滚轮切换页面
        </span>
      </span>
      <input
        type="checkbox"
        class="toggle toggle-sm"
        :checked="mobileWheelPagination"
        @change="store.setMobileWheelPagination($event.target.checked)"
      />
    </label>

    <label
      class="flex min-h-11 items-center justify-between gap-4"
      :class="{ 'opacity-55': !volumeKeySupported }"
    >
      <span>
        <span class="block text-sm font-medium">音量键翻页</span>
        <span class="block text-xs text-base-content/55">
          {{ volumeKeyDescription }}
        </span>
      </span>
      <input
        type="checkbox"
        class="toggle toggle-sm"
        :checked="mobileVolumePagination"
        :disabled="!volumeKeySupported"
        @change="store.setMobileVolumePagination($event.target.checked)"
      />
    </label>

    <label
      type="button"
      @click="emit('edit-tap-zones')"
      class="flex min-h-11 items-center justify-between gap-4"
    >
      <span>
        <span class="block text-sm font-medium">点击区域设置</span>
        <span class="block text-xs text-base-content/55">
          显示点击范围，轻触区域依次切换动作
        </span>
      </span>
      <i class="ri-grid-line shrink-0 text-xl" aria-hidden="true"></i>
    </label>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useReaderStore } from "@/stores/readerStore";

const emit = defineEmits(["edit-tap-zones"]);
const store = useReaderStore();
const { mobileWheelPagination, mobileVolumePagination } = storeToRefs(store);
const volumeKeySupported =
  typeof window !== "undefined" &&
  (Boolean(window.MoriReaderVolumeBridge) ||
    !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
const volumeKeyDescription = computed(() =>
  volumeKeySupported
    ? "支持外接键盘；原生容器可通过阅读器桥接控制"
    : "当前移动浏览器由系统接管实体音量键，网页无法监听",
);
</script>
