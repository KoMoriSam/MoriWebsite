<template>
  <ActionMenu
    ref="menu"
    :label="translate('reader.contextMenu.label')"
    :groups="groups"
    align="center"
    :horizontal="selectionMenu"
    :placement="selectionMenu ? 'top' : 'side'"
    :gap="10"
    preserve-selection
    @close="close"
    @select="runAction"
  />
  <component
    :is="shareDialogComponent"
    v-if="shareDialogComponent"
    ref="shareDialogRef"
  />
</template>

<script setup>
import ActionMenu from "@/components/display/menu/ActionMenu.vue";
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import {
  computed,
  nextTick,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useToast } from "@/composables/useToast";
import { copyLatexSvg } from "@/utils/reader/latex";

const props = defineProps({
  modelValue: Boolean,
  context: { type: Object, default: () => ({}) },
  shareMeta: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["update:modelValue", "search", "comment"]);
const toast = useToast({ position: "center", closable: false });
const menu = ref(null);
const shareDialogRef = ref(null);
const shareDialogComponent = shallowRef(null);
let shareDialogPromise;

const menuContext = shallowRef({});
watch(
  () => props.modelValue ? props.context : null,
  (context) => {
    // Keep the last open menu intact while its panel transitions out.
    if (context) menuContext.value = context;
  },
  { immediate: true },
);

const selectionMenu = computed(() =>
  menuContext.value.hasTextSelection && !menuContext.value.explicitContextMenu,
);

const groups = computed(() => {
  const context = menuContext.value;
  const primary = context.latex?.pure
    ? [
        { id: "latex", icon: "ri-braces-line", label: translate("reader.contextMenu.copyLatex") },
        { id: "svg", icon: "ri-shapes-line", label: translate("reader.contextMenu.copySvg") },
      ]
    : [{
        id: "primary",
        icon: context.image ? "ri-download-2-line" : "ri-file-copy-line",
        label: context.image ? translate("reader.format.save") : translate("reader.contextMenu.copy"),
        disabled: context.image ? !context.image.src : !context.link && !context.text,
      }];
  if (context.link) {
    primary.push({ id: "link", icon: "ri-external-link-line", label: translate("reader.contextMenu.open"), href: context.link });
  }
  return [
    { items: primary },
    {
      items: [
        { id: "search", icon: "ri-search-line", label: translate("common.nav.search"), disabled: !context.text },
        { id: "share", icon: "ri-share-forward-line", label: translate("markdown.moment.share"), disabled: !context.text && !context.shareContent?.blocks?.length },
        { id: "comment", icon: "ri-chat-quote-line", label: translate("markdown.moment.comments"), disabled: !context.paragraphId },
      ],
    },
  ];
});

const close = () => {
  if (props.modelValue) emit("update:modelValue", false);
};

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
    await copyToClipboard(props.context.link || props.context.text);
    toast.success(translate(props.context.link ? 'reader.contextMenu.linkCopied' : 'reader.contextMenu.textCopied'));
  } catch {
    toast.error(translate(props.context.link ? 'reader.contextMenu.copyLinkFailed' : 'reader.contextMenu.copyTextFailed'));
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
  const baseName = (alt || sourceName.replace(/\.[^.]+$/u, "") || translate('reader.contextMenu.image'))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .trim();
  return `${baseName || translate('reader.contextMenu.image')}.${extension === "jpeg" ? "jpg" : extension}`;
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
    toast.success(translate('reader.contextMenu.imageSaved'));
  } catch {
    const anchor = document.createElement("a");
    anchor.href = image.src;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    toast.info(translate('reader.contextMenu.imageOpened'));
  }
};
const handlePrimaryAction = () =>
  props.context.image ? void saveImage() : void copyText();
const copyLatexSource = async () => {
  try {
    await copyToClipboard(props.context.latex?.text || "");
    toast.success(translate('reader.contextMenu.latexCopied'));
  } catch {
    toast.error(translate('reader.contextMenu.copyFormulaFailed'));
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
    toast.success(translate('reader.contextMenu.svgCopied'));
  } catch {
    toast.error(translate('reader.contextMenu.svgUnsupported'));
  }
  close();
};
const searchText = () => {
  emit("search", props.context.text);
  close();
};
const ensureShareDialog = async () => {
  if (!shareDialogPromise) {
    shareDialogPromise = import("@/components/reader/interaction/ShareCard.vue")
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
    toast.error(translate('reader.contextMenu.shareFailed'));
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

function runAction(id) {
  const actions = {
    latex: copyLatexSource,
    svg: copyLatexAsSvg,
    primary: handlePrimaryAction,
    search: searchText,
    share: shareText,
    comment: openComment,
  };
  actions[id]?.();
}

function syncMenu() {
  if (!props.modelValue) {
    menu.value?.close();
    return;
  }
  const { anchorRect, clientX, clientY, explicitContextMenu } = menuContext.value;
  const x = clientX ?? (window.visualViewport?.offsetLeft ?? 0) + 8;
  const y = clientY ?? (window.visualViewport?.offsetTop ?? 0) + 8;
  const point = { left: x, right: x, top: y, bottom: y };
  void menu.value?.show(explicitContextMenu ? point : anchorRect ?? point);
}

watch(
  [menu, () => props.modelValue, menuContext],
  syncMenu,
  { flush: "post" },
);
</script>
