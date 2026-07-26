// stores/changelog.js
import { defineStore } from "pinia";
import { ref } from "vue";

export const useChangelogStore = defineStore("changelog", () => {
  // 状态
  const data = ref({});
  const loading = ref(false);
  const error = ref(null);

  // 动作
  const fetchChangelog = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch("/changelog.json");
      if (!response.ok) throw new Error("Network response was not ok");
      data.value = await response.json();
    } catch (err) {
      error.value = err.message || "Failed to fetch changelog";
      console.error("Error fetching changelog:", err);
    } finally {
      loading.value = false;
    }
  };

  const hydrateChangelog = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;

    data.value = value;
    error.value = null;
    loading.value = false;
  };

  // 获取特定版本的信息
  const getVersionInfo = (version) => {
    return data.value[version];
  };

  // 获取最新版本
  const getLatestVersion = () => {
    const versions = Object.keys(data.value);
    if (versions.length === 0) return null;
    return versions.sort(compareVersions).pop();
  };

  // 版本比较函数
  const compareVersions = (a, b) => {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  };

  return {
    data,
    loading,
    error,
    fetchChangelog,
    hydrateChangelog,
    getVersionInfo,
    getLatestVersion,
  };
});
