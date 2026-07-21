import { useFetch } from "@vueuse/core";

const API_BASE = "https://list.mczfw.com/api/";
const DEFAULT_SERVER = import.meta.env.SERVER_ADDRESS;

export function useServerApi() {
  const getServerInfo = async (serverAddress) => {
    const addr = serverAddress || DEFAULT_SERVER;
    const { data, error } = await useFetch(`${API_BASE}${addr}`).json();
    if (error.value) {
      throw new Error("获取服务器信息失败");
    }
    return data.value;
  };
  return {
    getServerInfo,
    DEFAULT_SERVER,
  };
}
