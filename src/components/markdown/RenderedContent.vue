<script>
import { computed, Fragment, h, inject, onMounted, provide, useId, watch } from "vue";
import { routerKey } from "vue-router";
import { ensureMarkdownStyles } from "@/utils/markdown/load-markdown-styles";

import {
  MARKDOWN_COMPONENT_RESOLVER,
  parseHtmlFragment,
  renderHtmlFragment,
} from "@/utils/markdown/render-html-vnodes";

const SCOPED_MARKDOWN_ANCHORS = Symbol("scoped-markdown-anchors");

export default {
  name: "RenderedContent",
  inheritAttrs: false,
  props: {
    html: {
      type: String,
      default: "",
    },
    resolver: {
      type: Function,
      default: null,
    },
    scopeAnchors: Boolean,
  },
  setup(props) {
    const router = inject(routerKey, null);
    const inheritedResolver = inject(MARKDOWN_COMPONENT_RESOLVER, null);
    const activeResolver = computed(
      () => props.resolver || inheritedResolver || null,
    );
    const resolveComponent = (context) => activeResolver.value?.(context);
    const inheritedScope = inject(SCOPED_MARKDOWN_ANCHORS, null);
    const scopeAnchors = computed(() => props.scopeAnchors || inheritedScope?.value);
    const anchorPrefix = `markdown-${useId()}-`;
    provide(SCOPED_MARKDOWN_ANCHORS, scopeAnchors);
    const fragment = computed(() =>
      parseHtmlFragment(props.html, scopeAnchors.value ? anchorPrefix : ""),
    );
    const loadStyles = () => { void ensureMarkdownStyles(fragment.value); };

    onMounted(loadStyles);
    watch(fragment, loadStyles, { flush: "post" });

    provide(MARKDOWN_COMPONENT_RESOLVER, resolveComponent);

    return () =>
      h(
        Fragment,
        null,
        renderHtmlFragment(fragment.value, activeResolver.value, router),
      );
  },
};
</script>
