<script>
import { Fragment, h } from "vue";

const renderDomNode = (node, key) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const attributes = {};
  for (const { name, value } of node.attributes) {
    // Markdown 渲染结果不需要内联事件；事件由页面现有的委托逻辑处理。
    if (!name.toLowerCase().startsWith("on")) attributes[name] = value;
  }

  return h(
    node.localName,
    { ...attributes, key },
    Array.from(node.childNodes).map((child, index) =>
      renderDomNode(child, `${key}-${index}`),
    ),
  );
};

export default {
  name: "RenderedContent",
  props: {
    html: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    return () => {
      if (!props.html || typeof DOMParser === "undefined") return null;

      const document = new DOMParser().parseFromString(props.html, "text/html");
      const children = Array.from(document.body.childNodes).map((node, index) =>
        renderDomNode(node, `markdown-node-${index}`),
      );

      return h(Fragment, null, children);
    };
  },
};
</script>
