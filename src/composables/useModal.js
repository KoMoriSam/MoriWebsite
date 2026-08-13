import { createApp, ref, h, onBeforeUnmount } from "vue";
import Modal from "@/components/ui/Modal.vue";
import {
  captureTrackedPosition,
  restoreTrackedPosition,
} from "@/composables/usePosTracker";

const MODAL_FALLBACK_STATE_KEY = "__moriModalFallback";
const retiredFallbackListeners = new Map();
let modalFallbackSequence = 0;
let activeModalFallbacks = 0;
let modalFallbackRestoreFrame = 0;

const beginModalFallback = () => {
  activeModalFallbacks += 1;
  globalThis.__moriModalFallbackActive = true;
};

const endModalFallback = () => {
  activeModalFallbacks = Math.max(0, activeModalFallbacks - 1);
  globalThis.__moriModalFallbackActive = activeModalFallbacks > 0;
};

const finishModalFallbackRestore = (
  restore,
  scrollRestoration,
  snapshot = null,
) => {
  window.cancelAnimationFrame(modalFallbackRestoreFrame);
  globalThis.__moriModalFallbackRestoring = true;
  const restoreViewport = () => {
    const scrollX = Number(snapshot?.scrollX);
    const scrollY = Number(snapshot?.scrollY);
    if (Number.isFinite(scrollX) && Number.isFinite(scrollY)) {
      document.scrollingElement?.scrollTo(scrollX, scrollY);
    } else {
      restore();
    }
  };
  const finish = () => {
    window.history.scrollRestoration = scrollRestoration;
    globalThis.__moriModalFallbackRestoring = false;
  };

  restoreViewport();
  restore();
  modalFallbackRestoreFrame = window.requestAnimationFrame(() => {
    restoreViewport();
    modalFallbackRestoreFrame = window.requestAnimationFrame(finish);
  });
};

const getFallbackState = (state = window.history.state) =>
  state?.[MODAL_FALLBACK_STATE_KEY] ?? null;

const setModalPopstateHandler = (handler) => {
  globalThis.__moriModalFallbackPopstateHandler = handler;
};

const clearModalPopstateHandler = (handler) => {
  if (globalThis.__moriModalFallbackPopstateHandler === handler) {
    globalThis.__moriModalFallbackPopstateHandler = null;
  }
};

const withoutFallbackState = (state = window.history.state) => {
  if (!state || typeof state !== "object") return {};
  const { [MODAL_FALLBACK_STATE_KEY]: _fallback, ...rest } = state;
  return rest;
};

const removeRetiredFallbackListener = (token, { restore = false } = {}) => {
  const fallback = retiredFallbackListeners.get(token);
  if (!fallback) return;
  clearModalPopstateHandler(fallback.listener);
  retiredFallbackListeners.delete(token);
  if (restore) window.history.scrollRestoration = fallback.scrollRestoration;
};

