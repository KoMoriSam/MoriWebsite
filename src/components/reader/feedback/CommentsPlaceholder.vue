<template>
  <section
    class="not-prose flex min-w-0 w-full flex-col gap-8 px-px font-sans motion-reduce:[&_.skeleton]:animate-none"
    aria-hidden="true"
  >
    <div v-if="novel" class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-serif text-2xl font-bold">{{ translate('novel.reader.chapterComments') }}</span>
      <div class="skeleton h-6 w-24 rounded-field"></div>
    </div>

    <div v-if="reactionsEnabled !== '0'" class="flex flex-col items-center gap-2">
      <div class="flex h-6 items-center">
        <div class="skeleton h-4 w-20 rounded-sm"></div>
      </div>
      <div class="flex h-[26px] items-center justify-center gap-2">
        <div class="skeleton size-[26px] rounded-full"></div>
        <div v-for="reaction in 2" :key="reaction" class="skeleton h-[26px] w-[38px] rounded-full"></div>
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-6">
      <div class="order-1 flex min-h-[30px] items-center gap-2">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div class="skeleton h-4 w-20 rounded-sm"></div>
          <div class="skeleton h-3 w-28 max-w-full rounded-sm"></div>
        </div>
        <div class="flex h-[30px] w-[108px] shrink-0 items-center justify-between rounded-selector bg-base-200 px-1">
          <div class="skeleton h-6 w-11 rounded-selector"></div>
          <div class="skeleton mr-1 h-3 w-9 rounded-sm"></div>
        </div>
      </div>

      <div
        class="min-w-0 overflow-hidden rounded-field border border-base-300 text-sm"
        :class="inputPosition === 'top' ? 'order-2' : 'order-3'"
      >
        <div class="flex h-[45px] items-center justify-between border-b border-base-300 bg-base-200/50">
          <div class="mx-2 -mb-px mt-2 flex self-end">
            <div class="flex h-[37px] items-center rounded-t-field border border-b-0 border-base-300 bg-base-100 px-4">
              <div class="skeleton h-3.5 w-7 rounded-sm"></div>
            </div>
            <div class="ml-1 flex h-[37px] items-center px-4">
              <div class="skeleton h-3.5 w-7 rounded-sm"></div>
            </div>
          </div>
          <div class="mx-2 mt-2 shrink-0 p-1">
            <div class="skeleton size-4 rounded-sm"></div>
          </div>
        </div>
        <div class="m-2">
          <div class="h-[100px] rounded-t-field border border-base-300 p-2" style="border-bottom-style: dashed">
            <div class="skeleton mt-1 h-3.5 w-3/5 rounded-sm"></div>
          </div>
          <div class="flex h-[31px] items-center justify-end rounded-b-field border border-t-0 border-base-300 px-2.5">
            <div class="skeleton h-4 w-5 rounded-sm"></div>
          </div>
        </div>
        <div class="m-2 flex h-8 items-center gap-3">
          <div v-if="githubSession.authenticated" class="skeleton h-3 w-12 rounded-sm"></div>
          <div
            class="skeleton ml-auto h-8 rounded-field"
            :class="githubSession.authenticated ? 'w-16' : 'w-44'"
          ></div>
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-4" :class="inputPosition === 'top' ? 'order-3' : 'order-2'">
        <div v-for="(lines, comment) in commentLines" :key="comment" class="min-w-0 overflow-hidden rounded-box border border-base-300 text-sm">
          <div class="flex items-center gap-2 px-4 pt-2">
            <div class="skeleton size-[30px] shrink-0 rounded-full"></div>
            <div class="skeleton h-3.5 w-20 min-w-0 rounded-sm"></div>
            <div class="skeleton h-3 w-12 shrink-0 rounded-sm"></div>
            <div class="skeleton ml-auto h-3 w-6 shrink-0 rounded-sm"></div>
          </div>
          <div class="px-4 py-4">
            <div v-for="(width, line) in lines" :key="line" class="flex h-5 items-center">
              <div class="skeleton h-3 rounded-sm" :class="width"></div>
            </div>
          </div>
          <div class="mb-3 flex h-[26px] items-center justify-between gap-2 px-4">
            <div class="flex items-center gap-2">
              <div class="skeleton h-[26px] w-9 rounded-full"></div>
              <div class="skeleton size-[26px] rounded-full"></div>
            </div>
            <div class="skeleton h-3 w-14 rounded-sm"></div>
          </div>
          <div v-if="githubSession.authenticated" class="border-t border-base-300 bg-base-200/50 px-4 py-2">
            <div class="flex h-[30px] items-center rounded-field border border-base-300 bg-base-100 px-2">
              <div class="skeleton h-3 w-28 rounded-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';
import { githubSession } from '@/composables/auth/useGithubSession';

defineProps({
  novel: { type: Boolean, default: false },
  inputPosition: { type: String, default: 'bottom' },
  reactionsEnabled: { type: String, default: '1' },
});
const { t: translate } = useLocale();
const commentLines = [['w-11/12'], ['w-full', 'w-10/12', 'w-2/3']];
</script>
