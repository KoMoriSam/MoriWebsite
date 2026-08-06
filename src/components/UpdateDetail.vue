<template>
  <section class="min-w-0" aria-labelledby="update-version-title">
    <header
      class="rounded-box border border-primary/35 bg-primary/5 p-4 sm:p-5"
    >
      <div class="flex items-start gap-3.5">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
          aria-hidden="true"
        >
          <i class="ri-sparkling-2-fill"></i>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2
              id="update-version-title"
              class="font-serif text-2xl font-bold leading-none sm:text-3xl"
            >
              {{ props.version }}
            </h2>
            <span class="badge badge-primary badge-soft badge-sm"
              >当前版本</span
            >
          </div>
          <div
            class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/55"
          >
            <time :datetime="props.date">{{ formattedDate }}</time>
            <span
              class="size-1 rounded-full bg-base-content/25"
              aria-hidden="true"
            ></span>
            <span>{{ totalCount }} 项变更</span>
          </div>
        </div>
      </div>
    </header>

    <article class="my-2">
      <section
        v-for="group in displayedGroups"
        :key="group.type"
        class="grid gap-2 py-2 sm:grid-cols-[3rem_minmax(0,1fr)]"
      >
        <div>
          <span
            class="badge badge-sm font-semibold -translate-y-0.5"
            :class="typeBadgeClass(group.type)"
          >
            {{ typeText(group.type) }}
          </span>
        </div>
        <ul class="grid min-w-0 gap-2">
          <li
            v-for="(change, index) in group.changes"
            :key="`${group.type}-${index}`"
            class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 text-sm leading-relaxed text-pretty"
          >
            <span
              class="mt-[0.65em] size-1 rounded-full bg-base-content/30"
              aria-hidden="true"
            ></span>
            <span class="min-w-0 break-words">{{ change }}</span>
          </li>
        </ul>
      </section>
    </article>

    <aside
      v-if="props.note || props.warning"
      class="alert mt-4 items-start"
      :class="
        props.warning
          ? 'alert-warning alert-soft'
          : 'border border-base-300 bg-base-200/60'
      "
      role="note"
    >
      <i
        :class="props.warning ? 'ri-alert-line' : 'ri-information-line'"
        aria-hidden="true"
      ></i>
      <div>
        <p class="text-sm font-semibold">
          {{ props.warning ? "升级前请注意" : "版本说明" }}
        </p>
        <p class="mt-0.5 text-sm opacity-80">
          {{ props.warning || props.note }}
        </p>
      </div>
    </aside>

    <div v-if="remainingCount > 0" class="divider text-xs text-base-content/50">
      还有 {{ remainingCount }} 项变更未展示
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { typeText } from "@/utils/type-changelog";

const MAX_VISIBLE = 5;

const props = defineProps({
  version: String,
  date: String,
  changes: Object,
  warning: String,
  note: String,
});

const changeGroups = computed(() =>
  Object.entries(props.changes || {}).map(([type, changes]) => ({
    type,
    changes: Array.isArray(changes) ? changes : [],
  })),
);

const totalCount = computed(() =>
  changeGroups.value.reduce((total, group) => total + group.changes.length, 0),
);

const displayedGroups = computed(() => {
  let available = MAX_VISIBLE;

  return changeGroups.value.reduce((groups, group) => {
    if (available <= 0) return groups;

    const changes = group.changes.slice(0, available);
    if (changes.length > 0) {
      groups.push({ ...group, changes });
      available -= changes.length;
    }

    return groups;
  }, []);
});

const remainingCount = computed(() =>
  Math.max(totalCount.value - MAX_VISIBLE, 0),
);

const typeBadgeClasses = {
  feature: "badge-primary",
  fix: "badge-error",
  improve: "badge-secondary",
  performance: "badge-success",
  refactor: "badge-warning",
  default: "badge-info",
};

const typeBadgeClass = (type) =>
  typeBadgeClasses[type] || typeBadgeClasses.default;

const formattedDate = computed(() => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.date || "");
  if (!match) return props.date;
  return `${match[1]}/${Number(match[2])}/${Number(match[3])}`;
});
</script>
