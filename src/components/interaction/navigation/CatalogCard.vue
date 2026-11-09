<template>
  <component
    :is="to ? RouterLink : href ? 'a' : 'div'"
    v-bind="linkAttrs"
    class="group card card-border relative min-w-0 overflow-hidden transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-xl has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-primary motion-reduce:transform-none motion-reduce:translate-none motion-reduce:transition-none"
    :class="[
      primary
        ? 'border-primary bg-primary text-primary-content hover:border-primary'
        : 'bg-base-100 hover:border-primary/30',
      compact && !textOnly ? 'catalog-compact-preview min-h-24' : '',
      responsiveCompact && !textOnly ? 'catalog-compact-preview catalog-responsive-compact max-md:min-h-24' : '',
      expandable ? 'cursor-pointer' : '',
      to || href
        ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'
        : '',
    ]"
    :data-project-card="expandable ? '' : undefined"
    :data-card-motion="expandable ? 'card' : undefined"
  >
    <div
      :class="[
        responsiveCompact ? 'max-md:contents' : '',
        compact || textOnly
          ? 'contents'
          : [
              'relative flex items-end overflow-hidden bg-base-200',
              coverClass || 'h-48 min-h-48 flex-1 sm:h-64 sm:min-h-64',
            ]
      ]"
    >
      <input
        v-if="expandable"
        type="radio"
        :name="groupName"
        :value="value"
        :checked="!compact"
        :disabled="!compact"
        :aria-label="title"
        :aria-expanded="!compact"
        :aria-controls="detailsId"
        class="peer absolute inset-0 z-20 size-full cursor-pointer opacity-0"
        @change="$emit('select')"
      />
      <div
        v-if="!textOnly"
        data-card-motion="cover"
        class="overflow-hidden bg-base-200"
        :class="[
          compact
            ? 'absolute inset-y-0 left-0 w-(--preview-width)'
            : 'absolute inset-0',
          responsiveCompact ? 'max-md:right-auto max-md:w-(--preview-width)' : '',
        ]"
        :aria-busy="hasCover && !isCoverLoaded"
      >
        <div v-if="$slots.cover" class="size-full" aria-hidden="true">
          <slot name="cover"></slot>
        </div>
        <template v-else-if="hasCover">
          <div
            v-if="!isCoverLoaded"
            class="skeleton absolute inset-0 rounded-none"
            aria-hidden="true"
          ></div>
          <div
            class="absolute inset-0 transition-[scale] duration-500 ease-out group-hover:scale-105 motion-reduce:scale-none motion-reduce:transition-none"
          >
            <img
              v-fade-in
              :key="cover"
              :ref="syncCoverImage"
              v-bind="coverAttrs"
              :data-cover-src="cover"
              :alt="title"
              loading="lazy"
              decoding="async"
              draggable="false"
              class="absolute inset-0 size-full object-center transition-opacity duration-500 ease-out motion-reduce:transition-none"
              :class="contain ? 'object-contain' : 'object-cover'"
              @load="handleCoverLoad"
              @error="handleCoverError"
            />
            <div
              class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/5 transition-opacity duration-200 motion-reduce:transition-none"
              :class="[overlayTitle ? 'opacity-100' : 'opacity-0', responsiveCompact ? 'max-md:opacity-0' : '']"
              aria-hidden="true"
            ></div>
          </div>
        </template>
        <template v-else>
          <div
            class="absolute -top-14 -right-10 size-40 rounded-full bg-primary/10 blur-2xl"
            aria-hidden="true"
          ></div>
          <div
            class="absolute -bottom-16 -left-10 size-44 rounded-full bg-accent/15 blur-2xl"
            aria-hidden="true"
          ></div>
          <i
            :class="icon"
            class="absolute top-4 right-5 text-7xl text-base-content/5"
            aria-hidden="true"
          ></i>
          <div
            class="absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.04]"
            aria-hidden="true"
          ></div>
        </template>
      </div>

      <div
        v-if="!titleInBody || compact"
        data-card-motion="title"
        class="relative z-10 min-w-0 font-serif leading-snug peer-focus-visible:underline peer-focus-visible:decoration-primary peer-focus-visible:decoration-2 peer-focus-visible:underline-offset-4"
        :class="[
          headingClass,
          compact ? 'px-3 pt-3' : 'w-full p-4 sm:p-5',
          compact && !textOnly ? 'ml-(--preview-width)' : '',
          responsiveCompact ? 'max-md:w-auto max-md:px-3 max-md:pt-3 max-md:pb-0 max-md:ml-(--preview-width)' : '',
          responsiveCompact ? (primary ? 'max-md:text-primary-content' : 'max-md:text-base-content') : '',
          overlayTitle
            ? 'text-white'
            : primary
              ? 'text-primary-content'
              : 'text-base-content',
          expandable ? 'pointer-events-none' : '',
        ]"
      >
        <div
          v-if="$slots.tags || tags.length"
          class="mb-2 flex flex-wrap gap-1.5 font-sans font-normal"
        >
          <slot name="tags" :cover-loaded="overlayTitle">
            <CatalogBadge
              v-for="tag in tags"
              :key="tag"
              :overlay="overlayTitle"
              :primary="primary"
              >{{ tag }}</CatalogBadge
            >
          </slot>
        </div>
        <component
          :is="titleTag"
          class="wrap-break-word text-balance font-bold"
          :class="['line-clamp-2', overlayTitle ? 'drop-shadow-sm' : '', responsiveCompact ? 'max-md:drop-shadow-none' : '']"
          ><slot name="title">{{ title }}</slot></component
        >
      </div>
    </div>

    <div
      :id="detailsId"
      class="card-body min-w-0 gap-0"
      :class="[
        compact ? 'px-3 pt-2 pb-3' : 'flex-none p-5 sm:p-6',
        compact && !textOnly ? 'ml-(--preview-width)' : '',
        responsiveCompact ? 'max-md:px-3 max-md:pt-2 max-md:pb-3 max-md:ml-(--preview-width)' : '',
      ]"
    >
      <div v-if="titleInBody && !compact" class="mb-3">
        <div
          v-if="$slots.tags || tags.length"
          class="mb-2 flex flex-wrap gap-1.5"
        >
          <slot name="tags" :cover-loaded="false">
            <CatalogBadge v-for="tag in tags" :key="tag" :primary="primary">{{
              tag
            }}</CatalogBadge>
          </slot>
        </div>
        <component
          :is="titleTag"
          class="wrap-break-word text-balance font-serif leading-snug font-bold"
          :class="headingClass"
          ><slot name="title">{{ title }}</slot></component
        >
      </div>
      <p
        v-if="description || $slots.description"
        data-card-motion="description"
        class="flex-none wrap-break-word text-pretty"
        :class="[
          compact
            ? 'line-clamp-2 text-xs leading-5'
            : 'h-18 line-clamp-3 text-sm leading-6',
          primary ? 'text-primary-content/75' : 'text-base-content/65',
          responsiveCompact ? 'max-md:h-auto max-md:line-clamp-2 max-md:text-xs max-md:leading-5' : '',
        ]"
      >
        <slot name="description">{{ description }}</slot>
      </p>
      <div
        v-show="!expandable || !compact"
        data-card-motion="actions"
        class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2"
        :class="[
          compact ? 'pt-2 text-xs' : 'min-h-10 pt-5 text-sm',
          primary ? 'text-primary-content/75' : 'text-base-content/50',
          responsiveCompact ? 'max-md:min-h-0 max-md:pt-2 max-md:text-xs' : '',
        ]"
      >
        <div
          v-if="$slots.meta"
          :class="[
            compact
              ? 'flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-4 empty:hidden'
              : 'contents',
            responsiveCompact ? 'max-md:flex max-md:min-w-0 max-md:flex-1 max-md:flex-wrap max-md:items-center max-md:gap-x-1.5 max-md:gap-y-0.5 max-md:leading-4 empty:hidden' : '',
          ]"
        >
          <slot name="meta"></slot>
        </div>
        <span
          class="ml-auto flex max-w-full items-center gap-1 font-medium transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          :class="[
            primary ? 'text-primary-content' : 'text-primary',
            compact ? 'self-end' : '',
            responsiveCompact ? 'max-md:self-end' : '',
            actionClass,
          ]"
        >
          <span v-if="action" class="min-w-0 wrap-break-word">{{
            action
          }}</span>
          <i
            :class="href && !to ? 'ri-external-link-line' : 'ri-arrow-right-line'"
            class="shrink-0"
            aria-hidden="true"
          ></i>
        </span>
      </div>
    </div>
    <RouterLink
      v-if="expandable && !compact"
      :to="entryTo"
      :aria-label="title"
      class="absolute inset-0 z-30 focus-visible:outline-none"
    />
  </component>
