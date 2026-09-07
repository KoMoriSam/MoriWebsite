<template>
  <Teleport to="body">
    <Transition
      appear
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="scale-95 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="scale-95 opacity-0"
    >
      <ul
        v-if="modelValue"
        ref="menuRef"
        class="menu menu-horizontal fixed z-[100] max-w-[calc(100dvw-1rem)] flex-nowrap overflow-x-auto overscroll-x-contain rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-xl scrollbar-thin"
        :style="menuPosition"
        data-reader-interactive
        aria-label="正文操作"
        @pointerdown.stop
        @contextmenu.prevent
      >
        <li v-if="context.latex?.pure">
          <button type="button" @click="copyLatexSource">
            <i class="ri-braces-line" aria-hidden="true"></i>
            <span>复制 LaTeX</span>
          </button>
        </li>
        <li v-if="context.latex?.pure">
          <button type="button" @click="copyLatexAsSvg">
            <i class="ri-shapes-line" aria-hidden="true"></i>
            <span>复制 SVG</span>
          </button>
        </li>
        <li v-else>
          <button
            type="button"
            :disabled="context.image ? !context.image.src : !context.text"
            @click="handlePrimaryAction"
          >
            <i
              :class="
                context.image ? 'ri-download-2-line' : 'ri-file-copy-line'
              "
              aria-hidden="true"
            ></i>
            <span>{{ context.image ? "保存" : "复制" }}</span>
          </button>
        </li>
        <li>
          <button type="button" :disabled="!context.text" @click="searchText">
            <i class="ri-search-line" aria-hidden="true"></i>
            <span>搜索</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            :disabled="!context.text && !context.shareContent?.blocks?.length"
            @click="shareText"
          >
            <i class="ri-share-forward-line" aria-hidden="true"></i>
            <span>分享</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            :disabled="!context.paragraphId"
            @click="openComment"
          >
            <i class="ri-chat-quote-line" aria-hidden="true"></i>
            <span>评论</span>
          </button>
        </li>
      </ul>
    </Transition>
  </Teleport>
  <component
    :is="shareDialogComponent"
    v-if="shareDialogComponent"
    ref="shareDialogRef"
  />
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useToast } from "@/composables/useToast";
import { copyLatexSvg } from "@/utils/reader/reader-latex";

const props = defineProps({
  modelValue: Boolean,
  context: { type: Object, default: () => ({}) },
  shareMeta: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "search", "comment"]);
const toast = useToast({ position: "center", closable: false });
const menuRef = ref(null);
const shareDialogRef = ref(null);
const shareDialogComponent = shallowRef(null);
const position = ref({ left: 8, top: 8 });
const positioned = ref(false);
let shareDialogPromise;
const menuPosition = computed(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
  visibility: positioned.value ? "visible" : "hidden",
}));

const close = () => emit("update:modelValue", false);
const positionMenu = async () => {
  await nextTick();
  const menu = menuRef.value;
  if (!menu) return;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;

  const margin = 8;
  const visualViewport = window.visualViewport;
  const viewportLeft = visualViewport?.offsetLeft || 0;
  const viewportTop = visualViewport?.offsetTop || 0;
  const viewportRight =
    viewportLeft + (visualViewport?.width || window.innerWidth);
  const viewportBottom =
    viewportTop + (visualViewport?.height || window.innerHeight);
  const anchor = props.context.anchorRect;
  const anchorLeft = anchor
    ? anchor.left + anchor.width / 2
    : Number(props.context.clientX || viewportLeft + margin);
  const anchorTop =
    anchor?.top ?? Number(props.context.clientY || viewportTop + margin);
  const anchorBottom = anchor?.bottom ?? anchorTop;
  const desiredLeft = anchorLeft - menuWidth / 2;
  const spaceAbove = anchorTop - viewportTop - margin - 10;
  const spaceBelow = viewportBottom - anchorBottom - margin - 10;
  const placeAbove =
    spaceAbove >= menuHeight ||
    (spaceBelow < menuHeight && spaceAbove >= spaceBelow);
  const desiredTop = placeAbove
    ? anchorTop - menuHeight - 10
    : anchorBottom + 10;
  position.value = {
    left: Math.min(
      viewportRight - menuWidth - margin,
      Math.max(viewportLeft + margin, desiredLeft),
    ),
    top: Math.min(
      viewportBottom - menuHeight - margin,
      Math.max(viewportTop + margin, desiredTop),
    ),
  };
  positioned.value = true;
};

