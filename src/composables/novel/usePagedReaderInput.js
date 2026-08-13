import { onBeforeUnmount, onMounted } from "vue";

export const usePagedReaderInput = ({
  viewportRef,
  tapZones,
  wheelEnabled,
  turnPage,
  emitAction,
  isBlocked,
  isKeyboardInput,
  isInteractiveEvent,
  getSelectionContext,
  swipeDistance = 26,
}) => {
  const pointer = {
    id: null,
    x: 0,
    y: 0,
    startedAt: 0,
    active: false,
  };

  const resetPointer = () => {
    pointer.id = null;
    pointer.active = false;
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || isInteractiveEvent(event)) return;
    pointer.id = event.pointerId;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.startedAt = performance.now();
    pointer.active = true;
    if (event.pointerType !== "touch") {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    if (!pointer.active || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    if (getSelectionContext()) {
      resetPointer();
      return;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
      event.preventDefault();
    }
  };

  const handlePointerUp = (event) => {
    if (!pointer.active || pointer.id !== event.pointerId) return;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    const pressDuration = performance.now() - pointer.startedAt;
    const protectedInteraction = isInteractiveEvent(event);
    resetPointer();
    if (protectedInteraction) return;

    if (
      Math.abs(deltaX) >= swipeDistance &&
      Math.abs(deltaX) >= Math.abs(deltaY) * 1.2
    ) {
      turnPage(deltaX < 0 ? 1 : -1);
      return;
    }

    if (
      pressDuration >= 350 ||
      Math.abs(deltaX) >= 12 ||
      Math.abs(deltaY) >= 12
    ) {
      return;
    }
    const rect = viewportRef.value?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const x = Math.min(0.999, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(0.999, Math.max(0, (event.clientY - rect.top) / rect.height));
    const action = tapZones.value[Math.floor(y * 3) * 3 + Math.floor(x * 3)] || "none";
    if (action !== "none") emitAction(action);
  };

  const handleWheel = (event) => {
    if (!wheelEnabled.value || Math.abs(event.deltaY) < 8) return;
    event.preventDefault();
    turnPage(event.deltaY > 0 ? 1 : -1);
  };

  const handleKeydown = (event) => {
    if (isKeyboardInput(event.target) || isBlocked.value) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      turnPage(1);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      turnPage(-1);
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
    viewportRef.value?.addEventListener("wheel", handleWheel, {
      passive: false,
    });
  });
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    viewportRef.value?.removeEventListener("wheel", handleWheel);
  });

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetPointer,
  };
};
