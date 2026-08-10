import { h, computed } from "vue";
import { useGlobalStorage } from "@/utils/storage/use-global-storage";

import UpdateDetail from "@/components/UpdateDetail.vue";

import { useModal } from "@/composables/useModal";
const modal = useModal();

import { useChangelogStore } from "@/stores/changelogStore";

export async function checkUpdateNotice() {
  const { GLOBAL_INFO } = useGlobalStorage();
  const currentVersion = computed({
    get: () => GLOBAL_INFO.value.APP_VERSION || "0.0.0",
    set: (value) => {
      GLOBAL_INFO.value.APP_VERSION = value;
    },
  });
  const changelogStore = useChangelogStore();

  // 获取 changelog 数据
  await changelogStore.fetchChangelog();

  if (Object.keys(changelogStore.data).length === 0) return;

  const latestVersion = changelogStore.getLatestVersion();
  if (!latestVersion || latestVersion === currentVersion.value) return;

  const latestLog = changelogStore.getVersionInfo(latestVersion);
  const { date, changes, note, warning } = latestLog;

  console.log("当前版本:", currentVersion);

  console.log("latestLog", latestLog);

  const updateVersion = () => {
    currentVersion.value = latestVersion;
  };

  const description = h(UpdateDetail, {
    version: latestVersion,
    date,
    changes,
    note,
    warning,
  });

  const leadingAction = h(
    "a",
    {
      href: "/changelog",
      target: "_blank",
      rel: "noopener noreferrer",
      class: "btn btn-primary no-underline",
      onClick: (event) => {
        event.stopPropagation();
        updateVersion();
      },
    },
    [
      "查看完整日志",
      h("i", {
        class: "ri-arrow-right-up-line font-normal",
        "aria-hidden": "true",
      }),
    ],
  );

  modal.show({
    title: "新版本更新！",
    description: description,
    buttonText: "我知道了",
    leadingAction,
    onSubmit: () => {
      updateVersion();
    },
  });
}
