<template>
  <section
    class="not-prose markdown-block markdown-block-panel"
    data-markdown-code-block
    :data-language="language"
    :data-title="title || undefined"
  >
    <CodeHeader type="code" :language="language" :title="title">
      <template #actions>
        <aside
          class="tooltip tooltip-left font-mono"
          :class="copied ? 'tooltip-success' : ''"
          :data-tip="copied ? translate('markdown.codeBlock.copied') : translate('markdown.codeBlock.copy')"
        >
          <button
            class="btn btn-sm btn-square markdown-control"
            :class="{
              'btn-success': copied,
              'btn-ghost': !copied,
            }"
            @click="copy(code)"
          >
            <i :class="copied ? 'ri-check-line' : 'ri-file-copy-line'"></i>
          </button>
        </aside>
      </template>
    </CodeHeader>

    <CodeView :code="code" :language="language" />
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { useClipboard } from "@vueuse/core";
import { toRef } from "vue";
import CodeHeader from "@/components/markdown/code/CodeHeader.vue";
import CodeView from "@/components/markdown/code/CodeView.vue";

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: "" },
  title: { type: String, default: "" },
});

const code = toRef(props, "code");

const { copy, copied } = useClipboard({
  source: code,
  legacy: true,
});
</script>
