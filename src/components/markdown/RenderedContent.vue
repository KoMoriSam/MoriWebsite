<script>
import { computed, Fragment, h, inject, provide } from "vue";

import {
  MARKDOWN_COMPONENT_RESOLVER,
  parseHtmlFragment,
  renderHtmlFragment,
} from "@/utils/markdown/render-html-vnodes";

export default {
  name: "RenderedContent",
  props: {
    html: {
      type: String,
      default: "",
    },
    resolver: {
      type: Function,
      default: null,
    },
    fontStyle: {
      type: String,
      default: "font-sans",
    },
  },
  setup(props) {
    const inheritedResolver = inject(MARKDOWN_COMPONENT_RESOLVER, null);
    const activeResolver = computed(
      () => props.resolver || inheritedResolver || null,
    );
    const resolveComponent = (context) => activeResolver.value?.(context);
    const fragment = computed(() => parseHtmlFragment(props.html));

    provide(MARKDOWN_COMPONENT_RESOLVER, resolveComponent);

    return () =>
      h(
        Fragment,
        null,
        renderHtmlFragment(fragment.value, activeResolver.value),
      );
  },
};
</script>
