<template>
  <main class="my-12 mx-6 md:mx-12">
    <article class="mx-auto prose">
      <h1 class="font-serif">
        更新日志
        <router-link class="btn btn-xs no-underline mb-px" to="/">
          返回主页
        </router-link>
      </h1>

      <Loading size="my-32" v-if="isLoading" />
      <div v-else-if="error" class="text-error">{{ error }}</div>

      <template v-else>
        <ul
          class="timeline timeline-snap-icon timeline-compact timeline-vertical p-0"
        >
          <li
            :id="`version-${version}`"
            class="m-0! p-0!"
            v-for="(item, version, index) in log"
            :key="version"
          >
            <hr v-if="index !== 0" />
            <div class="timeline-middle">
              <i
                class="ri-checkbox-circle-fill text-xl"
                :class="index === 0 ? 'text-primary' : ''"
              ></i>
            </div>
            <div class="timeline-end m-0">
              <strong
                class="badge badge-lg badge-primary font-black mt-2 ml-1.5"
                :class="index === 0 ? 'text-primary-content' : 'badge-outline'"
              >
                {{ version }}
              </strong>
              <time
                class="badge badge-info font-medium mt-2 ml-1.5"
                :class="index === 0 ? 'badge-soft' : 'badge-outline'"
              >
                {{ item.date }}
              </time>
              <ul
                v-for="(changes, type) in item.changes"
                :key="type"
                class="pl-2"
              >
                <li
                  v-for="(change, idx) in changes"
                  :key="idx"
                  class="list-none grid grid-cols-[auto_1fr] gap-2 items-start"
                >
                  <strong
                    class="badge badge-soft translate-y-0.5"
                    :class="`badge-${typeColor(type)} text-${typeColor(type)}`"
                  >
                    {{ typeText(type) }}
                  </strong>
                  {{ change }}
                </li>
              </ul>
              <p
                class="ml-1.5 mt-4 text-sm grid grid-cols-[auto_1fr] gap-2 items-start"
              >
                <span
                  :class="[
                    'badge badge-sm',
                    item.warning ? 'badge-warning' : 'badge-success',
                    index === 0 ? '' : 'badge-outline',
                  ]"
                >
                  <i
                    :class="item.warning ? 'ri-alert-line' : 'ri-check-line'"
                  ></i>
                  {{ item.warning ? "请注意" : "放心食用" }}
                </span>
                <span
                  class="ml-1.5 text-sm"
                  :class="
                    item.warning ? 'text-warning' : 'text-base-content/50'
                  "
                >
                  {{ item.note || item.warning }}
                </span>
              </p>
            </div>
            <hr v-if="index !== Object.keys(log).length - 1" />
          </li>
        </ul>
      </template>
    </article>
  </main>
  <ToTop />
</template>

<script setup>
import { useChangelogStore } from "@/stores/changelogStore";
import { onMounted, computed } from "vue";
import ssgData from "@/router/ssg-data";

import Loading from "@/components/base/Loading.vue";
import ToTop from "@/components/base/ToTop.vue";

const store = useChangelogStore();

if (
  Object.keys(store.data).length === 0 &&
  ssgData.changelog &&
  typeof ssgData.changelog === "object"
) {
  store.hydrateChangelog(ssgData.changelog);
}

const log = computed(() => store.data);
const isLoading = computed(() => store.loading);
const error = computed(() => store.error);

// 获取数据
onMounted(async () => {
  if (Object.keys(store.data).length === 0) {
    await store.fetchChangelog();
  }
});

import { typeColor, typeText } from "@/utils/type-changelog";
</script>
