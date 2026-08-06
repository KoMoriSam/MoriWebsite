<template>
  <div
    class="mockup-code w-full max-w-full overflow-x-auto my-0 relative group"
  >
    <pre
      class="m-0 p-0 max-w-full overflow-x-auto before:content-none"
    ><code ref="codeEl" class="hljs bg-transparent! py-0!" :class="`language-${language}`">{{ code }}</code></pre>

    <div
      v-if="isSupported"
      class="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity tooltip tooltip-left"
      :class="copied ? 'tooltip-success' : 'tooltip-accent'"
      :data-tip="copied ? '复制成功' : '复制到剪贴板'"
    >
      <button
        class="btn btn-sm btn-square"
        @click="copy(code)"
        :class="{
          'btn-success text-success-content': copied,
          'btn-neutral': !copied,
        }"
      >
        <i
          :class="[
            copied ? 'ri-check-line' : 'ri-file-copy-line',
            'font-normal',
          ]"
        ></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import hljs from "highlight.js/lib/core";
import { nextTick, onMounted, ref, toRef, watch } from "vue";
import {
  normalizeLanguage,
  preloadHighlightLanguages,
} from "@/utils/markdown/markdown-feature-loader";

// 接收 props
const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: "plaintext" },
});

const code = toRef(props, "code");
const codeEl = ref(null);

const highlightCode = async () => {
  const language = normalizeLanguage(props.language) || "plaintext";

  await preloadHighlightLanguages([language, "plaintext"]);
  await nextTick();

  if (!codeEl.value) {
    return;
  }

  const resolvedLanguage = hljs.getLanguage(language) ? language : "plaintext";
  codeEl.value.innerHTML = hljs.highlight(props.code, {
    language: resolvedLanguage,
    ignoreIllegals: true,
  }).value;
};

onMounted(highlightCode);
watch(() => [props.code, props.language], highlightCode, { flush: "post" });

// 复制功能
const { copy, copied, isSupported } = useClipboard({
  source: code,
});
</script>