const handleOutsidePointerDown = (event) => {
  if (!props.modelValue || menuRef.value?.contains(event.target)) return;
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) return;
  close();
};
const handleViewportChange = () => props.modelValue && void positionMenu();

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

const copyText = async () => {
  try {
    await copyToClipboard(props.context.text);
    toast.success("已复制正文");
  } catch {
    toast.error("复制失败，请手动选择文字");
  }
  close();
};
const getImageFileName = ({ src = "", alt = "" } = {}, mimeType = "") => {
  const extensions = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  let sourceName = "";
  if (!/^(?:blob|data):/iu.test(src)) {
    try {
      sourceName = decodeURIComponent(
        new URL(src, window.location.href).pathname.split("/").pop() || "",
      );
    } catch {
      sourceName = "";
    }
  }
  const sourceExtension = sourceName.match(
    /\.(avif|gif|jpe?g|png|svg|webp)$/iu,
  )?.[1];
  const extension = extensions[mimeType] || sourceExtension || "png";
  const baseName = (alt || sourceName.replace(/\.[^.]+$/u, "") || "图片")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .trim();
  return `${baseName || "图片"}.${extension === "jpeg" ? "jpg" : extension}`;
};
const triggerImageDownload = (href, fileName) => {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};
const saveImage = async () => {
  const image = props.context.image;
  if (!image?.src) return;
  close();

  try {
    const response = await fetch(image.src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerImageDownload(objectUrl, getImageFileName(image, blob.type));
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    toast.success("图片已保存");
  } catch {
    const anchor = document.createElement("a");
    anchor.href = image.src;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.info("已打开原图，请使用浏览器另存为");
  }
};
const handlePrimaryAction = () =>
  props.context.image ? void saveImage() : void copyText();
const copyLatexSource = async () => {
  try {
    await copyToClipboard(props.context.latex?.text || "");
    toast.success("已复制 LaTeX 源码");
  } catch {
    toast.error("复制失败，请手动选择公式");
  }
  close();
};
const copyLatexAsSvg = async () => {
  try {
    await copyLatexSvg({
      svg: props.context.latex?.svg,
      source: props.context.latex?.source,
      display: props.context.latex?.display,
      color: getComputedStyle(document.documentElement).color,
    });
    toast.success("已复制 SVG");
  } catch {
    toast.error("当前浏览器无法复制 SVG");
  }
  close();
};
const searchText = () => {
  emit("search", props.context.text);
  close();
};
const ensureShareDialog = async () => {
  if (!shareDialogPromise) {
    shareDialogPromise = import("@/components/reader/ShareCard.vue")
      .then(({ default: component }) => {
        shareDialogComponent.value = component;
      })
      .catch((error) => {
        shareDialogPromise = null;
        throw error;
      });
  }

  await shareDialogPromise;
  await nextTick();
};
const shareText = async () => {
  const payload = {
    text: props.context.text,
    paragraphId: props.context.paragraphId,
    shareContent: props.context.shareContent,
    meta: { ...props.shareMeta },
  };
  close();

  try {
    await ensureShareDialog();
    await shareDialogRef.value?.open(payload);
  } catch {
    toast.error("暂时无法打开分享卡片");
  }
};
const openComment = () => {
  if (props.context.commentScope === "chapter") {
    emit("comment", props.context);
    close();
    return;
  }

  document.dispatchEvent(
    new CustomEvent("paragraph-comment-open", {
      detail: {
        paragraphId: props.context.paragraphId,
        sourceType: props.context.sourceType || "novel",
      },
    }),
  );
  close();
};

watch(
  () => [
    props.modelValue,
    props.context.clientX,
    props.context.clientY,
    props.context.anchorRect?.left,
    props.context.anchorRect?.right,
    props.context.anchorRect?.top,
    props.context.anchorRect?.bottom,
  ],
  ([open]) => {
    positioned.value = false;
    if (open) void positionMenu();
  },
  { flush: "post" },
);

onMounted(() => {
  document.addEventListener("pointerdown", handleOutsidePointerDown, true);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
  if (props.modelValue) void positionMenu();
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  window.removeEventListener("resize", handleViewportChange);
  window.visualViewport?.removeEventListener("resize", handleViewportChange);
  window.visualViewport?.removeEventListener("scroll", handleViewportChange);
});
</script>
