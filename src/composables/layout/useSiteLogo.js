import { onBeforeUnmount, onMounted, ref } from "vue";

const TITLE_DIRECTORY = "/assets/images/titles/";
const DEFAULT_TITLE = `${TITLE_DIRECTORY}title.webp`;
const DATE_VARIANTS = {
  "2-23": "cake", // 生日
  "3-23": "dock", // 世界气象日：蓝天、云层与草地
  "4-12": "midnight", // 载人航天国际日
  "4-22": "grass_flower", // 世界地球日
  "5-17": "classic", // Minecraft 首次公开发布（2009-05-17）
  "6-5": "grass", // 世界环境日
  "6-8": "bubble", // 世界海洋日
  "9-18": "bamboo", // 世界竹子日
  "10-6": "crystal", // 国际地质多样性日
  "11-10": "atoms", // 世界科学日
  "12-31": "darkgold", // 跨年
};

export function useSiteLogo() {
  // Keep server output and the initial client render independent of timezone.
  const titleSrc = ref(DEFAULT_TITLE);
  let dispose = () => {};

  const resetTitle = () => {
    titleSrc.value = DEFAULT_TITLE;
  };

  onMounted(() => {
    let timer;
    let active = true;
    let getSeasonalLogoVariant;

    function syncTitle() {
      clearTimeout(timer);
      if (!active || document.hidden) return;
      const now = new Date();
      const month = now.getMonth();
      const variant = DATE_VARIANTS[`${month + 1}-${now.getDate()}`]
        ?? getSeasonalLogoVariant?.(now);
      titleSrc.value = variant ? `${TITLE_DIRECTORY}title_${variant}.webp` : DEFAULT_TITLE;

      const midnight = new Date(now.getFullYear(), month, now.getDate() + 1);
      timer = setTimeout(syncTitle, midnight.getTime() - now.getTime());
    }

    document.addEventListener("visibilitychange", syncTitle);
    window.addEventListener("focus", syncTitle);
    syncTitle();

    // Load the astronomical calendar separately from the navigation bundle.
    import("@/utils/layout/seasonal-logo")
      .then((calendar) => {
        if (!active) return;
        getSeasonalLogoVariant = calendar.getSeasonalLogoVariant;
        syncTitle();
      })
      .catch(() => {
        // Keep the base title or fixed-date variant if the calendar cannot load.
      });

    dispose = () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", syncTitle);
      window.removeEventListener("focus", syncTitle);
    };
  });

  onBeforeUnmount(() => dispose());
  return { titleSrc, resetTitle };
}
