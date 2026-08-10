<template>
  <aside
    v-if="notes.length"
    class="page-footnotes markdown-content prose absolute inset-x-0 z-10 max-w-none overflow-y-auto bg-base-100/95"
    :class="{ 'page-footnotes-measure': measure }"
    aria-label="本页脚注"
    data-reader-interactive
  >
    <hr class="footnotes-sep" />
    <section class="footnotes">
      <ol class="footnotes-list">
        <li
          v-for="note in notes"
          :key="note.id"
          :value="getNoteNumber(note.label)"
          class="footnote-item"
        >
          <p class="text-justify text-pretty">{{ note.text }}</p>
        </li>
      </ol>
    </section>
  </aside>
</template>

<script setup>
defineProps({
  notes: {
    type: Array,
    default: () => [],
  },
  measure: {
    type: Boolean,
    default: false,
  },
});

const getNoteNumber = (label) => {
  const number = Number.parseInt(String(label || ""), 10);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};
</script>

<style scoped>
.page-footnotes {
  bottom: var(--reader-page-padding-block);
  height: var(--reader-footnote-reserve);
  padding: 0;
  overscroll-behavior: contain;
}

.page-footnotes.markdown-content.prose > .footnotes-sep {
  margin-block: 0 calc(var(--para-font-size) * 0.25);
  margin-inline: 0;
  padding: 0;
}

.page-footnotes.markdown-content.prose .footnotes,
.page-footnotes.markdown-content.prose .footnotes-list {
  margin: 0;
  padding-block: 0;
}

.page-footnotes.markdown-content.prose .footnotes-list {
  padding-inline-start: 1.5em;
}

.page-footnotes.markdown-content.prose .footnote-item {
  margin: 0;
  padding: 0;
}

.page-footnotes.markdown-content.prose .footnote-item + .footnote-item {
  margin-block-start: calc(var(--para-font-size) * 0.125);
}

.page-footnotes.markdown-content.prose .footnotes p {
  margin: 0;
  padding: 0;
}

.page-footnotes-measure {
  position: static;
  inset: auto;
  height: auto;
  overflow: visible;
}
</style>
