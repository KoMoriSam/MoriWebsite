const HERO_API_URL = import.meta.env.RANDOM_HERO_API;

export async function fetchRandomHero() {
  const response = await fetch(HERO_API_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `随机背景图请求失败：${response.status}`);
  }

  if (!data?.url) {
    throw new Error("接口没有返回可用的图片地址");
  }

  return data;
}
