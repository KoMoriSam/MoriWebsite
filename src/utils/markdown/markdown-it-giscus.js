import ParaGiscus from "@/components/reader/ParaGiscus.vue";
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
        ].join(","),
      )
      .forEach((element) => element.remove());
  };

  const getParagraphTitleText = (paragraphElement) => {
    if (!paragraphElement) return "当前段评";

    if (paragraphElement.dataset.readerFullParagraphText) {
      return (
        normalizeParagraphText(
          paragraphElement.dataset.readerFullParagraphText,
        ) || "当前段评"
      );
    }

    const clonedElement = paragraphElement.cloneNode(true);
    removeIgnoredTitleNodes(clonedElement);

    const contentNode = clonedElement.querySelector(
      "[data-paragraph-comment-content]",
    );
    const paragraphText = normalizeParagraphText(
      contentNode?.textContent || clonedElement.textContent || "",
    );

    return paragraphText || "当前段评";
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
        node.closest(".comment-trigger")?.classList.add("has-count");
      } else {
        node.classList.add("hidden");
        node.textContent = "";
        node.closest(".comment-trigger")?.classList.remove("has-count");
      }
    });
  };

  const openParagraphComment = (paragraphId, sourceType = "article") => {
    if (!paragraphId) {
      console.error("段落 ID 未找到");
      return;
    }

    const paragraphElement = document.getElementById(paragraphId);
    const paragraphText = getParagraphTitleText(paragraphElement);
    const truncatedTitle =
      paragraphText.length > MAX_TITLE_LENGTH
        ? `${paragraphText.slice(0, MAX_TITLE_LENGTH)}...`
        : paragraphText;
    const titleNode = h("div", { class: "space-y-1" }, [
      h("h3", { class: "text-base" }, "当前段评"),
      h(
        "blockquote",
        {
          class:
            "text-sm font-medium leading-snug text-justify text-pretty border-s-3 border-s-base-content/25 ps-1.5",
        },
        truncatedTitle,
      ),
    ]);

    modal.info(titleNode, h(ParaGiscus, { paragraphId, sourceType }), {
      buttonMode: "close",
    });
  };

  const handleCommentClick = (e) => {
    const trigger = e.target.closest("[data-paragraph-id]");
    if (!trigger) return;

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
  const { addEventListener: addParagraphOpenListener } =
    useGlobalEventListener("paragraph-comment-open", handleCommentOpen, false);

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

      const getParagraphState = (env) => {
        if (!env.__paragraphComments) {
          env.__paragraphComments = {
            counter: 0,
            stack: [],
          };
        }

        return env.__paragraphComments;
      };

      md.renderer.rules.paragraph_open = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        const state = getParagraphState(env);
        const paragraphId = `${uuid}-${state.counter}`;

        state.counter += 1;
        state.stack.push(paragraphId);

        tokens[idx].attrSet("id", paragraphId);
        tokens[idx].attrSet("data-reader-paragraph-id", paragraphId);
        tokens[idx].attrSet("data-source-type", sourceType);
        tokens[idx].attrJoin("class", "group");
        tokens[idx].attrSet("tabindex", "0");
        tokens[idx].meta = {
          ...(tokens[idx].meta || {}),
          paragraphId,
        };

        return defaultParagraphOpen(tokens, idx, options, env, self);
      };

      md.renderer.rules.paragraph_close = function (
        tokens,
        idx,
        options,
        env,
        self,
      ) {
        if (tokens[idx].hidden) {
          return "";
        }

        const state = getParagraphState(env);
        const paragraphId = state.stack.pop();

        if (!paragraphId) {
          return defaultParagraphClose(tokens, idx, options, env, self);
        }

        const count = getCount(paragraphId, sourceType);
        const countClass =
          count > 0
            ? "paragraph-comment-count"
            : "paragraph-comment-count hidden";
        const triggerClass =
          count > 0 ? "comment-trigger has-count" : "comment-trigger";

        return `<button class="${triggerClass} group" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="打开段评"><i class="ri-more-fill text-lg"></i><span class="${countClass}" data-paragraph-id="${paragraphId}" data-source-type="${sourceType}" aria-label="当前段评评论数">${count > 0 && count < 100 ? `${count}` : ""}${count > 99 ? `99+` : ""}</span></button></p>`;
      };
    };
  };

  addEventListener();
  addParagraphMetadataListener();
  addParagraphOpenListener();

  return paragraphPlugin;
};
