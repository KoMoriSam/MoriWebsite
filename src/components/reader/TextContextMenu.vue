<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="scale-95 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="scale-95 opacity-0"
    >
      <ul
        v-if="modelValue"
        ref="menuRef"
        class="menu menu-horizontal fixed z-[100] max-w-[calc(100dvw-1rem)] flex-nowrap overflow-x-auto overscroll-x-contain rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-xl"
        :style="menuPosition"
        data-reader-interactive
        aria-label="正文操作"
        @pointerdown.stop
        @contextmenu.prevent
      >
        <li>
          <button type="button" :disabled="!context.text" @click="copyText">
            <i class="ri-file-copy-line" aria-hidden="true"></i>
            <span>复制</span>
          </button>
        </li>
        <li>
          <button type="button" :disabled="!context.text" @click="searchText">
            <i class="ri-search-line" aria-hidden="true"></i>
            <span>搜索</span>
          </button>
        </li>
        <li>
          <button type="button" :disabled="!context.text" @click="shareText">
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
  <ReaderShareCardDialog ref="shareDialogRef" />
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useToast } from "@/composables/useToast";
import ReaderShareCardDialog from "@/components/reader/ReaderShareCardDialog.vue";

const props = defineProps({
  modelValue: Boolean,
  context: { type: Object, default: () => ({}) },
  shareMeta: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "search", "comment"]);
const toast = useToast({ position: "center", closable: false });
const menuRef = ref(null);
const shareDialogRef = ref(null);
const position = ref({ left: 8, top: 8 });
const menuPosition = computed(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
}));

const close = () => emit("update:modelValue", false);
const positionMenu = async () => {
  await nextTick();
  const rect = menuRef.value?.getBoundingClientRect();
  if (!rect) return;

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
  const desiredLeft = anchorLeft - rect.width / 2;
  const spaceAbove = anchorTop - viewportTop - margin - 10;
  const spaceBelow = viewportBottom - anchorBottom - margin - 10;
  const placeAbove =
    spaceAbove >= rect.height ||
    (spaceBelow < rect.height && spaceAbove >= spaceBelow);
  const desiredTop = placeAbove
    ? anchorTop - rect.height - 10
    : anchorBottom + 10;
  position.value = {
    left: Math.min(
      viewportRight - rect.width - margin,
      Math.max(viewportLeft + margin, desiredLeft),
    ),
    top: Math.min(
      viewportBottom - rect.height - margin,
      Math.max(viewportTop + margin, desiredTop),
    ),
  };
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
const searchText = () => {
  emit("search", props.context.text);
  close();
};
const shareText = () => {
  void shareDialogRef.value?.open({
    text: props.context.text,
    paragraphId: props.context.paragraphId,
    shareContent: props.context.shareContent,
    meta: { ...props.shareMeta },
  });
  close();
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
  ([open]) => open && void positionMenu(),
  { flush: "post" },
);

onMounted(() => {
  document.addEventListener("pointerdown", handleOutsidePointerDown, true);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  window.removeEventListener("resize", handleViewportChange);
  window.visualViewport?.removeEventListener("resize", handleViewportChange);
  window.visualViewport?.removeEventListener("scroll", handleViewportChange);
});
</script>
