<template>
  <section
    ref="container"
    class="not-prose relative min-w-0"
    :aria-busy="pending"
  >
    <div v-if="pending" class="relative isolate">
      <CommentsPlaceholder :input-position="inputPosition" :reactions-enabled="reactionsEnabled" />
      <div v-if="slow" class="pointer-events-none absolute inset-0 z-10 grid place-items-center p-4">
        <div class="card pointer-events-auto w-full max-w-sm border border-base-300 bg-base-100 text-base-content shadow-lg">
          <div class="card-body gap-3 p-4">
            <div role="status" class="flex items-center gap-3 text-sm font-medium">
              <span class="loading loading-spinner loading-sm shrink-0" aria-hidden="true"></span>
              <p class="min-w-0 break-words">{{ translate('reader.comments.slow') }}</p>
            </div>
            <button type="button" class="btn btn-sm self-center" @click="retry">
              {{ translate('common.navigationStatus.retry') }}
            </button>
          </div>
        </div>
      </div>
      <span v-else role="status" class="sr-only">{{ translate('reader.comments.loading') }}</span>
    </div>
    <Giscus
      :key="attempt"
      v-bind="$attrs"
      :theme="theme"
      :input-position="inputPosition"
      :reactions-enabled="reactionsEnabled"
      loading="eager"
      class="block w-full"
      :class="{ 'pointer-events-none absolute inset-x-0 top-0 opacity-0': pending }"
    />
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Giscus from '@giscus/vue';
import CommentsPlaceholder from '@/components/reader/feedback/CommentsPlaceholder.vue';
import { GISCUS_ORIGIN } from '@/composables/auth/useGithubSession';
import { useLocale } from '@/i18n';
import { loadGiscusStyles, resolveGiscusTheme } from '@/utils/giscus-theme';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  theme: { type: String, required: true },
  inputPosition: { type: String, default: 'bottom' },
  reactionsEnabled: { type: String, default: '1' },
});

const { t: translate } = useLocale();
const container = ref(null);
const pending = ref(true);
const slow = ref(false);
const attempt = ref(0);
let timer;
let stylesheet;
let stylesReady = false;
let contentReady = false;
let disposed = false;
let bridgedWidget;
let originalSendMessage;
let sentTheme;

function getWidget() {
  return container.value?.querySelector('giscus-widget');
}

function restoreBridge() {
  if (bridgedWidget) bridgedWidget.sendMessage = originalSendMessage;
  bridgedWidget = undefined;
}

function bridgeTheme(widget) {
  if (bridgedWidget === widget || typeof widget?.sendMessage !== 'function') return;
  restoreBridge();
  bridgedWidget = widget;
  originalSendMessage = widget.sendMessage;
  const send = originalSendMessage;
  // 原生组件继续保留短主题地址，重新登录或退出时不会生成超长 iframe URL。
  widget.sendMessage = function(message) {
    if (typeof message?.setConfig?.theme === 'string') {
      message = {
        ...message,
        setConfig: { ...message.setConfig, theme: resolveGiscusTheme(message.setConfig.theme, stylesheet) },
      };
    }
    return send.call(this, message);
  };
}

function syncTheme() {
  if (!stylesReady || !contentReady || disposed) return;
  const widget = getWidget();
  bridgeTheme(widget);
  const frame = widget?.shadowRoot?.querySelector('iframe');
  const theme = resolveGiscusTheme(props.theme, stylesheet);
  if (frame?.contentWindow && sentTheme !== theme) {
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
    sentTheme = theme;
  }
  pending.value = false;
  clearTimeout(timer);
}

function prepareStyles() {
  stylesReady = false;
  Promise.resolve().then(() => loadGiscusStyles(props.theme)).then(result => {
    stylesheet = result;
  }).catch(() => {
    // 预读失败时保留原生主题；下次重试重新读取共享样式。
  }).finally(() => {
    stylesReady = true;
    syncTheme();
  });
}

function startWaiting() {
  clearTimeout(timer);
  pending.value = true;
  slow.value = false;
  timer = setTimeout(() => { slow.value = true; }, 20000);
}

function retry() {
  restoreBridge();
  contentReady = false;
  sentTheme = undefined;
  startWaiting();
  if (!stylesheet) prepareStyles();
  attempt.value++;
}

function handleMessage(event) {
  if (event.origin !== GISCUS_ORIGIN) return;
  const widget = getWidget();
  const frame = widget?.shadowRoot?.querySelector('iframe');
  if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
  bridgeTheme(widget);
  const height = event.data?.giscus?.resizeHeight;
  if (typeof height !== 'number' || !Number.isFinite(height) || height < 0) return;
  if (height === 0) {
    contentReady = false;
    if (!pending.value) startWaiting();
    return;
  }
  contentReady = true;
  syncTheme();
}

watch(() => props.theme, syncTheme, { flush: 'post' });

onMounted(() => {
  startWaiting();
  window.addEventListener('message', handleMessage);
  prepareStyles();
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  disposed = true;
  restoreBridge();
  window.removeEventListener('message', handleMessage);
});
</script>

<style scoped>
:deep(giscus-widget),
:deep(giscus-widget)::part(iframe) {
  /* 画布保持稳定；实际配色和表单明暗由 iframe 内的主题一起应用。 */
  color-scheme: normal;
}

/* 内容就绪即可显示，不必等待头像等资源触发 iframe load。 */
:deep(giscus-widget)::part(iframe) {
  opacity: 1;
}
</style>
