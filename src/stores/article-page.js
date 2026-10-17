import { shallowRef } from "vue";
import { defineStore } from "pinia";

// Runtime-loaded articles need reactive metadata: Vue Router's meta is shallow.
export const useArticlePageStore = defineStore("article-page", () => {
  const page = shallowRef(null);
  const setPage = (path, article, unavailable = false) => {
    page.value = { path, article, unavailable };
  };
  return { page, setPage };
});
