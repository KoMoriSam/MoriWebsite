<template>
  <PageShell section-id="reader-share">
    <section class="min-w-0">
      <p class="max-w-3xl text-sm leading-relaxed text-base-content/65">
        生成结果应为 1080 × 1350
        PNG；短内容完整显示，长内容显示截断提示。关闭预览后再次打开应重新生成并释放旧预览。
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn btn-sm btn-primary" @click="openShortSample">
          生成富文本示例
        </button>
        <button class="btn btn-sm btn-outline" @click="openLongSample">
          生成长文截断示例
        </button>
        <button class="btn btn-sm" :disabled="auditing" @click="runAudit">
          {{ auditing ? '正在测试所有示例…' : '测试全部 Markdown 分享' }}
        </button>
        <button class="btn btn-sm btn-outline" :disabled="auditing" @click="runAudit(resultSlug)">复测当前分类</button>
        <button v-if="auditing" class="btn btn-sm btn-ghost" @click="cancelAudit = true">
          停止
        </button>
      </div>
      <p class="my-3 text-sm" role="status" data-share-audit-status>
        {{ auditStatus }}
      </p>
      <div class="my-4">
        <label class="text-sm">
          查看测试结果
          <select v-model="resultSlug" class="select select-sm ms-2">
            <option v-for="sample in markdownSamples" :key="sample.slug" :value="sample.slug">
              {{ sample.name }}
            </option>
          </select>
        </label>
        <div v-if="auditResults.length" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-share-audit-results>
          <article v-for="result in visibleResults" :key="result.id" class="card card-border card-sm min-w-0">
            <figure v-if="result.url">
              <img :src="result.url" :alt="result.label" loading="lazy" width="1080" height="1350" class="aspect-4/5 w-full" />
            </figure>
            <div class="card-body">
              <h3 class="card-title text-sm">{{ result.label }}</h3>
              <p class="break-words text-xs" :class="result.error ? 'text-error' : 'text-base-content/65'">
                {{ result.error || `${result.type} · 1080 × 1350${result.truncated ? ' · 已截断' : ''} · ${result.durationMs} ms` }}
              </p>
              <p v-if="result.warning" class="break-all text-xs text-warning" data-share-audit-warning>{{ result.warning }}</p>
            </div>
          </article>
        </div>
      </div>
      <details class="mt-4" :open="auditing">
        <summary>当前测试的阅读器内容：{{ activeSample.name }}</summary>
        <div class="mx-auto mt-4 max-w-3xl">
          <Renderer
            :key="renderKey"
            ref="auditRenderer"
            :content="activeSample.content"
            :data-share-sample="activeSample.slug"
            :header-data="{ uuid: 'share-audit', sourceType: 'article' }"
            :style-configs="readerStore.styleConfigs"
            @render-ready="handleAuditReady"
          />
        </div>
      </details>
      <ShareCard ref="shareDialogRef" />
    </section>
  </PageShell>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, provide, ref, shallowRef } from "vue";
import ShareCard from "@/components/reader/interaction/ShareCard.vue";
import Renderer from "@/components/markdown/Renderer.vue";
import { useReaderStore } from "@/stores/readerStore";
import { useArticleApi } from "@/services/api-articles";
import { createArticleWikiLinkResolver } from "@/utils/blog/article-wiki-links";
import { WIKI_LINK_RESOLVER } from "@/utils/markdown/markdown-it-wikilink";
import { createReaderShareContent } from "@/utils/reader/create-reader-share-content";
import { createReaderShareCard } from "@/utils/reader/create-reader-share-card";
import { MARKDOWN_SAMPLES as markdownSamples } from "./markdown-samples";
import PageShell from "./PageShell.vue";

