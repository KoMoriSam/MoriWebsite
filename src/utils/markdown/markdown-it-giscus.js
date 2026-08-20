import ParaGiscus from "@/components/reader/ParaGiscus.vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";
import { h } from "vue";
import { useModal } from "@/composables/useModal";
import { useGlobalEventListener } from "@/composables/useGlobalEventListener";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

export const useParagraphComments = () => {
  const modal = useModal();
  const MAX_TITLE_LENGTH = 36;
  const { getCount, setCount } = useParagraphCommentsStorage();

  const normalizeParagraphText = (value = "") => {
    return String(value)
      .replace(/ /g, " ")
      .replace(/[↩︎️]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const escapeHtml = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const removeIgnoredTitleNodes = (root) => {
    root
      .querySelectorAll(
        [
          ".comment-trigger",
          ".paragraph-comment-count",
          ".footnote-ref",
          ".footnote-backref",
          ".comments-info",
          "[data-paragraph-comment-meta]",
          "[data-footnote-ref]",
          "[data-footnote-backref]",
          "[role='doc-noteref']",
          "[role='doc-backlink']",
          "[id^='fnref']",
          "a[href^='#fn']",
          "a[href^='#fnref']",
          "a.header-anchor",
        ].join(","),
      )
      .forEach((element) => element.remove());
  };

  const removeLiteralFootnoteMarkers = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      textNode.textContent = textNode.textContent.replace(
        /\[\^[^\]\r\n]+\]/g,
        "",
      );
    });
  };

  const truncateTitleContent = (root) => {
    const fullText = normalizeParagraphText(root.textContent || "");
    if (fullText.length <= MAX_TITLE_LENGTH) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();
    let remaining = MAX_TITLE_LENGTH;
    let ellipsisAdded = false;

    while (node) {
      textNodes.push(node);
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      if (remaining <= 0) {
        textNode.textContent = "";
        return;
      }

      const characters = Array.from(textNode.textContent || "");
      if (characters.length <= remaining) {
        remaining -= characters.length;
        return;
      }

      textNode.textContent = `${characters.slice(0, remaining).join("")}...`;
      remaining = 0;
      ellipsisAdded = true;
    });

    if (!ellipsisAdded && textNodes.length) {
      textNodes.at(-1).textContent += "...";
    }
  };

  const getParagraphTitleHtml = (paragraphElement) => {
    if (!paragraphElement) return "当前段评";

    if (paragraphElement.dataset.readerFullParagraphText) {
      const paragraphText = normalizeParagraphText(
        paragraphElement.dataset.readerFullParagraphText,
      ).replace(/\[\^[^\]\r\n]+\]/g, "");
      const truncatedText =
        paragraphText.length > MAX_TITLE_LENGTH
          ? `${paragraphText.slice(0, MAX_TITLE_LENGTH)}...`
          : paragraphText;
      return escapeHtml(truncatedText || "当前段评");
    }

    const clonedElement = paragraphElement.cloneNode(true);
    removeIgnoredTitleNodes(clonedElement);
    removeLiteralFootnoteMarkers(clonedElement);

    const contentNode = clonedElement.querySelector(
      "[data-paragraph-comment-content]",
    );
    const titleContent = contentNode || clonedElement;
    truncateTitleContent(titleContent);

    return normalizeParagraphText(titleContent.textContent || "")
      ? titleContent.innerHTML
      : "当前段评";
  };

  const findParagraphElement = (paragraphId) => {
    const commentableNodes = document.querySelectorAll(
      "[data-reader-paragraph-id]",
    );
    return (
      Array.from(commentableNodes).find(
        (node) => node.dataset.readerParagraphId === paragraphId,
      ) || document.getElementById(paragraphId)
    );
  };

  const updateCountIndicators = (paragraphId, sourceType, count) => {
    const indicators = document.querySelectorAll(
      ".comment-trigger .paragraph-comment-count",
    );

    indicators.forEach((node) => {
      if (
        node.dataset.paragraphId !== paragraphId ||
        node.dataset.sourceType !== sourceType
      ) {
        return;
      }

      if (count > 0) {
        node.classList.remove("hidden");
        node.textContent = count > 99 ? "99+" : `${count}`;
        const trigger = node.closest(".comment-trigger");
        trigger?.classList.remove("hidden");
        trigger?.classList.add("has-count");
      } else {
        node.classList.add("hidden");
        node.textContent = "";
        const trigger = node.closest(".comment-trigger");
        trigger?.classList.add("hidden");
        trigger?.classList.remove("has-count");
      }
    });
  };

  const openParagraphComment = (paragraphId, sourceType = "article") => {
    if (!paragraphId) {
      console.error("段落 ID 未找到");
      return;
    }

    const paragraphElement = findParagraphElement(paragraphId);
    const titleHtml = getParagraphTitleHtml(paragraphElement);
    const titleNode = h("hgroup", { class: "space-y-1" }, [
      h("h3", { class: "text-base" }, "当前段评"),
      h(
        "blockquote",
        {
          class:
            "prose prose-sm max-w-none text-base-content text-sm font-sans font-normal leading-snug text-justify text-pretty border-s-3 border-s-base-content/25 ps-1.5",
        },
        [h(RenderedContent, { html: titleHtml })],
      ),
    ]);

    modal.info(titleNode, h(ParaGiscus, { paragraphId, sourceType }), {
      buttonMode: "close",
      scrollContent: true,
    });
  };

  const handleCommentClick = (e) => {
    const trigger = e.target.closest(
      "button.comment-trigger.has-count[data-paragraph-id]",
    );
    if (
      !trigger ||
      trigger.closest("[data-reader-comment-scope='chapter']")
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    openParagraphComment(
      trigger.dataset.paragraphId,
      trigger.dataset.sourceType || "article",
    );
  };

  const handleCommentOpen = (event) => {
    openParagraphComment(
      event.detail?.paragraphId,
      event.detail?.sourceType || "article",
    );
  };

  const handleParagraphMetadata = (event) => {
    const paragraphId = event?.detail?.paragraphId;
    const sourceType = event?.detail?.sourceType || "article";
    const count = Number(event?.detail?.totalCommentCount ?? 0);

    if (!paragraphId || !Number.isFinite(count)) {
      return;
    }

    setCount(paragraphId, count, sourceType);
    updateCountIndicators(paragraphId, sourceType, count);
  };

  const { addEventListener } = useGlobalEventListener(
    "click",
    handleCommentClick,
    true,
  );

  const { addEventListener: addParagraphMetadataListener } =
    useGlobalEventListener(
      "paragraph-comment-metadata",
      handleParagraphMetadata,
      false,
    );
  const { addEventListener: addParagraphOpenListener } = useGlobalEventListener(
    "paragraph-comment-open",
    handleCommentOpen,
    false,
  );

  const paragraphPlugin = (uuid, sourceType = "article") => {
    return (md) => {
      if (!md.renderer.rules) {
        md.renderer.rules = {};
      }

      const defaultParagraphOpen =
        md.renderer.rules.paragraph_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const defaultParagraphClose =
        md.renderer.rules.paragraph_close ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const defaultListItemOpen =
        md.renderer.rules.list_item_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const defaultListItemClose =
        md.renderer.rules.list_item_close ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const defaultHeadingOpen =
        md.renderer.rules.heading_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const defaultHeadingClose =
        md.renderer.rules.heading_close ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };

      const getParagraphState = (env) => {
        if (!env.__paragraphComments) {
          env.__paragraphComments = {
            counter: 1,
            paragraphStack: [],
            listItemStack: [],
            headingStack: [],
          };
        }

        return env.__paragraphComments;
      };

      const renderCommentTrigger = (paragraphId) => {
        const count = getCount(paragraphId, sourceType);
        const countClass =
          count > 0
            ? "paragraph-comment-count"
            : "paragraph-comment-count hidden";
        const triggerClass =
          count > 0 ? "comment-trigger has-count" : "comment-trigger hidden";

        return `<button type="button" class="${triggerClass} group" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="打开段评"><i class="ri-more-fill text-lg" aria-hidden="true"></i><span class="${countClass}" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="当前段评评论数">${count > 0 && count < 100 ? `${count}` : ""}${count > 99 ? "99+" : ""}</span></button>`;
      };

      const assignCommentableAttributes = (
        token,
        paragraphId,
        { preserveId = false } = {},
      ) => {
        if (!preserveId) token.attrSet("id", paragraphId);
        token.attrSet("data-reader-paragraph-id", paragraphId);
        token.attrSet("data-source-type", sourceType);
        token.attrJoin("class", "group");
        token.attrSet("tabindex", "0");
        token.meta = {
          ...(token.meta || {}),
          paragraphId,
        };
      };

      md.renderer.rules.paragraph_open = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);

        if (state.listItemStack.length) {
          state.paragraphStack.push(null);
          return defaultParagraphOpen(tokens, idx, options, env, self);
        }

        const paragraphId = `${uuid}-${state.counter}`;

        state.counter += 1;
        state.paragraphStack.push(paragraphId);
        assignCommentableAttributes(tokens[idx], paragraphId);

        return defaultParagraphOpen(tokens, idx, options, env, self);
      };

      md.renderer.rules.paragraph_close = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const paragraphId = state.paragraphStack.pop();

        if (paragraphId) {
          return `${renderCommentTrigger(paragraphId)}${defaultParagraphClose(tokens, idx, options, env, self)}`;
        }

        const listItem = state.listItemStack.at(-1);
        if (listItem && !listItem.triggerRendered) {
          listItem.triggerRendered = true;
          return `${renderCommentTrigger(listItem.paragraphId)}${defaultParagraphClose(tokens, idx, options, env, self)}`;
        }

        return defaultParagraphClose(tokens, idx, options, env, self);
      };

      md.renderer.rules.list_item_open = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const paragraphId = `${uuid}-${state.counter}`;

        state.counter += 1;
        state.listItemStack.push({ paragraphId, triggerRendered: false });
        assignCommentableAttributes(tokens[idx], paragraphId);

        return defaultListItemOpen(tokens, idx, options, env, self);
      };

      md.renderer.rules.list_item_close = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const listItem = state.listItemStack.pop();
        const fallbackTrigger =
          listItem && !listItem.triggerRendered
            ? renderCommentTrigger(listItem.paragraphId)
            : "";

        return `${fallbackTrigger}${defaultListItemClose(tokens, idx, options, env, self)}`;
      };

      md.renderer.rules.heading_open = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const paragraphId = `${uuid}-${state.counter}`;

        state.counter += 1;
        state.headingStack.push(paragraphId);
        assignCommentableAttributes(tokens[idx], paragraphId, {
          preserveId: true,
        });

        return defaultHeadingOpen(tokens, idx, options, env, self);
      };

      md.renderer.rules.heading_close = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const paragraphId = state.headingStack.pop();
        const trigger = paragraphId ? renderCommentTrigger(paragraphId) : "";

        return `${trigger}${defaultHeadingClose(tokens, idx, options, env, self)}`;
      };
    };
  };

  addEventListener();
  addParagraphMetadataListener();
  addParagraphOpenListener();

  return paragraphPlugin;
};
