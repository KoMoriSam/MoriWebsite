const getDynamicCacheExpiration = (updateFrequency) => {
  // 根据更新频率动态调整缓存时间
  switch (updateFrequency) {
    case "high": // 高频更新
      return 1000 * 60 * 60; // 1小时
    case "medium": // 中等频率更新
      return 1000 * 60 * 60 * 6; // 6小时
    case "low": // 低频更新
      return 1000 * 60 * 60 * 24; // 1天
    default: // 默认值
      return 1000 * 60 * 60 * 12; // 12小时
  }
};

/**
 * Giscus 评论系统配置
 * 这些值来自 GitHub Discussions API 的公开配置，本身不包含密钥，
 * 但集中管理便于维护和未来迁移。
 * @see https://giscus.app/zh-CN
 */
const GISCUS = {
  defaultRepo: {
    name: "KoMoriSam/komorisam.github.io",
    id: "R_kgDOJxn8KA",
  },
  blogRepo: {
    name: "KoMoriSam/theWake",
    id: "R_kgDOTElB5w",
  },
  novelRepo: {
    name: "KoMoriSam/theHorizon",
    id: "R_kgDOOWZUkw",
  },
  categories: {
    // 小说章评
    general: {
      name: "General",
      id: "DIC_kwDOOWZUk84C_2_B",
    },
    // 推文评论
    announcements: {
      name: "Announcements",
      id: "DIC_kwDOTElB584C_2-6",
    },
  },
  paragraphComments: {
    article: {
      repo: {
        name: "KoMoriSam/theWake",
        id: "R_kgDOTElB5w",
      },
      category: {
        name: "Ideas",
        id: "DIC_kwDOTElB584C_2-9",
      },
    },
    novel: {
      repo: {
        name: "KoMoriSam/theHorizon",
        id: "R_kgDOOWZUkw",
      },
      category: {
        name: "Ideas",
        id: "DIC_kwDOOWZUk84C_2_D",
      },
    },
  },
  paragraphCountsApi: {
    endpoint: import.meta.env.COMMENT_COUNTS_API || "",
    timeout: 8000,
  },
  // 小说书评
  defaultTerm: "向远方",
};

const CONFIG = {
  BASE_URL: "https://komorisam.github.io/theHorizon",
  getDynamicCacheExpiration, // 导出动态调整函数
  GISCUS,
};

export default CONFIG;
