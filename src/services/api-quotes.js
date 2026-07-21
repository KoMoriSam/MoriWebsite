import { useFetch } from "@vueuse/core";

const MXNZP_APP_ID = import.meta.env.MXNZP_APP_ID;
const MXNZP_APP_SECRET = import.meta.env.MXNZP_APP_SECRET;

export function useQuotesApi() {
  const getQuotes = async () => {
    const { data, error } = await useFetch(
      `https://www.mxnzp.com/api/daily_word/recommend?count=10&app_id=${MXNZP_APP_ID}&app_secret=${MXNZP_APP_SECRET}`,
    ).json();
    if (error.value) {
      throw new Error("获取每日一句失败");
    }
    return data.value;
  };
  return {
    getQuotes,
  };
}
