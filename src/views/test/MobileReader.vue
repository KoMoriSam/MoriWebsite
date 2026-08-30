<template>
  <TestPage section-id="mobile-reader">
    <section
      class="grid min-w-0 gap-6 xl:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]"
    >
      <aside class="card card-border h-fit bg-base-100">
        <div class="card-body gap-5">
          <div>
            <h2 class="card-title text-lg">移动视口</h2>
            <p class="mt-1 text-sm leading-relaxed text-base-content/65">
              预览直接加载生产小说路由，媒体查询、章节数据、阅读状态与弹窗均在独立视口中运行。
            </p>
          </div>

          <div>
            <p class="mb-2 text-xs font-semibold text-base-content/55">
              设备尺寸
            </p>
            <div
              role="tablist"
              class="tabs tabs-box tabs-sm grid grid-cols-2"
              aria-label="选择移动阅读器测试尺寸"
            >
              <button
                v-for="preset in viewportPresets"
                :key="preset.label"
                type="button"
                role="tab"
                class="tab h-auto min-h-10 py-1.5"
                :class="{ 'tab-active': activePreset.label === preset.label }"
                :aria-selected="activePreset.label === preset.label"
                @click="activePreset = preset"
              >
                <span>
                  <span class="block font-semibold">{{ preset.label }}</span>
                  <span class="block text-[0.6875rem] opacity-60">
                    {{ preset.width }} × {{ preset.height }}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-semibold text-base-content/55">
              建议检查
            </p>
            <ul class="space-y-2 text-sm text-base-content/70">
              <li
                v-for="item in checkItems"
                :key="item"
                class="flex items-start gap-2"
              >
                <i
                  class="ri-checkbox-blank-circle-line mt-0.5 shrink-0 text-base-content/45"
                  aria-hidden="true"
                ></i>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="card-actions items-center gap-2">
            <button type="button" class="btn btn-sm" @click="reloadReader">
              <i class="ri-refresh-line" aria-hidden="true"></i>
              重新载入
            </button>
            <a
              class="btn btn-sm btn-outline"
              :href="readerPath"
              target="_blank"
              rel="noopener"
            >
              <i class="ri-external-link-line" aria-hidden="true"></i>
              新窗口打开
            </a>
          </div>

          <p class="text-xs leading-relaxed text-base-content/50">
            默认尝试恢复上次阅读章节；若先显示小说封面，可从章节目录进入任意章节。
          </p>
        </div>
      </aside>

      <section class="min-w-0" aria-label="小说移动端阅读器预览">
        <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="font-semibold">实际阅读器预览</h2>
            <p class="text-xs text-base-content/55">
              {{ activePreset.label }} · {{ activePreset.width }} ×
              {{ activePreset.height }} CSS px
            </p>
          </div>
          <span class="badge badge-outline">同源 iframe</span>
        </header>

        <div
          class="max-w-full overflow-auto flex rounded-box border border-base-300 bg-base-200 p-3 sm:p-6"
        >
          <div
            class="mockup-phone size-fit max-w-none aspect-auto border-[#ff8938] mx-auto"
          >
            <div class="mockup-phone-camera"></div>
            <div
              class="mockup-phone-display phone-screen-clip grid place-content-center bg-neutral-900 text-white"
            >
              <iframe
                :key="readerFrameKey"
                :src="readerPath"
                :title="`${activePreset.label}小说移动端阅读器测试`"
                :style="readerViewportStyle"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </section>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useNovelStore } from "@/stores/novelStore";
import TestPage from "./_TestPage.vue";

const viewportPresets = Object.freeze([
  { label: "小屏手机", width: 320, height: 700 },
  { label: "标准手机", width: 390, height: 844 },
  { label: "大屏手机", width: 430, height: 932 },
  { label: "竖屏平板", width: 768, height: 1024 },
]);

const checkItems = Object.freeze([
  "分页与滚动模式切换后，正文位置和状态栏正确更新",
  "左右滑动、九宫格点击、滚轮与进度控制可正常翻页",
  "目录、搜索、评论、排版和更多设置弹窗可打开并返回",
  "字体、行距、主题、纯色或图片背景能即时应用",
  "切换章节、刷新内容及恢复阅读进度时无空白页或遮挡",
]);

const novelStore = useNovelStore();
const { currentChapterUuid } = storeToRefs(novelStore);
const activePreset = ref(viewportPresets[1]);
const readerFrameKey = ref(0);

const readerPath = computed(() => {
  const chapterUuid = String(currentChapterUuid.value || "").trim();
  return chapterUuid
    ? `/novel?chapter=${encodeURIComponent(chapterUuid)}`
    : "/novel";
});

const readerViewportStyle = computed(() => ({
  width: `${activePreset.value.width}px`,
  height: `${activePreset.value.height}px`,
}));

const reloadReader = () => {
  readerFrameKey.value += 1;
};
</script>

<style scoped>
.phone-screen-clip {
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: linear-gradient(white, white);
  transform: translateZ(0);
}

.phone-screen-clip > iframe {
  display: block;
  border-radius: inherit;
  corner-shape: inherit;
}
</style>
