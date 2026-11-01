<template>
  <aside
    role="note"
    class="alert alert-outline bg-base-200/25 relative isolate block overflow-hidden"
    data-pagefind-ignore
  >
    <i
      class="pointer-events-none absolute top-1/2 right-0 -z-10 -translate-y-1/2 text-[12rem] leading-none text-base-content/5 select-none sm:right-6 sm:text-[15rem]"
      :class="
        licenseInfo.type === 'cc' || licenseInfo.type === 'cc0'
          ? 'ri-creative-commons-line'
          : 'ri-copyright-line'
      "
      aria-hidden="true"
    ></i>
    <div class="min-w-0 w-full not-prose">
      <p
        v-if="title"
        class="text-base leading-snug font-serif font-bold wrap-anywhere"
      >
        {{ title }}
      </p>
      <a
        v-if="url"
        :href="url"
        rel="bookmark"
        class="link link-primary link-hover mt-1 block w-fit max-w-full text-sm leading-relaxed font-mono wrap-anywhere"
        >{{ url }}</a
      >
      <dl
        class="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-8"
        :class="{ 'mt-3': title || url }"
      >
        <div v-if="author" class="min-w-0 max-w-full">
          <dt class="text-xs leading-relaxed text-base-content/55">
            {{ translate("common.contentRights.author") }}
          </dt>
          <dd
            class="mt-0.5 text-sm leading-relaxed font-mono italic wrap-anywhere"
          >
            {{ author }}
          </dd>
        </div>
        <div v-if="publishedAt" class="min-w-0 max-w-full">
          <dt class="text-xs leading-relaxed text-base-content/55">
            {{ translate("common.contentRights.publishedAt") }}
          </dt>
          <dd class="mt-0.5 text-sm leading-relaxed font-mono">
            <time :datetime="publishedAt">{{ publishedAt }}</time>
          </dd>
        </div>
        <div class="min-w-0 max-w-full">
          <dt class="text-xs leading-relaxed text-base-content/55">
            {{ translate("common.contentRights.license") }}
          </dt>
          <dd class="mt-0.5 text-sm leading-relaxed wrap-anywhere">
            <a
              v-if="licenseInfo.url"
              :href="licenseInfo.url"
              target="_blank"
              rel="license noopener noreferrer"
              class="link link-primary link-hover font-mono"
              >{{ licenseInfo.label }}</a
            >
            <span v-else>{{ licenseInfo.label }}</span>
          </dd>
        </div>
      </dl>
      <p class="mt-3 text-sm leading-relaxed text-pretty">
        {{ translate(descriptionKey) }}
      </p>
      <p class="mt-1 text-xs leading-relaxed text-pretty text-base-content/65">
        {{ translate("common.contentRights.thirdParty") }}
      </p>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useLocale } from "@/i18n";
import {
  ALL_RIGHTS_RESERVED,
  DEFAULT_BLOG_LICENSE,
  resolveContentLicense,
} from "@/utils/content-license";

const props = defineProps({
  kind: {
    type: String,
    required: true,
    validator: (value) => ["blog", "novel"].includes(value),
  },
  license: { type: String, default: undefined },
  title: { type: String, default: "" },
  url: { type: String, default: "" },
  author: { type: String, default: "" },
  publishedAt: { type: String, default: "" },
});
const { t: translate } = useLocale();
const licenseInfo = computed(() =>
  resolveContentLicense(
    props.license,
    props.kind === "novel" ? ALL_RIGHTS_RESERVED : DEFAULT_BLOG_LICENSE,
  ),
);
const descriptionKey = computed(() => {
  if (licenseInfo.value.type === "reserved")
    return props.kind === "novel"
      ? "common.contentRights.novel"
      : "common.contentRights.reserved";
  if (licenseInfo.value.type === "cc0")
    return "common.contentRights.publicDomain";
  if (licenseInfo.value.type === "custom") return "common.contentRights.custom";
  return "common.contentRights.blog";
});
</script>
