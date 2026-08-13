import { onBeforeUnmount, onMounted } from "vue";

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export const isReaderKeyboardInput = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.matches("textarea, [contenteditable=''], [contenteditable='true']")) {
    return true;
  }
  return element instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(element.type);
};

export const usePaginationKeyboardFreeze = ({
  settleDelay = 120,
  minimumHeightDelta = 80,
  onFreeze,
  onRelease,
  onViewportChange,
}) => {
  let releaseTimer = 0;
  let baselineHeight = 0;
  let frozen = false;

  const getViewportHeight = () =>
    window.visualViewport?.height || window.innerHeight;
  const getThreshold = () =>
    Math.max(minimumHeightDelta, Math.round(baselineHeight * 0.15));

  const freeze = () => {
    window.clearTimeout(releaseTimer);
    if (!frozen) baselineHeight = getViewportHeight();
    frozen = true;
    onFreeze();
  };

  const release = () => {
    frozen = false;
    baselineHeight = getViewportHeight();
    window.clearTimeout(releaseTimer);
    onRelease();
  };

  const scheduleRelease = () => {
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      if (baselineHeight - getViewportHeight() <= getThreshold() / 2) release();
    }, settleDelay);
  };

  const handleFocusIn = (event) => {
    if (isReaderKeyboardInput(event.target)) freeze();
  };
  const handleFocusOut = (event) => {
    if (!isReaderKeyboardInput(event.target)) return;
    window.setTimeout(() => {
      if (!isReaderKeyboardInput(document.activeElement)) scheduleRelease();
    });
  };
  const handleViewportChange = () => {
    if (!frozen) {
      baselineHeight = getViewportHeight();
      onViewportChange();
    } else if (!isReaderKeyboardInput(document.activeElement)) {
      scheduleRelease();
    }
  };

  onMounted(() => {
    baselineHeight = getViewportHeight();
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
  });
  onBeforeUnmount(() => {
    window.clearTimeout(releaseTimer);
    document.removeEventListener("focusin", handleFocusIn, true);
    document.removeEventListener("focusout", handleFocusOut, true);
    window.visualViewport?.removeEventListener("resize", handleViewportChange);
    window.visualViewport?.removeEventListener("scroll", handleViewportChange);
  });

  return {
    isFrozen: () => frozen,
    isKeyboardInput: isReaderKeyboardInput,
  };
};
