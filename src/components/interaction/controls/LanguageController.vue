<template>
  <div>
    <button
      ref="trigger"
      type="button"
      class="btn btn-ghost max-xl:btn-square"
      popovertarget="language-controller"
      style="anchor-name: --language-controller-anchor"
      :aria-label="t('common.language')"
      :aria-expanded="open"
      @keydown.down.prevent="focusOptions"
    >
      <i class="ri-translate-2 text-lg" aria-hidden="true"></i>
      <span class="hidden xl:block">{{ currentLanguageName }}</span>
      <i class="ri-arrow-down-s-line hidden xl:block" aria-hidden="true"></i>
    </button>
    <section
      id="language-controller"
      ref="menu"
      popover="auto"
      class="dropdown dropdown-end mt-2 max-h-[min(78dvh,32rem)] w-72 overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100 p-3 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:[inset:3.75rem_0.5rem_auto_auto]! max-sm:[position-area:none]!"
      style="position-anchor: --language-controller-anchor"
      aria-labelledby="language-controller-title"
      @toggle="onToggle"
      @keydown.esc.prevent="close"
    >
      <div class="mb-2 flex items-center justify-between gap-3 lg:px-1 max-lg:mb-1.5 max-lg:gap-2">
        <h2
          id="language-controller-title"
          class="font-serif mt-0.5 text-lg font-semibold"
        >
          {{ t("common.language") }}
        </h2>
        <span class="badge badge-primary badge-sm">{{
          currentLanguageName
        }}</span>
      </div>
      <ul class="grid gap-2 max-lg:gap-1.5" @keydown="navigateOptions">
        <li v-for="language in LOCALES" :key="language.code">
          <button
            type="button"
            :lang="language.code"
            :aria-pressed="locale === language.code"
            class="focus-visible:outline-primary flex min-h-14 w-full items-center gap-3 rounded-box border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:min-h-11 max-lg:gap-2 max-lg:p-2"
            :class="
              locale === language.code
                ? 'border-primary/50 bg-primary/10'
                : 'border-base-300 hover:bg-base-200'
            "
            @click="select(language.code)"
          >
            <span class="min-w-0 flex-1 text-sm font-semibold">{{
              language.name
            }}</span>
            <span class="badge badge-ghost badge-xs shrink-0 font-mono">{{
              language.code
            }}</span>
            <i
              class="text-primary shrink-0 text-lg"
              :class="
                locale === language.code
                  ? 'ri-checkbox-circle-fill'
                  : 'ri-checkbox-blank-circle-line opacity-35'
              "
              aria-hidden="true"
            ></i>
          </button>
        </li>
        <li v-if="error" class="p-2 text-sm text-error" role="alert">
          {{ t("common.languageLoadFailed") }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";
import { useLocale, LOCALES } from "@/i18n";
const { t, locale, switchLocale } = useLocale();
const currentLanguageName = computed(
  () => LOCALES.find((language) => language.code === locale.value)?.name,
);
const menu = ref(null);
const trigger = ref(null);
const open = ref(false);
const error = ref(false);
let request = 0;
const onToggle = (event) => {
  open.value = event.newState === "open";
};
const focusOptions = async () => {
  menu.value?.showPopover();
  await nextTick();
  menu.value.querySelector('button[aria-pressed="true"]')?.focus();
};
const navigateOptions = (event) => {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const buttons = [...menu.value.querySelectorAll("li button")];
  const current = buttons.indexOf(event.target);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
          buttons.length;
  event.preventDefault();
  buttons[next]?.focus();
};
const close = () => {
  if (!menu.value?.matches(":popover-open")) return;
  menu.value.hidePopover();
  void nextTick(() => trigger.value?.focus());
};
const select = async (code) => {
  const current = ++request;
  error.value = false;
  try {
    const switched = await switchLocale(code);
    if (current === request && switched) close();
  } catch {
    if (current === request) error.value = true;
  }
};
</script>
