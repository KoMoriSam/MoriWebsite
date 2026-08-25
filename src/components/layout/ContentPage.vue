<template>
  <main
    class="mx-auto w-full max-w-7xl px-6 py-3 md:px-8 md:py-4"
    :aria-labelledby="showHeader ? titleId : undefined"
  >
    <nav
      v-if="$slots.actions || crumbs.length"
      class="breadcrumbs text-sm"
      aria-label="面包屑导航"
    >
      <template v-if="$slots.actions">
        <slot name="actions"></slot>
      </template>
      <ul v-else>
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
    <header v-if="showHeader" class="mb-6">
      <section
        class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <hgroup class="max-w-3xl min-w-0">
          <h1
            :id="titleId"
            class="font-serif text-3xl font-bold md:text-4xl text-balance"
          >
            <slot name="title">{{ title }}</slot>
          </h1>

          <span
            v-if="eyebrow || $slots.eyebrow"
            class="mb-2 text-[0.675rem] md:text-xs font-semibold tracking-wide text-base-content/50 uppercase"
          >
            <slot name="eyebrow">{{ eyebrow }}</slot>
          </span>

          <p
            v-if="description || $slots.description"
            class="mt-3 text-pretty text-base-content/70"
          >
            <slot name="description">{{ description }}</slot>
          </p>
        </hgroup>

        <aside
          v-if="$slots.badges"
          class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-base-content/60 md:justify-end"
          :aria-label="badgesLabel"
        >
          <slot name="badges"></slot>
        </aside>
      </section>
    </header>

    <slot></slot>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

defineProps({
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
  titleId: {
    type: String,
    default: "page-title",
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  badgesLabel: {
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
