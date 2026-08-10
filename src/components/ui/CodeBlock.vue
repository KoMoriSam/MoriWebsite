<template>
  <section
    class="mockup-code w-full max-w-full overflow-x-auto mx-0 my-2 pb-0 relative"
  >
    <pre
      class="m-0 p-0 max-w-full before:content-none"
    ><code ref="codeEl" class="hljs bg-transparent! px-5! pt-0! text-sm md:text-base scrollbar-thin" :class="`language-${language}`">{{ code }}</code></pre>

    <span
      v-if="language"
      class="font-mono badge badge-ghost badge-sm opacity-50 absolute left-20 top-4"
      >{{ language }}</span
    >

    <span
      class="absolute right-2 top-2 tooltip tooltip-left"
      :class="copied ? 'tooltip-success' : ''"
      :data-tip="copied ? '复制成功' : '复制到剪贴板'"
    >
      <button
        class="btn btn-sm btn-square"
        @click="copy(code)"
        :class="{
          'btn-success': copied,
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
    </span>
  </section>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import hljs from "highlight.js/lib/core";
import { nextTick, onMounted, ref, toRef, watch } from "vue";
import {
  normalizeLanguage,
  preloadHighlightLanguages,
} from "@/utils/markdown/load-markdown-features";

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
const { copy, copied } = useClipboard({
  source: code,
  legacy: true,
});
</script>
