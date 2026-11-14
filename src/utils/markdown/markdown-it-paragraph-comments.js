import ParagraphComments from "@/components/reader/display/ParagraphComments.vue";
import ParagraphQuote from "@/components/reader/display/ParagraphQuote.vue";
import { h, watch } from "vue";
import { useModal } from "@/composables/useModal";
import { useGlobalEventListener } from "@/composables/useGlobalEventListener";
import { useParagraphCommentsStorage } from "@/composables/storage/useParagraphCommentsStorage";
import { useLocale } from "@/i18n";
import { RESPONSIVE_COMMENT_DIALOG_SIZE_CLASS } from "@/constants/reader-layout";

export const useParagraphComments = ({ enabled, resolver } = {}) => {
  const modal = useModal();
  const { t: translate, locale } = useLocale();
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
    if (!paragraphElement) return escapeHtml(translate("reader.paragraphComments.current"));

    if (paragraphElement.dataset.readerFullParagraphText) {
      const paragraphText = normalizeParagraphText(
        paragraphElement.dataset.readerFullParagraphText,
      ).replace(/\[\^[^\]\r\n]+\]/g, "");
      const truncatedText =
        paragraphText.length > MAX_TITLE_LENGTH
          ? `${paragraphText.slice(0, MAX_TITLE_LENGTH)}...`
          : paragraphText;
      return escapeHtml(truncatedText || translate("reader.paragraphComments.current"));
    }

    const clonedElement = paragraphElement.cloneNode(true);
    removeIgnoredTitleNodes(clonedElement);
    removeLiteralFootnoteMarkers(clonedElement);

    if (clonedElement.matches(".markdown-link-card")) {
      const cardTitle = clonedElement.querySelector("[data-card-motion='title']");
      if (cardTitle) {
        truncateTitleContent(cardTitle);
        const titleText = normalizeParagraphText(cardTitle.textContent) || translate("reader.paragraphComments.current");
        const cardLink = cardTitle.closest("a[href]");
        if (!cardLink) return escapeHtml(titleText);

        const titleLink = document.createElement("a");
        for (const attribute of ["href", "target", "rel"]) {
          const value = cardLink.getAttribute(attribute);
          if (value) titleLink.setAttribute(attribute, value);
        }
        titleLink.textContent = titleText;
        return titleLink.outerHTML;
      }
    }

    const isFigure = clonedElement.matches("figure.markdown-figure");
    if (isFigure) {
      clonedElement.removeAttribute("id");
      clonedElement.removeAttribute("data-reader-paragraph-id");
      clonedElement.removeAttribute("data-source-type");
    }

    const contentNode = clonedElement.querySelector(
      "[data-paragraph-comment-content]",
    );
    const titleContent = contentNode || clonedElement;
    truncateTitleContent(titleContent);

    if (isFigure) return clonedElement.outerHTML;

    return normalizeParagraphText(titleContent.textContent || "")
      ? titleContent.innerHTML
      : escapeHtml(translate("reader.paragraphComments.current"));
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

  const getCommentCountLabel = (count) => (count > 99 ? "99+" : `${count}`);

  const createCommentTrigger = (paragraphId, sourceType, count) => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "comment-trigger";
    trigger.dataset.paragraphId = paragraphId;
    trigger.dataset.sourceType = sourceType;
    trigger.setAttribute("aria-label", translate("reader.paragraphComments.open"));

    const indicator = document.createElement("span");
    indicator.className = "paragraph-comment-count";
    indicator.dataset.paragraphId = paragraphId;
    indicator.dataset.sourceType = sourceType;
    indicator.setAttribute("aria-label", translate("reader.paragraphComments.count"));
    indicator.textContent = getCommentCountLabel(count);

    trigger.append(indicator);
    return trigger;
  };

  const getOwnedCommentTriggers = (commentable) =>
    Array.from(commentable.querySelectorAll("button.comment-trigger")).filter(
      (trigger) =>
        trigger.closest("[data-reader-paragraph-id]") === commentable,
    );

  const insertCommentTrigger = (commentable, trigger) => {
    if (!commentable.matches("li")) {
      const anchor = commentable.querySelector(":scope > a.header-anchor");
      commentable.insertBefore(trigger, anchor);
      return;
    }

    const paragraph = commentable.querySelector(":scope > p");
    if (paragraph) {
      paragraph.append(trigger);
      return;
    }

    const nestedList = Array.from(commentable.children).find((child) =>
      child.matches("ul, ol"),
    );
    commentable.insertBefore(trigger, nestedList || null);
  };

  const updateCountIndicators = (paragraphId, sourceType, count) => {
    const commentableNodes = document.querySelectorAll(
      "[data-reader-paragraph-id]:not([data-reader-comment-scope='chapter'])",
    );

    commentableNodes.forEach((node) => {
      if (
        node.dataset.readerParagraphId !== paragraphId ||
        (node.dataset.sourceType || "article") !== sourceType
      ) {
        return;
      }

      const triggers = getOwnedCommentTriggers(node);

      if (count > 0) {
        if (!triggers.length) {
          insertCommentTrigger(
            node,
            createCommentTrigger(paragraphId, sourceType, count),
          );
          return;
        }

        triggers.forEach((trigger) => {
          const indicator = trigger.querySelector(".paragraph-comment-count");
          if (indicator) indicator.textContent = getCommentCountLabel(count);
        });
      } else {
        triggers.forEach((trigger) => trigger.remove());
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
    const reader = paragraphElement?.closest(".markdown-reading");
    const titleNode = h("hgroup", { class: "space-y-1" }, [
      h("h3", { class: "text-base" }, translate("reader.paragraphComments.current")),
      h(ParagraphQuote, {
        html: titleHtml,
        lang: reader?.lang || locale.value,
        resolver,
      }),
    ]);

    modal.info(titleNode, h(ParagraphComments, { paragraphId, sourceType }), {
      buttonMode: "close",
      scrollContent: "nested",
      panelClass: RESPONSIVE_COMMENT_DIALOG_SIZE_CLASS,
    });
  };

  const handleCommentClick = (e) => {
    const trigger = e.target.closest(
      "button.comment-trigger[data-paragraph-id]",
    );
    if (!trigger || trigger.closest("[data-reader-comment-scope='chapter']")) {
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

  const listeners = [
    useGlobalEventListener("click", handleCommentClick, true),
    useGlobalEventListener("paragraph-comment-metadata", handleParagraphMetadata),
    useGlobalEventListener("paragraph-comment-open", handleCommentOpen),
  ];

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
        if (count <= 0) return "";

        return `<button type="button" class="comment-trigger" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="${escapeHtml(translate("reader.paragraphComments.open"))}"><span class="paragraph-comment-count" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="${escapeHtml(translate("reader.paragraphComments.count"))}">${getCommentCountLabel(count)}</span></button>`;
      };

      const assignCommentableAttributes = (
        token,
        paragraphId,
        { preserveId = false } = {},
      ) => {
        if (!preserveId) token.attrSet("id", paragraphId);
        token.attrSet("data-reader-paragraph-id", paragraphId);
        token.attrSet("data-source-type", sourceType);
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
        if (tokens[idx].meta?.figureContinuation) {
          return defaultParagraphOpen(tokens, idx, options, env, self);
        }
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
        if (tokens[idx].meta?.figureContinuation) {
          return defaultParagraphClose(tokens, idx, options, env, self);
        }
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

  watch(
    enabled,
    (active) => {
      for (const listener of listeners) {
        if (active) listener.addEventListener();
        else listener.removeEventListener();
      }
    },
    { immediate: true },
  );

  return paragraphPlugin;
};