const retireHistoryFallback = (token, scrollRestoration) => {
  const fallback = getFallbackState();
  if (fallback?.token !== token || fallback.status !== "active") return;

  window.history.replaceState(
    {
      ...withoutFallbackState(),
      [MODAL_FALLBACK_STATE_KEY]: { token, status: "retired" },
    },
    "",
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  const skipRetiredEntry = () => {
    removeRetiredFallbackListener(token);
    window.history.back();
    window.setTimeout(() => {
      window.history.scrollRestoration = scrollRestoration;
    }, 0);
  };
  retiredFallbackListeners.set(token, {
    listener: skipRetiredEntry,
    scrollRestoration,
  });
  setModalPopstateHandler(skipRetiredEntry);
};

const createHistoryFallback = (onBack) => {
  const currentFallback = getFallbackState();
  if (currentFallback?.status === "retired") {
    removeRetiredFallbackListener(currentFallback.token, { restore: true });
  }

  const scrollRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";

  const token = `modal-${Date.now()}-${modalFallbackSequence++}`;
  const fallbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const fallbackAnchorToken = window.location.hash;
  const fallbackPosition = captureTrackedPosition() || {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
  const nextState = {
    ...withoutFallbackState(),
    [MODAL_FALLBACK_STATE_KEY]: { token, status: "active" },
  };

  if (currentFallback?.status === "retired") {
    window.history.replaceState(nextState, "", fallbackUrl);
  } else {
    window.history.pushState(nextState, "", fallbackUrl);
  }

  const handlePopState = () => {
    clearModalPopstateHandler(handlePopState);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== fallbackUrl) {
      window.history.replaceState(
        window.history.state,
        "",
        fallbackUrl,
      );
    }
    onBack();
    const restorePosition = (suppressNavigationRestore = false) =>
      restoreTrackedPosition({
        anchorToken: fallbackAnchorToken,
        snapshot: fallbackPosition,
        suppressNavigationRestore,
      });

    if (!restorePosition(true)) {
      finishModalFallbackRestore(
        () => {},
        scrollRestoration,
        fallbackPosition,
      );
      return;
    }

    finishModalFallbackRestore(
      () => restorePosition(false),
      scrollRestoration,
      fallbackPosition,
    );
  };
  setModalPopstateHandler(handlePopState);

  return {
    snapshot: fallbackPosition,
    scrollRestoration,
    retire: () => {
      clearModalPopstateHandler(handlePopState);
      if (getFallbackState()?.token === token) {
        retireHistoryFallback(token, scrollRestoration);
      } else {
        window.history.scrollRestoration = scrollRestoration;
      }
    },
    release: () => {
      clearModalPopstateHandler(handlePopState);
      window.history.scrollRestoration = scrollRestoration;
    },
  };
};

export function useModalClose({ onClose = () => {} } = {}) {
  let active = false;
  let historyFallback = null;
  let platformCloseTimer = 0;

  const clearPlatformClose = ({ retireFallback = false } = {}) => {
    if (retireFallback) historyFallback?.retire();
    else historyFallback?.release();
    historyFallback = null;
  };

  const closeImmediately = ({
    retireFallback = false,
    close = true,
  } = {}) => {
    if (!active) return;
    active = false;
    endModalFallback();
    window.clearTimeout(platformCloseTimer);
    clearPlatformClose({ retireFallback });
    if (close) onClose();
  };

  const closeFromFallback = () => {
    const wasActive = active;
    active = false;
    window.clearTimeout(platformCloseTimer);
    historyFallback = null;
    if (wasActive) {
      endModalFallback();
      onClose();
    }
  };

  const activate = () => {
    if (active || typeof window === "undefined") return;
    active = true;
    beginModalFallback();

    // 无法可靠探测宿主是否把系统返回接入原生 dialog；始终建立同 URL 的回退拦截项。
    historyFallback = createHistoryFallback(closeFromFallback);
  };

  // 主动关闭不执行 history.back，只把本次拦截项标记为待跳过。
  const requestClose = () => closeImmediately({ retireFallback: true });

  const requestPlatformClose = () => {
    if (!active) return;

    const fallback = historyFallback;
    const restorePosition = () =>
      restoreTrackedPosition({
        snapshot: fallback?.snapshot,
        suppressNavigationRestore: true,
      });
    active = false;
    endModalFallback();
    onClose();
    finishModalFallbackRestore(
      restorePosition,
      fallback?.scrollRestoration || "auto",
      fallback?.snapshot,
    );

    window.clearTimeout(platformCloseTimer);
    platformCloseTimer = window.setTimeout(() => {
      if (historyFallback !== fallback) return;
      fallback?.retire();
      historyFallback = null;
    }, 250);
  };

  const discard = ({ close = true } = {}) =>
    closeImmediately({ retireFallback: true, close });

  const isActive = () => active;

  onBeforeUnmount(() => discard({ close: false }));

  return {
    activate,
    requestClose,
    requestPlatformClose,
    discard,
    isActive,
  };
}

const modal = {
  show(options = {}) {
    const {
      title = "Hello!",
      description = "这是一个提示弹窗。",
      buttonText = "关闭",
      cancelText = "取消",
      buttonMode = "footer",
      variant = "default",
      leadingAction = null,
      onSubmit = () => {},
      onCancel = () => {},
    } = options;

    const container = document.createElement("div");
    document.body.appendChild(container);
    let requestClose = () => {};

    const modalApp = createApp({
      setup() {
        const visible = ref(true);
        const modalRef = ref(null);

        const cleanup = () => {
          if (!visible.value) return;
          visible.value = false;
          setTimeout(() => {
            modalApp.unmount();
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          }, 500);
        };
        requestClose = () => modalRef.value?.close();

        return () =>
          h(
            Modal,
            {
              ref: modalRef,
              title,
              description,
              buttonText,
              cancelText,
              buttonMode,
              variant,
              onSubmit,
              onCancel,
              onClose: cleanup,
              visible: visible.value,
            },
            {
              title: () =>
                typeof title === "string"
                  ? h("h3", { class: "text-lg font-serif font-bold" }, title)
                  : h(
                      "hgroup",
                      { class: "text-lg font-serif font-bold" },
                      title,
                    ),
              description: () =>
                typeof description === "string"
                  ? h("p", description)
                  : h("article", description),
              "leading-action": () => leadingAction,
            },
          );
      },
    });

    modalApp.mount(container);

    return {
      close: () => requestClose(),
    };
  },

  info(title, description, options = {}) {
    return this.show({ title, description, ...options });
  },

  confirm(title, description, options = {}) {
    return this.show({
      title,
      description,
      ...options,
      variant: "confirm",
      buttonText: options.buttonText || "确认",
      cancelText: options.cancelText || "取消",
    });
  },
};

export function useModal() {
  return modal;
}
