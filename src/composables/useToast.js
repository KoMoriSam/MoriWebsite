// src/composables/useToast.js
import { createApp, ref, h } from "vue";
import Toast from "@/components/feedback/Toast.vue";
import { useLocale } from "@/i18n";
import {
  TOAST_POSITIONS,
  DEFAULT_POSITION,
  TOAST_ICONS,
} from "@/constants/toast";

// 容器和状态管理
const containerMap = new Map();
const toastGroups = new Map();
const dismissTimers = new Map();
const removalTimers = new Map();

const clearToastTimers = (id) => {
  clearTimeout(dismissTimers.get(id));
  clearTimeout(removalTimers.get(id));
  dismissTimers.delete(id);
  removalTimers.delete(id);
};

// 初始化所有预设位置的响应式数组
const initToastGroups = () => {
  Object.keys(TOAST_POSITIONS).forEach((pos) => {
    if (!toastGroups.has(pos)) {
      toastGroups.set(pos, ref([]));
    }
  });
};

initToastGroups(); // 立即初始化

export function useToast(defaultOptions = {}) {
  const localeService = useLocale();
  // 初始化指定位置的容器
  const initContainer = (position) => {
    if (!containerMap.has(position)) {
      const container = document.createElement("div");
      // 添加基础类名和位置类名
      document.body.appendChild(container);
      container.className = `toast items-end [&.toast-start]:items-start [&.toast-center]:items-center z-20 mx-0 my-18 ${
        TOAST_POSITIONS[position] || position
      }`;

      const app = createApp({
        setup() {
          const onRemove = (id, pos) => {
            removeToast(id, pos);
          };

          return () =>
            h(Toast, {
              toasts: toastGroups.get(position).value,
              position,
              onRemove,
            });
        },
      });

      localeService.provide(app);
      app.mount(container);
      containerMap.set(position, { app, container });
    }
  };

  // 添加 Toast
  const addToast = (message, options = {}) => {
    // 合并选项优先级：调用时传入的 options > useToast(defaultOptions) > 内部默认值
    const mergedOptions = {
      type: "info", // 最低优先级默认值
      duration: 1500, // 最低优先级默认值
      closable: true, // 最低优先级默认值
      position: DEFAULT_POSITION, // 最低优先级默认值
      soft: false, // 最低优先级默认值
      ...defaultOptions, // 中等优先级（useToast 传入的默认值）
      ...options, // 最高优先级（调用时传入的 options）
    };

    const { type, duration, icon, closable, position, soft } = mergedOptions;

    // 标准化位置
    const normalizedPos = TOAST_POSITIONS[position] || position;

    // 确保该位置的toast列表存在
    if (!toastGroups.has(normalizedPos)) {
      toastGroups.set(normalizedPos, ref([]));
    }

    // 初始化容器
    initContainer(normalizedPos);

    const id = Date.now() + Math.random().toString(36).slice(2, 9);
    const toastList = toastGroups.get(normalizedPos);

    toastList.value.push({
      id,
      message: localeService.text(message),
      type,
      icon: icon || TOAST_ICONS[type],
      closable,
      soft,
      duration,
      fading: false, // 初始状态为不淡出
    });

    // 自动关闭
    if (duration > 0) {
      dismissTimers.set(id, setTimeout(() => removeToast(id, normalizedPos), duration));
    }

    const handle = {
      id,
      position: normalizedPos,
      update: (message, options) => updateToast(id, normalizedPos, message, options),
    };
    for (const type of ["card", "info", "success", "error", "warning", "loading"]) {
      handle[type] = (message, options) => handle.update(message, { ...options, type });
    }
    return handle;
  };

  // 保留同一条通知，在加载结束时恢复普通通知的关闭方式和停留时间。
  const updateToast = (id, position, message, options = {}) => {
    const toast = toastGroups.get(position)?.value.find((item) => item.id === id);
    if (!toast) return false;

    const type = options.type ?? toast.type;
    const changedType = type !== toast.type;
    const defaults = type === "loading"
      ? { duration: 0, closable: false }
      : { duration: defaultOptions.duration ?? 1500, closable: defaultOptions.closable ?? true };

    clearToastTimers(id);
    Object.assign(toast, {
      message: localeService.text(message),
      type,
      icon: options.icon ?? (changedType ? defaultOptions.icon || TOAST_ICONS[type] : toast.icon),
      duration: options.duration ?? (changedType ? defaults.duration : toast.duration),
      closable: options.closable ?? (changedType ? defaults.closable : toast.closable),
      soft: options.soft ?? toast.soft,
      fading: false,
    });
    if (toast.duration > 0) {
      dismissTimers.set(id, setTimeout(() => removeToast(id, position), toast.duration));
    }
    return true;
  };

  // 移除 Toast
  const removeToast = (id, position) => {
    const toastList = toastGroups.get(position);
    const toast = toastList?.value.find((item) => item.id === id);
    if (!toast || toast.fading) return;

    clearToastTimers(id);

    // 淡出动画
    toast.fading = true;

    // 完全移除
    removalTimers.set(id, setTimeout(() => {
      toastList.value = toastList.value.filter((toast) => toast.id !== id);
      removalTimers.delete(id);
    }, 300));
  };

  // 快捷方法
  return {
    add: addToast,
    remove: removeToast,
    card: (message, options) => addToast(message, { type: "card", ...options }),
    info: (message, options) => addToast(message, { type: "info", ...options }),
    success: (message, options) =>
      addToast(message, { type: "success", ...options }),
    error: (message, options) =>
      addToast(message, { type: "error", ...options }),
    warning: (message, options) =>
      addToast(message, { type: "warning", ...options }),
    loading: (message, options) =>
      addToast(message, {
        type: "loading",
        icon: TOAST_ICONS.loading,
        closable: false, // 显式启用关闭按钮后才允许手动关闭
        duration: 0,
        ...options, // 仍然允许覆盖其他选项
      }),
  };
}
