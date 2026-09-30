<template>
  <div v-if="state.checking || state.authenticated || state.error" class="pointer-events-none fixed -left-[10000px] w-96" aria-hidden="true" inert>
    <Giscus :key="state.revision" id="github-profile-probe" v-bind="discussion" :lang="commentLocale" :theme="themeStore.giscusTheme" emit-metadata="1" loading="eager" />
  </div>
  <dialog ref="dialog" class="modal" @close="closeFallback">
    <div class="modal-box">
      <h2 class="mb-4 font-bold">{{ translate('auth.login') }}</h2>
      <Giscus v-if="state.fallbackOpen" :key="state.revision" id="github-login-fallback" v-bind="discussion" :lang="commentLocale" :theme="themeStore.giscusTheme" emit-metadata="0" loading="eager" />
      <form method="dialog" class="modal-action"><button class="btn">{{ translate('auth.close') }}</button></form>
    </div>
    <form method="dialog" class="modal-backdrop"><button>{{ translate('auth.close') }}</button></form>
  </dialog>
</template>
<script setup>
import { defineAsyncComponent, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import CONFIG from '@/constants/config';
import { useGithubSession } from '@/composables/auth/useGithubSession';
import { useLocale } from '@/i18n';
import { useThemeStore } from '@/stores/themeStore';
const Giscus = defineAsyncComponent(() => import('@giscus/vue'));
const { state, closeFallback, probeFailed } = useGithubSession();
const { t: translate, commentLocale } = useLocale();
const themeStore = useThemeStore();
const dialog = ref(null);
const discussion = { repo: CONFIG.GISCUS.novelRepo.name, repoId: CONFIG.GISCUS.novelRepo.id, category: CONFIG.GISCUS.categories.general.name, categoryId: CONFIG.GISCUS.categories.general.id, mapping: 'number', term: '2', strict: '1', reactionsEnabled: '0', inputPosition: 'top', theme: 'preferred_color_scheme', lang: 'zh-CN' };
let timeout;
watch(() => [state.revision, state.checking], () => { clearTimeout(timeout); if (state.checking) timeout = setTimeout(probeFailed, 15000); }, { immediate: true });
watch(() => state.fallbackOpen, async open => { await nextTick(); if (open) dialog.value?.showModal(); else dialog.value?.close(); });
onBeforeUnmount(() => clearTimeout(timeout));
</script>
