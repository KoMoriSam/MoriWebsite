import { onBeforeUnmount, onMounted } from "vue";
import {
  createReaderSelectionContext,
  createReaderTextContext,
  selectReaderTextAtPoint,
} from "@/utils/reader/create-reader-text-context";

const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, summary, [role='button'], [contenteditable='true'], [data-reader-interactive]";
const LONG_PRESS_BLOCKED_SELECTOR =
  "button, input, select, textarea, summary, [role='button'], [contenteditable='true'], [data-reader-interactive]";
const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const TOUCH_CONTEXT_WINDOW = 1200;

export const isReaderInteractiveEvent = (event) =>
  (event.composedPath?.() || [event.target]).some(
    (node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR),
  );

const isLongPressBlockedEvent = (event) =>
  (event.composedPath?.() || [event.target]).some(
    (node) =>
      node instanceof Element && node.matches(LONG_PRESS_BLOCKED_SELECTOR),
  );

export const useReaderTextContext = ({ getRoot, emit }) => {
  let selectionFrame = 0;
  let positionFrame = 0;
  let activeRoot = null;
  let selectionMenuActive = false;
  let longPressTimer = 0;
  let lastTouchAt = Number.NEGATIVE_INFINITY;
  const touchPointer = {
    id: null,
    x: 0,
    y: 0,
    target: null,
  };

  const resolveRoot = (fallback = null) => {
    const root = getRoot();
    if (root instanceof Element) return root;
    if (root?.$el instanceof Element) return root.$el;
    return fallback instanceof Element ? fallback : null;
  };

  const emitSelectionContext = (
    root = resolveRoot(activeRoot),
    { allowOpen = true, closeWhenEmpty = true } = {},
  ) => {
    const context = createReaderSelectionContext(root);
    if (context) {
      if (allowOpen || selectionMenuActive) {
        selectionMenuActive = true;
        emit("text-context", context);
      }
      return context;
    }

    if (closeWhenEmpty && selectionMenuActive) {
      selectionMenuActive = false;
      emit("text-context", null);
    }
    return context;
  };

  const emitPointContext = (
    { target, clientX, clientY },
    root = resolveRoot(),
  ) => {
    const context = createReaderTextContext({
      root,
      target,
      clientX,
      clientY,
    });
    if (!context) return false;
    emit("text-context", context);
    return true;
  };

  const selectTextAndOpen = ({ root, target, clientX, clientY }) => {
    const context = selectReaderTextAtPoint({
      root,
      target,
      clientX,
      clientY,
    });
    if (!context) return false;

    selectionMenuActive = true;
    emit("text-context", context);
    return true;
  };

  const handleContextMenu = (event) => {
    const isTouchContext =
      event.pointerType === "touch" ||
      touchPointer.id !== null ||
      performance.now() - lastTouchAt < TOUCH_CONTEXT_WINDOW;
    if (
      isReaderInteractiveEvent(event) &&
      (!isTouchContext || isLongPressBlockedEvent(event))
    ) {
      return;
    }
    const root = resolveRoot(event.currentTarget);
    if (!root || !root.contains(event.target)) return;

    activeRoot = root;
    event.preventDefault();
    window.requestAnimationFrame(() => {
      if (emitSelectionContext(root)) return;
      if (
        isTouchContext &&
        selectTextAndOpen({
          root,
          target: event.target,
          clientX: event.clientX,
          clientY: event.clientY,
        })
      ) {
        return;
      }
      emitPointContext(event, root);
    });
  };

  const syncSelectionContext = () => {
    if (selectionFrame) window.cancelAnimationFrame(selectionFrame);
    selectionFrame = window.requestAnimationFrame(() => {
      selectionFrame = 0;
      emitSelectionContext(resolveRoot(activeRoot));
    });
  };

  const handleSelectionEnd = (event) => {
    if (event.button !== 0) return;
    const root = resolveRoot(event.currentTarget);
    if (!root || !root.contains(event.target)) return;

    activeRoot = root;
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    positionFrame = window.requestAnimationFrame(() => {
      positionFrame = 0;
      emitSelectionContext(root, {
        allowOpen: false,
        closeWhenEmpty: false,
      });
    });
  };

  const resetTouchPointer = () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
    touchPointer.id = null;
    touchPointer.target = null;
  };

  const handlePointerDown = (event) => {
    const root = resolveRoot(event.currentTarget);
    if (!root || !root.contains(event.target)) return;
    activeRoot = root;

    if (
      event.pointerType !== "touch" ||
      event.button !== 0 ||
      isLongPressBlockedEvent(event)
    ) {
      return;
    }

    lastTouchAt = performance.now();
    resetTouchPointer();
    touchPointer.id = event.pointerId;
    touchPointer.x = event.clientX;
    touchPointer.y = event.clientY;
    touchPointer.target = event.target;
    longPressTimer = window.setTimeout(() => {
      longPressTimer = 0;
      selectTextAndOpen({
        root,
        target: touchPointer.target,
        clientX: touchPointer.x,
        clientY: touchPointer.y,
      });
    }, LONG_PRESS_DELAY);
  };

  const handlePointerMove = (event) => {
    if (touchPointer.id !== event.pointerId) return;
    if (
      Math.abs(event.clientX - touchPointer.x) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(event.clientY - touchPointer.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      resetTouchPointer();
    }
  };

  const handlePointerUp = (event) => {
    const wasTrackedTouch = touchPointer.id === event.pointerId;
    if (wasTrackedTouch) resetTouchPointer();
    handleSelectionEnd(event);
  };

  const handlePointerCancel = () => resetTouchPointer();

  onMounted(() =>
    document.addEventListener("selectionchange", syncSelectionContext),
  );
  onBeforeUnmount(() => {
    document.removeEventListener("selectionchange", syncSelectionContext);
    if (selectionFrame) window.cancelAnimationFrame(selectionFrame);
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    resetTouchPointer();
  });

  return {
    getSelectionContext: () =>
      createReaderSelectionContext(resolveRoot(activeRoot)),
    handleContextMenu,
    handlePointerCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSelectionEnd,
    isInteractiveEvent: isReaderInteractiveEvent,
  };
};