</template>

<script setup>
import { computed, ref, useId, useSlots, watch } from "vue";
import { RouterLink } from "vue-router";
import CatalogBadge from "./CatalogBadge.vue";
import {
  getImageAttrs,
  restoreOriginalImage,
} from "@/utils/images/responsive-images";

const props = defineProps({
  to: { type: [String, Object], default: null },
  href: { type: String, default: "" },
  compact: Boolean,
  compactOnMobile: Boolean,
  textOnly: Boolean,
  primary: Boolean,
  contain: Boolean,
  expandable: Boolean,
  groupName: { type: String, default: "" },
  value: { type: String, default: "" },
  entryTo: { type: [String, Object], default: null },
  title: { type: String, default: "" },
  titleClass: { type: String, default: "" },
  titleTag: {
    type: String,
    default: "h2",
    validator: (value) => ["h2", "h3", "h4", "div"].includes(value),
  },
  description: { type: String, default: "" },
  icon: { type: String, default: "ri-article-line" },
  action: { type: String, default: "" },
  actionClass: { type: String, default: "" },
  tags: { type: Array, default: () => [] },
  cover: { type: String, default: "" },
  coverClass: { type: [String, Array, Object], default: "" },
  coverSizes: {
    type: String,
    default:
      "(min-width: 1280px) 390px, (min-width: 768px) calc(50vw - 2.625rem), calc(100vw - 3rem)",
  },
});
defineEmits(["select"]);

