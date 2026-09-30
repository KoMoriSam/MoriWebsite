<template>
  <main
    class="mx-auto w-full max-w-7xl flex-1 px-6 pt-3 pb-6 md:px-8 md:pt-4 md:pb-8"
    :class="fillHeight ? 'flex h-full min-h-0 flex-col overflow-hidden max-lg:pb-0 max-sm:px-4' : ''"
    :aria-labelledby="showHeader ? titleId : undefined"
  >
    <nav v-if="crumbs.length && !compactHeader" class="breadcrumbs text-sm" aria-label="面包屑导航">
      <ul>
        <li v-for="(crumb, index) in crumbs" :key="crumb.name ?? crumb.path">
          <router-link v-if="crumb.to" :to="crumb.to">
            {{ crumb.label }}
          </router-link>
          <span
            v-else
            class="cursor-default no-underline text-base-content/50 italic font-light"
            :aria-current="index === crumbs.length - 1 ? 'page' : undefined"
          >
            {{ crumb.label }}
          </span>
        </li>
      </ul>
    </nav>
    <header v-if="showHeader" :class="[compactHeader ? 'mb-3' : 'mb-6', fillHeight ? 'shrink-0' : '']">
      <section
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:flex-nowrap md:items-end md:gap-4"
      >
        <hgroup class="contents md:block md:max-w-3xl md:min-w-0">
          <div class="order-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:order-none" :class="compactHeader ? 'sr-only' : 'w-full md:w-auto'">
            <h1
              :id="titleId"
              class="font-serif text-3xl font-bold md:text-4xl text-balance"
            >
              <slot name="title">{{ title }}</slot>
            </h1>

            <span
              v-if="$slots.eyebrow || (showMeta && eyebrow)"
              class="text-[0.675rem] font-medium tracking-wide text-base-content/40 md:text-xs"
            >
              <slot name="eyebrow">{{ eyebrow }}</slot>
            </span>
          </div>

          <div
            v-if="$slots.meta"
            class="order-2 flex max-w-full shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm text-base-content/60 md:order-none md:shrink"
            :class="compactHeader ? '' : 'md:mt-3'"
            :aria-label="metasLabel || undefined"
          >
            <slot name="meta"></slot>
          </div>

          <p
            v-if="$slots.description || (showMeta && description)"
            class="order-4 w-full text-pretty text-base-content/70 md:order-none md:mt-3 md:w-auto"
            :class="compactHeader ? 'hidden' : ''"
          >
            <slot name="description">{{ description }}</slot>
          </p>
        </hgroup>

        <aside
          v-if="$slots.actions"
          class="order-3 flex max-w-full shrink-0 flex-wrap items-center gap-x-5 gap-y-2 md:order-none md:shrink md:justify-end"
          :class="hideMobileActions ? 'hidden lg:flex' : ''"
          :aria-label="translate('common.contentPage.pageActions')"
        >
          <slot name="actions"></slot>
        </aside>
      </section>
    </header>

    <slot></slot>
  </main>
  <Footer v-if="showFooter" :class="hideMobileFooter ? 'hidden lg:grid' : ''" />
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import Footer from "@/components/layout/Footer.vue";

const route = useRoute();
const router = useRouter();

defineProps({
  fillHeight: {
    type: Boolean,
    default: false,
  },
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  showMeta: {
    type: Boolean,
    default: false,
  },
  titleId: {
    type: String,
    default: "page-title",
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
  compactHeader: {
    type: Boolean,
    default: false,
  },
  hideMobileFooter: {
    type: Boolean,
    default: false,
  },
  hideMobileActions: {
    type: Boolean,
    default: false,
  },
  metasLabel: {
    type: String,
    required: false,
    default: "",
  },
});

/**
 * 根据当前路由自动生成面包屑。
 *
 * 规则：
 * - 首页（/）不显示面包屑；
 * - 面包屑始终以「主页」开头；
 * - 每个层级通过 router.resolve 按路径前缀匹配到对应路由记录，
 *   显示名称与链接均直接使用该记录的 name；
 * - 最后一层为当前页，不可点击。
 */
const crumbs = computed(() => {
  if (route.path === "/") return [];

  if (route.meta.blogList) {
    return [
      { name: "home", label: "home", to: { name: "home" } },
      { name: "blog", label: "blog" },
      { name: "blog-page", label: "page" },
      {
        name: "page-num",
        label: route.params.page || 1,
      },
    ];
  }

  const segments = route.path.split("/").filter(Boolean);

  const result = [{ name: "home", label: "home", to: { name: "home" } }];

  let cumulativePath = "";
  segments.forEach((segment, index) => {
    cumulativePath += `/${segment}`;
    const isLeaf = index === segments.length - 1;

    const resolved = router.resolve(cumulativePath);
    const isRealRoute =
      resolved.name !== "NotFound" && resolved.matched.length > 0;

    const crumbName = isRealRoute ? resolved.name : decodeURIComponent(segment);

    result.push({
      name: crumbName,
      path: cumulativePath,
      label: crumbName,
      to: isLeaf || !isRealRoute ? undefined : { name: crumbName },
    });
  });

  return result;
});
</script>