const shareDialogRef = ref(null);
const readerStore = useReaderStore();
const auditRenderer = ref(null);
const sampleIndex = ref(0);
const renderKey = ref(0);
const activeSample = computed(() => markdownSamples[sampleIndex.value]);
const auditing = ref(false);
const cancelAudit = ref(false);
const auditStatus = ref('尚未运行全部示例测试');
const auditResults = shallowRef([]);
const resultSlug = ref(markdownSamples[0].slug);
const visibleResults = computed(() => auditResults.value.filter(result => result.slug === resultSlug.value));
const wikiLinkResolver = shallowRef(null);
provide(WIKI_LINK_RESOLVER, wikiLinkResolver);
let resolveReady;
function handleAuditReady() {
  const root = auditRenderer.value?.$el;
  if (!(root instanceof Element) || root.dataset.shareSample !== activeSample.value.slug) return;
  if (activeSample.value.slug === 'LaTeX' && !root.querySelector('mjx-container[data-reader-latex-source]')) return;
  if (activeSample.value.slug === 'code-blocks' && !root.querySelector('[class*="hljs-"]')) return;
  resolveReady?.();
}
function clearAuditResults() {
  auditResults.value.forEach(result => { if (result.url) URL.revokeObjectURL(result.url); });
  auditResults.value = [];
}
onBeforeUnmount(() => { cancelAudit.value = true; resolveReady?.(); clearAuditResults(); });

async function runAudit(onlySlug) {
  auditing.value = true;
  cancelAudit.value = false;
  clearAuditResults();
  let failures = 0;
  let warnings = 0;
  const samples = typeof onlySlug === 'string' ? markdownSamples.filter(sample => sample.slug === onlySlug) : markdownSamples;
  try {
    if (!wikiLinkResolver.value) {
      try {
        wikiLinkResolver.value = createArticleWikiLinkResolver(await useArticleApi().fetchArticleList());
      } catch { /* 未配置文章服务时仍测试其余 Markdown 示例。 */ }
    }
    for (let index = 0; index < samples.length && !cancelAudit.value; index++) {
      const sample = samples[index];
      auditStatus.value = `${index + 1}/${samples.length} · ${sample.name} · 等待阅读器渲染`;
      let timeout;
      try {
        const ready = new Promise((resolve, reject) => {
          resolveReady = resolve;
          timeout = window.setTimeout(() => reject(new Error('阅读器渲染超时')), 45000);
        });
        sampleIndex.value = markdownSamples.indexOf(sample);
        renderKey.value++;
        await ready;
        await nextTick();
        const root = auditRenderer.value?.$el;
        if (!(root instanceof Element)) throw new Error('未找到阅读器正文');
        for (const card of root.querySelectorAll('.markdown-link-card')) {
          if (!card.querySelector('[data-card-motion="description"] [aria-busy="true"]')) continue;
          card.scrollIntoView({ block: 'center' });
          await new Promise(resolve => {
            const done = () => { observer.disconnect(); window.clearTimeout(timer); resolve(); };
            const observer = new MutationObserver(() => {
              if (!card.querySelector('[data-card-motion="description"] [aria-busy="true"]')) done();
            });
            const timer = window.setTimeout(done, 12000);
            observer.observe(card, { subtree: true, attributes: true, childList: true });
          });
        }
        const range = document.createRange();
        range.selectNodeContents(root);
        const content = createReaderShareContent({ range, element: root });
        if (!content.blocks.length) throw new Error('示例没有提取出可分享内容');
        if (sample.slug === 'LaTeX' && !root.querySelector('mjx-container[data-reader-latex-source]')) throw new Error('公式插件尚未渲染完成');
        if (sample.slug === 'code-blocks' && !root.querySelector('[class*="hljs-"]')) throw new Error('代码高亮尚未渲染完成');
        if (root.querySelector('table') && !content.blocks.some(block => block.rows?.length)) throw new Error('表格结构丢失');
        if (root.querySelector('.markdown-link-card') && !content.blocks.some(block => block.type === 'link-card')) throw new Error('链接卡片丢失');
        const cases = [
          { label: '全文选区', blocks: content.blocks },
          ...content.blocks.map((block, blockIndex) => ({
            label: `${blockIndex + 1}. ${block.runs?.map(run => run.text).join('').slice(0, 44) || block.alt || block.type}`,
            blocks: [block],
          })),
        ];
        for (const [i, element] of [...root.querySelectorAll('.markdown-link-card, [data-markdown-alert], [data-markdown-chat], [data-markdown-moment], table, figure.markdown-figure')].entries()) {
          const pointContent = createReaderShareContent({ element });
          if (pointContent.blocks.length) cases.push({ label: `块点击 ${i + 1} · ${element.textContent.trim().slice(0, 32) || element.tagName}`, blocks: pointContent.blocks });
        }
        const paragraph = [...root.querySelectorAll('p')].find(p => !p.closest('[data-mermaid-viewer]') && p.textContent.trim().length > 12);
        if (paragraph) {
          const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode()) && (node.textContent.trim().length < 6 || node.parentElement.closest('button, [aria-hidden="true"]'))) { /* 找到正文文字，不选 UI 标签。 */ }
          if (node) {
            const partial = document.createRange();
            partial.setStart(node, 1);
            partial.setEnd(node, Math.min(node.textContent.length, 18));
            const selected = createReaderShareContent({ range: partial, element: paragraph });
            const actual = selected.blocks.flatMap(block => block.runs || []).map(run => run.text).join('').trim();
            if (actual !== partial.toString().trim()) throw new Error(`局部选区包含未选中文字：${actual}`);
            cases.push({ label: '局部选区', blocks: selected.blocks });
          }
        }
        for (const [caseIndex, item] of cases.entries()) {
          if (cancelAudit.value) break;
          const result = { id: `${sample.slug}-${caseIndex}`, slug: sample.slug, label: item.label, type: item.blocks.map(block => block.type).filter((type, i, list) => list.indexOf(type) === i).join(', ') };
          auditStatus.value = `${index + 1}/${samples.length} · ${sample.name} · ${caseIndex + 1}/${cases.length} · 已生成 ${auditResults.value.length} 张 · ${failures} 个错误`;
          const started = performance.now();
          try {
            const output = await createReaderShareCard({ shareContent: { blocks: item.blocks }, meta: { ...baseMeta, title: `${sample.name} · ${item.label}`, path: `/test/markdown/${sample.slug}` } });
            if (output.canvas.width !== 1080 || output.canvas.height !== 1350 || output.blob.type !== 'image/png') throw new Error('图片格式或尺寸错误');
            result.url = URL.createObjectURL(output.blob);
            result.truncated = output.truncated;
            result.warning = output.warnings?.join('\n') || '';
            if (result.warning) warnings++;
            output.canvas.width = output.canvas.height = 0;
          } catch (error) {
            result.error = error.message;
            failures++;
          }
          result.durationMs = Math.round(performance.now() - started);
          auditResults.value = [...auditResults.value, result];
          await nextTick();
        }
      } catch (error) {
        failures++;
        auditResults.value = [...auditResults.value, { id: `${sample.slug}-error`, slug: sample.slug, label: sample.name, error: error.message }];
      } finally {
        window.clearTimeout(timeout);
        resolveReady = null;
      }
    }
    auditStatus.value = `${cancelAudit.value ? '已停止' : '测试完成'} · ${samples.length} 类示例 · ${auditResults.value.length} 个分享结果 · ${failures} 个错误 · ${warnings} 个资源降级`;
  } finally { auditing.value = false; }
}

