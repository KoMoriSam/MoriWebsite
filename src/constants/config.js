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

const CONFIG = {
  BASE_URL: "https://raw.komori.cc/novel",
  getDynamicCacheExpiration, // 导出动态调整函数
};

export default CONFIG;
