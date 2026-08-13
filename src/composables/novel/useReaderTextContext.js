import { onBeforeUnmount, onMounted } from "vue";
import {
  createReaderSelectionContext,
  createReaderTextContext,
} from "@/utils/reader/create-reader-text-context";

const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, summary, [role='button'], [contenteditable='true'], [data-reader-interactive]";

export const isReaderInteractiveEvent = (event) =>
  (event.composedPath?.() || [event.target]).some(
    (node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR),
  );

export const useReaderTextContext = ({ getRoot, emit }) => {
  let selectionFrame = 0;

  const emitSelectionContext = () => {
    const context = createReaderSelectionContext(getRoot());
    emit("text-context", context);
    return context;
  };

  const emitPointContext = ({ target, clientX, clientY }) => {
    const context = createReaderTextContext({
      root: getRoot(),
      target,
      clientX,
      clientY,
    });
    if (!context) return false;
    emit("text-context", context);
    return true;
  };

  const handleContextMenu = (event) => {
    if (isReaderInteractiveEvent(event)) return;
    window.requestAnimationFrame(() => {
      if (!emitSelectionContext()) emitPointContext(event);
    });
  };

  const syncSelectionContext = () => {
    if (selectionFrame) window.cancelAnimationFrame(selectionFrame);
    selectionFrame = window.requestAnimationFrame(() => {
      selectionFrame = 0;
      emitSelectionContext();
    });
  };

  onMounted(() =>
    document.addEventListener("selectionchange", syncSelectionContext),
  );
  onBeforeUnmount(() => {
    document.removeEventListener("selectionchange", syncSelectionContext);
    if (selectionFrame) window.cancelAnimationFrame(selectionFrame);
  });

  return {
    getSelectionContext: () => createReaderSelectionContext(getRoot()),
    handleContextMenu,
    isInteractiveEvent: isReaderInteractiveEvent,
  };
};
