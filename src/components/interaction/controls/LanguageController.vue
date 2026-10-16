<template>
  <section :aria-label="t('common.language')">
    <ScrollableContainer class="-mx-1">
      <div class="min-h-0 overflow-y-auto overscroll-contain px-1">
        <ul class="grid gap-2 py-1 max-lg:gap-1.5">
          <li v-for="language in LOCALES" :key="language.code">
            <label
              :lang="language.code"
              class="focus-within:outline-primary relative flex min-h-14 w-full items-center gap-2 rounded-box border p-3 pr-10 text-left transition-colors focus-within:outline-2 focus-within:outline-offset-2 max-lg:min-h-11 max-lg:p-2 max-lg:pr-9"
              :class="
                locale === language.code
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-base-300 hover:bg-base-200'
              "
            >
              <input
                type="radio"
                name="language"
                :value="language.code"
                :checked="locale === language.code"
                class="absolute inset-0 cursor-pointer appearance-none rounded-box opacity-0"
                :aria-label="language.name"
                @change="select(language.code)"
              />

              <span class="min-w-0 flex-1 text-sm font-semibold">
                {{ language.name }}
              </span>

              <span
                class="badge badge-xs shrink-0 font-mono"
                :class="
                  locale === language.code ? 'badge-primary' : 'badge-soft'
                "
              >
                {{ language.code }}
              </span>

              <input
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs pointer-events-none absolute right-3 max-lg:right-2.5"
                :checked="locale === language.code"
                tabindex="-1"
                aria-hidden="true"
              />
            </label>
          </li>
          <li v-if="error" class="p-2 text-sm text-error" role="alert">
            {{ t("common.languageLoadFailed") }}
          </li>
        </ul>
      </div>
    </ScrollableContainer>
  </section>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { ref } from "vue";
import { useLocale, LOCALES } from "@/i18n";
const { t, locale, switchLocale } = useLocale();
const error = ref(false);
let request = 0;
const select = async (code) => {
  const current = ++request;
  error.value = false;
  try {
    await switchLocale(code);
  } catch {
    if (current === request) error.value = true;
  }
};
</script>
