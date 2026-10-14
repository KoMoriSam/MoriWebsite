import { computed, inject, provide, toValue, watch } from "vue";
import { DEFAULT_AVATAR } from "../../constants/markdown.js";
import { getMarkdownAvatar, loadAvatarManifest } from "../../utils/markdown/avatar-manifests.js";
import { getImageAttrs, restoreOriginalImage } from "../../utils/images/responsive-images.js";

export const MARKDOWN_AVATAR_BASE = Symbol("markdown-avatar-base");

export function provideMarkdownAvatars(contentBase) {
  const base = computed(() => toValue(contentBase) || "");
  provide(MARKDOWN_AVATAR_BASE, base);
  if (!import.meta.env?.SSR) watch(base, (value) => { void loadAvatarManifest(value); }, { immediate: true });
}

export function useMarkdownAvatars() {
  const base = inject(MARKDOWN_AVATAR_BASE, null);
  const avatarFor = (username = "") => getMarkdownAvatar(base?.value, username);
  const avatarAttrs = (username = "") => ({
    ...getImageAttrs(avatarFor(username), "40px"),
    onError(event) {
      const image = event.currentTarget;
      if (!image) return;
      const original = image.getAttribute("data-original-src");
      if (original && image.getAttribute("src") !== original) {
        restoreOriginalImage(event);
        return;
      }
      for (const attribute of ["srcset", "sizes", "data-original-src", "data-original-width", "data-original-height"]) image.removeAttribute(attribute);
      if (image.getAttribute("src") !== DEFAULT_AVATAR) image.src = DEFAULT_AVATAR;
    },
  });
  return { avatarFor, avatarAttrs };
}
