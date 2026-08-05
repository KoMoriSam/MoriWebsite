// src/composables/useToast.js
import { createApp, ref, h } from "vue";
import Toast from "@/components/ui/Toast.vue";
import {
  TOAST_POSITIONS,
  DEFAULT_POSITION,
  TOAST_ICONS,
} from "@/constants/toast";

// 容器和状态管理
const containerMap = new Map();
const toastGroups = new Map();

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
  // 初始化指定位置的容器
  const initContainer = (position) => {
    if (!containerMap.has(position)) {
      const container = document.createElement("div");
      // 添加基础类名和位置类名
      document.body.appendChild(container);
      container.className = `toast z-20 mx-0 my-18 ${
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
      message,
      type,
      icon: icon || TOAST_ICONS[type],
      closable,
      soft,
      duration,
      fading: false, // 初始状态为不淡出
    });

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => removeToast(id, normalizedPos), duration);
    }

    return { id, position: normalizedPos };
  };

  // 移除 Toast
  const removeToast = (id, position) => {
    const toastList = toastGroups.get(position);
    if (!toastList || !toastList.value) return;

    // 淡出动画
    toastList.value = toastList.value.map((toast) => {
      if (toast.id === id) {
        return { ...toast, fading: true };
      }
      return toast;
    });

    // 完全移除
    setTimeout(() => {
      toastList.value = toastList.value.filter((toast) => toast.id !== id);
    }, 300);
  };

  // 快捷方法
  return {
    add: addToast,
    remove: removeToast,
    info: (message, options) => addToast(message, { type: "info", ...options }),
    success: (message, options) =>
      addToast(message, { type: "success", ...options }),
    error: (message, options) =>
      addToast(message, { type: "error", ...options }),
    warning: (message, options) =>
      addToast(message, { type: "warning", ...options }),
    loading: (message, options) =>
      addToast(message, {
        type: "info",
        icon: TOAST_ICONS.loading,
        closable: false, // loading toast 强制不可关闭
        duration: 0,
        ...options, // 仍然允许覆盖其他选项
      }),
  };
}
