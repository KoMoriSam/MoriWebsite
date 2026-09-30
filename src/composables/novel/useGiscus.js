import { ref } from "vue";

export function useGiscus() {
  const currentMapping = ref("title");

  // 切换评论映射
  const commentToggle = () => {
    currentMapping.value =
      currentMapping.value === "title" ? "specific" : "title";
  };

  return { currentMapping, commentToggle };
}
