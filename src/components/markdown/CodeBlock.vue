<template>
  <section
    class="not-prose flex w-full flex-col relative mx-auto my-4 max-w-full overflow-hidden rounded-box border border-base-300 bg-base-100 font-sans"
    data-markdown-code-block
  >
    <CodeHeader type="code" :language="language">
      <template #actions>
        <aside
          class="tooltip tooltip-left mb-0.5 font-mono"
          :class="copied ? 'tooltip-success' : ''"
          :data-tip="copied ? '复制成功' : '复制到剪贴板'"
        >
          <button
            class="btn btn-sm btn-square"
            :class="{
              'btn-success': copied,
              'btn-ghost': !copied,
            }"
            @click="copy(code)"
          >
            <i
              class="font-normal"
              :class="copied ? 'ri-check-line' : 'ri-file-copy-line'"
            ></i>
          </button>
        </aside>
      </template>
    </CodeHeader>

    <CodeView :code="code" :language="language" />
  </section>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import { toRef } from "vue";
import CodeHeader from "@/components/markdown/CodeHeader.vue";
import CodeView from "@/components/markdown/CodeView.vue";

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: "plaintext" },
});

const code = toRef(props, "code");

const { copy, copied } = useClipboard({
  source: code,
  legacy: true,
});
</script>
