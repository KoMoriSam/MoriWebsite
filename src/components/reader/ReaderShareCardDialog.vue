<template>
  <Teleport to="body">
    <dialog
      ref="dialogRef"
      class="modal modal-bottom z-[120] sm:modal-middle"
      data-reader-interactive
      aria-labelledby="reader-share-card-title"
      @cancel.prevent="close"
      @close="handleClosed"
      @contextmenu.prevent
    >
      <section
        class="modal-box flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <header
          class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 px-4 py-3 sm:px-5"
        >
          <div class="min-w-0">
            <h2
              id="reader-share-card-title"
              class="font-serif text-lg font-bold text-pretty"
            >
              分享图片
            </h2>
            <p class="mt-0.5 text-xs text-base-content/55">
              1080 × 1350 PNG
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-circle btn-sm shrink-0"
            aria-label="关闭分享卡片预览"
            @click="close"
          >
            <i class="ri-close-line text-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div
          class="min-h-0 flex-1 overflow-y-auto bg-base-200/55 p-4 scrollbar-thin sm:p-6"
        >
          <div
            v-if="loading"
            class="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-base-content/60"
            role="status"
          >
            <span class="loading loading-spinner loading-lg"></span>
            <p>正在排版分享卡片…</p>
          </div>

          <div
            v-else-if="errorMessage"
            class="flex min-h-72 flex-col items-center justify-center gap-4 text-center"
            role="alert"
          >
            <i
              class="ri-image-close-line text-5xl text-error"
              aria-hidden="true"
            ></i>
            <div>
              <p class="font-semibold">卡片生成失败</p>
              <p class="mt-1 max-w-md text-sm text-base-content/60">
                {{ errorMessage }}
              </p>
            </div>
            <button type="button" class="btn btn-sm" @click="generate">
              重新生成
            </button>
          </div>

          <figure v-else-if="previewUrl" class="mx-auto w-full max-w-md">
            <img
              :src="previewUrl"
              :alt="previewAlt"
              class="aspect-4/5 w-full rounded-box bg-base-100 object-contain shadow-xl"
            />
            <figcaption
              v-if="truncated"
              class="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-warning"
            >
              <i class="ri-information-line mt-px shrink-0" aria-hidden="true"></i>
              <span>选文较长，图片已省略未能完整收录的内容。</span>
            </figcaption>
          </figure>
        </div>

        <footer
          class="modal-action m-0 flex shrink-0 flex-col-reverse gap-2 border-t border-base-300 px-4 py-3 sm:flex-row sm:justify-end sm:px-5"
        >
          <button
            type="button"
            class="btn sm:min-w-32"
            :disabled="!imageBlob || loading"
            @click="downloadImage"
          >
            <i class="ri-download-2-line" aria-hidden="true"></i>
            下载图片
          </button>
          <button
            type="button"
            class="btn btn-primary sm:min-w-32"
            :disabled="!imageBlob || loading"
            @click="shareImage"
          >
            <i class="ri-share-forward-line" aria-hidden="true"></i>
            {{ canShareFile ? "分享图片" : "保存图片" }}
          </button>
        </footer>
      </section>

      <form method="dialog" class="modal-backdrop">
        <button aria-label="关闭分享卡片预览">关闭</button>
      </form>
    </dialog>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { useToast } from "@/composables/useToast";
import { createReaderShareCard } from "@/utils/reader/create-reader-share-card";

const dialogRef = ref(null);
const loading = ref(false);
const errorMessage = ref("");
const imageBlob = ref(null);
const previewUrl = ref("");
const fileName = ref("远方之森-分享卡片.png");
const truncated = ref(false);
const payload = ref(null);
let generationToken = 0;

const toast = useToast({ position: "center", closable: false });

const imageFile = computed(() => {
  if (!imageBlob.value || typeof File !== "function") return null;
  return new File([imageBlob.value], fileName.value, { type: "image/png" });
});
const canShareFile = computed(() => {
  if (!imageFile.value || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [imageFile.value] });
  } catch {
    return false;
  }
});
const previewAlt = computed(() => {
  const meta = payload.value?.meta || {};
  return `${meta.title || meta.sourceLabel || "远方之森"}的正文分享卡片`;
});

const revokePreviewUrl = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
};

const clearOutput = () => {
  revokePreviewUrl();
  imageBlob.value = null;
  truncated.value = false;
};

const generate = async () => {
  if (!payload.value) return;

  const token = ++generationToken;
  clearOutput();
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await createReaderShareCard(payload.value);
    if (token !== generationToken) return;
    imageBlob.value = result.blob;
    fileName.value = result.fileName;
    truncated.value = result.truncated;
    previewUrl.value = URL.createObjectURL(result.blob);
  } catch (error) {
    if (token !== generationToken) return;
    errorMessage.value = error?.message || "暂时无法生成分享卡片";
  } finally {
    if (token === generationToken) loading.value = false;
  }
};

const open = async (nextPayload) => {
  payload.value = nextPayload;
  await nextTick();
  if (!dialogRef.value?.open) dialogRef.value?.showModal();
  void generate();
};

const close = () => dialogRef.value?.close();

const handleClosed = () => {
  generationToken += 1;
  loading.value = false;
  errorMessage.value = "";
  payload.value = null;
  clearOutput();
};

const triggerDownload = () => {
  if (!previewUrl.value) return;
  const anchor = document.createElement("a");
  anchor.href = previewUrl.value;
  anchor.download = fileName.value;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const downloadImage = () => {
  triggerDownload();
  toast.success("分享卡片已下载");
};

const shareImage = async () => {
  if (!canShareFile.value) {
    triggerDownload();
    toast.success("浏览器不支持图片分享，已下载卡片");
    return;
  }

  try {
    await navigator.share({
      title: payload.value?.meta?.title || "远方之森",
      text: payload.value?.meta?.sourceLabel || "远方之森",
      files: [imageFile.value],
    });
  } catch (error) {
    if (error?.name !== "AbortError") toast.error("暂时无法分享图片");
  }
};

onBeforeUnmount(() => {
  generationToken += 1;
  revokePreviewUrl();
});

defineExpose({ open });
</script>