const detailsId = `catalog-details-${useId()}`;
const coverLoaded = ref(true);
const coverFailed = ref(false);
const slots = useSlots();
const compact = computed(() => props.compact);
const responsiveCompact = computed(() => props.compactOnMobile && !props.compact);
const titleInBody = computed(() => props.textOnly || Boolean(slots.cover));
const headingClass = computed(() =>
  [compact.value ? "text-base" : props.titleClass || "text-xl sm:text-2xl",
    responsiveCompact.value ? "max-md:text-base" : ""],
);
const linkAttrs = computed(() =>
  props.to
    ? { to: props.to }
    : props.href
      ? { href: props.href, target: "_blank", rel: "noopener noreferrer" }
      : {},
);
const hasCover = computed(
  () => !slots.cover && Boolean(props.cover) && !coverFailed.value,
);
const isCoverLoaded = computed(() => coverLoaded.value);
const overlayTitle = computed(
  () =>
    !props.textOnly && !compact.value && hasCover.value && isCoverLoaded.value,
);
const coverAttrs = computed(() => {
  const sizes =
    (compact.value || responsiveCompact.value) && !props.expandable
      ? responsiveCompact.value
        ? `(max-width: 359px) 40vw, (max-width: 767px) 144px, ${props.coverSizes}`
        : "(min-width: 360px) 144px, 40vw"
      : props.coverSizes;
  const attrs = getImageAttrs(props.cover, sizes);
  delete attrs.onError;
  return attrs;
});

watch(
  () => props.cover,
  () => {
    coverLoaded.value = false;
    coverFailed.value = false;
  },
  { flush: "sync" },
);

function handleCoverLoad(event) {
  if (event.currentTarget.getAttribute("data-cover-src") !== props.cover)
    return;
  coverLoaded.value = true;
  coverFailed.value = false;
}
function handleCoverError(event) {
  const image = event.currentTarget;
  if (image.getAttribute("data-cover-src") !== props.cover) return;
  const original = image.getAttribute("data-original-src");
  if (original && image.getAttribute("src") !== original) {
    restoreOriginalImage(event);
    return;
  }
  coverLoaded.value = false;
  coverFailed.value = true;
}
function syncCoverImage(image) {
  if (!image?.complete) return;
  const event = { currentTarget: image };
  if (image.naturalWidth > 0) handleCoverLoad(event);
  else handleCoverError(event);
}
</script>

<style>
.catalog-compact-preview {
  --preview-width: min(40%, 9rem);
}

@media (width < 48rem) {
  .catalog-responsive-compact .badge {
    border-color: transparent;
    background-color: color-mix(in oklab, var(--color-primary) 8%, transparent);
    color: var(--color-primary);
    backdrop-filter: none;
  }
}
</style>