const baseMeta = {
  sourceLabel: "开发测试面板",
  detail: "阅读器分享卡片 · 富文本与排版检查",
  path: "/test/reader-share",
};

function openShortSample() {
  void shareDialogRef.value?.open({
    text: "分享卡片应保留正文的主要行内样式与块级结构。",
    paragraphId: "reader-share-rich-sample",
    shareContent: {
      blocks: [
        {
          type: "heading",
          level: 2,
          runs: [{ text: "富文本分享卡片" }],
        },
        {
          type: "paragraph",
          runs: [
            { text: "正文支持" },
            { text: "粗体", bold: true },
            { text: "、" },
            { text: "斜体", italic: true },
            { text: "、" },
            { text: "高亮", mark: true },
            { text: "与行内代码。", code: true },
          ],
        },
        {
          type: "list-item",
          marker: "1.",
          runs: [{ text: "列表、标点避头尾与中文两端对齐" }],
        },
        {
          type: "code",
          language: "javascript",
          runs: [{ text: "const verified = true;", syntax: "keyword" }],
        },
      ],
    },
    meta: {
      ...baseMeta,
      title: "富文本分享卡片测试",
    },
  });
}

function openLongSample() {
  const text = Array.from(
    { length: 36 },
    (_, index) =>
      `第 ${index + 1} 段用于验证长文自动缩小字号，并在画布空间不足时安全截断。`,
  ).join("\n");

  void shareDialogRef.value?.open({
    text,
    paragraphId: "reader-share-long-sample",
    meta: {
      ...baseMeta,
      title: "长文截断测试",
    },
  });
}
</script>
