<template>
  <details ref="menu" class="dropdown dropdown-end" @toggle="onToggle" @keydown.esc.prevent="close">
    <summary ref="trigger" class="btn btn-ghost btn-square" :aria-label="t('common.language')" :aria-expanded="open" @keydown.down.prevent="focusOptions">
      <i class="ri-translate-2 text-lg" aria-hidden="true"></i>
    </summary>
    <ul class="dropdown-content menu z-80 mt-2 w-48 rounded-box bg-base-100 p-2 shadow-lg" :aria-label="t('common.language')" @keydown="navigateOptions">
      <li v-for="language in LOCALES" :key="language.code">
        <button type="button" :lang="language.code" :aria-pressed="locale === language.code" :class="{ 'menu-active': locale === language.code }" @click="select(language.code)">
          <span class="flex-1">{{ language.name }}</span>
          <i v-if="locale === language.code" class="ri-check-line" aria-hidden="true"></i>
        </button>
      </li>
      <li v-if="error" class="p-2 text-sm text-error" role="alert">{{ t('common.languageLoadFailed') }}</li>
    </ul>
  </details>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useLocale, LOCALES } from '@/i18n';
const { t, locale, switchLocale } = useLocale();
const menu = ref(null);
const trigger = ref(null);
const open = ref(false);
const error = ref(false);
let request = 0;
const onToggle = () => { open.value = Boolean(menu.value?.open); };
const focusOptions = async () => {
  menu.value.open = true;
  await nextTick();
  menu.value.querySelector('button[aria-pressed="true"]')?.focus();
};
const navigateOptions = (event) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const buttons = [...menu.value.querySelectorAll('li button')];
  const current = buttons.indexOf(event.target);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[next]?.focus();
};
const close = () => {
  if (!menu.value) return;
  menu.value.open = false;
  void nextTick(() => trigger.value?.focus());
};
onClickOutside(menu, () => { if (menu.value) menu.value.open = false; });
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
