import { useEventListener, useThrottleFn } from "@vueuse/core";
import { computed } from "vue";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";

export function usePosTracker(router, onRestoreTitle) {
  // const READ_POS_KEY = "READ_POS";
  // const readPos = useStorage(READ_POS_KEY, "");
  const { getState, setState } = useReadingStateStorage();
  const readPos = computed({
    get: () => getState("READ_POS", ""),
    set: (value) => setState("READ_POS", value),
  });
  let isManualHashChange = false;

  const posSelector = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], p[id]";

  // 动态生成完整的段落 id
  function getFullId(shortId) {
    // 保证 shortId 是字符串
    if (shortId == null) return "";
    if (typeof shortId !== "string") shortId = String(shortId);

    // 如果已经是完整ID格式（包含章节和页码），直接返回
    if (
      shortId.match(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+-/,
      )
    ) {
      return shortId;
    }

    // 如果是普通标题，直接返回
    if (!shortId.match(/^\d+$/)) {
      return shortId;
    }

    // 如果是脚注，直接返回
    if (shortId.startsWith("fn")) {
      return shortId;
    }

    const chapter = getState("READ_CH_ID", ""); // 从阅读状态获取章节UUID
    const page = router.currentRoute.value.query.page; // 从查询参数获取页码
    return `${chapter}-${page}-${shortId}`; // 拼接完整的段落ID
  }

  // 提取简化的段落 id
  function getShortId(fullId) {
    // 保证 fullId 是字符串
    if (fullId == null) return "";
    if (typeof fullId !== "string") fullId = String(fullId);

    // 如果已经是简化ID格式，直接返回
    if (
      !fullId.match(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+-/,
      )
    ) {
      return fullId;
    }

    const parts = fullId.split("-");
    if (parts.length >= 3) {
      return `${parts[parts.length - 1]}`; // 提取段落编号
    }
  }

  // 跳转到 READ_POS
  function scrollToLastReadPos() {
    const shortId = readPos.value;
    console.log("短ID", shortId);
    if (!shortId) return;

    const id = getFullId(shortId); // 动态生成完整的段落ID
    const el = document.getElementById(id);
    if (el) {
      performScroll(shortId, id, el);
      return;
    }

    // 确保路由已加载完成后再重试
    if (getState("READ_CH_ID", "") && router.currentRoute.value.query.page) {
      // 轮询等待 DOM 渲染，最多重试 8 次（总计约 4 秒）
      let retries = 0;
      const maxRetries = 8;
      const tryScroll = () => {
        const id = getFullId(shortId);
        const el = document.getElementById(id);
        if (el) {
          performScroll(shortId, id, el);
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(tryScroll, Math.min(300 + retries * 200, 1000));
        } else {
          console.warn("滚动到上次阅读位置失败：元素未找到", shortId);
        }
      };
      setTimeout(tryScroll, 200); // 初始延迟，给内容渲染一些时间
    } else {
      console.warn("路由参数未准备好，无法滚动到上次阅读位置");
    }
  }

  // 执行滚动操作
  function performScroll(shortId, id, el) {
    isManualHashChange = true;
    router.replace({
      path: router.currentRoute.value.path,
      query: router.currentRoute.value.query,
      hash: `#${decodeURIComponent(shortId)}`, // URL中只使用简化的ID
    });
    el.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      isManualHashChange = false;
      onRestoreTitle?.();
    }, 1000);
  }

  const updateCurrentPos = useThrottleFn(() => {
    if (isManualHashChange) return;

    const poss = Array.from(document.querySelectorAll(posSelector));
    if (poss.length === 0) return;

    const scrollTop = window.scrollY;
    const offset = 0.25 * window.innerHeight; // 提前 25% 触发位置更新

    const firstPos = poss[0];
    const firstPosTop = firstPos.getBoundingClientRect().top + window.scrollY;

    if (scrollTop + offset >= firstPosTop) {
      for (let i = poss.length - 1; i >= 0; i--) {
        const el = poss[i];
        const top = el.getBoundingClientRect().top + window.scrollY;

        if (scrollTop + offset >= top) {
          const id = el.id;
          if (id) {
            const shortId = getShortId(id); // 确保存储的是简化ID
            isManualHashChange = true;
            router.replace({
              path: router.currentRoute.value.path,
              query: router.currentRoute.value.query,
              hash: `#${decodeURIComponent(shortId)}`,
            });
            readPos.value = shortId; // 存储简化ID
            setTimeout(() => {
              isManualHashChange = false;
            }, 300);
          }
          break;
        }
      }
    } else {
      if (readPos.value && !readPos.value.startsWith("#fn")) {
        readPos.value = "";
        router.replace({
          path: router.currentRoute.value.path,
          query: router.currentRoute.value.query,
          hash: "",
        });
      }
    }
  }, 300);

  // 监听hash变化事件（包括脚注跳转）
  useEventListener(window, "hashchange", (e) => {
    const hash = window.location.hash;
    if (hash.startsWith("#fn")) {
      isManualHashChange = true;
      readPos.value = hash.substring(1); // 记录脚注（如 "fn1"）
      setTimeout(() => {
        isManualHashChange = false;
      }, 300);
    }
  });

  // 监听点击事件，检测脚注链接点击
  useEventListener(document, "click", (e) => {
    const target = e.target.closest("a");
    if (target?.getAttribute("href")?.startsWith("#fn")) {
      isManualHashChange = true;
      readPos.value = target.getAttribute("href")?.substring(1) || ""; // 记录脚注（如 "fn1"）
      setTimeout(() => {
        isManualHashChange = false;
      }, 300);
    }
  });

  scrollToLastReadPos();
  useEventListener(window, "scroll", updateCurrentPos);
}
