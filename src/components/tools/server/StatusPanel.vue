<template>
  <section class="not-prose w-auto">
    <!-- 搜索栏 -->
    <fieldset
      class="fieldset bg-base-200/60 border-base-300 rounded-box border w-full p-4 sm:p-5 mb-6"
    >
      <legend class="fieldset-legend">{{ translate('tools.serverInfo.checkServerStatus') }}</legend>
      <div class="join">
        <div class="flex-1 grid w-full">
          <label class="input validator w-full join-item [grid-row:1]">
            <i class="ri-server-line"></i>
            <input
              v-model="serverAddress"
              type="text"
              :placeholder="`${defaultServer}`"
              pattern="^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d{1,5})?$|^(?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?$"
              :title="translate('tools.serverInfo.enterAValidServerAddressEGMcExampleCom')"
              @keydown.enter="fetchInfo"
            />
            <button
              class="btn btn-ghost btn-xs btn-square -mr-1"
              :title="translate('tools.serverInfo.pasteFromClipboard')"
              @click.prevent="pasteAndFetch"
            >
              <i class="ri-clipboard-line"></i>
            </button>
          </label>
          <p class="label label-hint [grid-area:2/1]">
            <i class="ri-information-line"></i>
            <span class="text-rotate">
              <span>
                <span>{{ translate('tools.serverInfo.enterAServerAddress') }}</span>
                <span>{{ translate('tools.serverInfo.defaultPort25565') }}</span>
              </span>
            </span>
          </p>
          <p
            class="validator-hint [grid-area:2/1] mt-0 text-nowrap! inline-flex! gap-1.5! items-center!"
          >
            <i class="ri-error-warning-line"></i>
            <span class="text-rotate">
              <span>
                <span>{{ translate('tools.serverInfo.pleaseEnterAValidServerAddress') }}</span>
                <span>{{ translate('tools.serverInfo.exampleMcExampleCom25565') }}</span>
              </span>
            </span>
          </p>
        </div>
        <button
          class="btn btn-primary sm:flex-shrink-0 sm:w-auto join-item"
          @click="fetchInfo"
          :disabled="loading"
        >
          <span class="flex gap-1 items-center">
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs"
            ></span>
            <i v-else class="ri-search-line w-4"></i>{{ translate('tools.serverInfo.check') }}
          </span>
        </button>
      </div>
    </fieldset>

    <!-- 服务器信息卡片网格 -->
    <section
      v-if="serverInfo"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
      :aria-label="translate('tools.serverInfo.serverInformationCard')"
    >
      <!-- 卡片：服务器 -->
      <article
        class="rounded-box bg-base-200/60 text-base-content border border-base-300 p-5 flex flex-col items-center gap-2"
      >
        <h3
          class="text-sm text-base-content/75 flex items-center gap-2 self-start"
        >
          <i class="ri-hard-drive-3-line"></i>
          {{ translate('tools.serverInfo.server') }}
        </h3>
        <img
          v-if="serverInfo.logo"
          :src="serverInfo.logo"
          :alt="translate('common.sections.serverLogo')"
          class="mask mask-squircle w-16 h-16"
          :title="translate('tools.serverInfo.serverLogo')"
          v-fade-in
        />
        <div
          v-else
          class="mask mask-squircle w-16 h-16 bg-base-300 flex items-center justify-center"
          :title="translate('tools.serverInfo.serverOffline')"
        >
          <i class="ri-server-fill text-3xl text-base-content/40"></i>
        </div>
        <p class="text-sm text-base-content/75">
          <i class="ri-map-pin-line"></i>
          {{ serverInfo.city }}
        </p>
      </article>

      <!-- 卡片：当前状态 -->
      <article
        class="rounded-box bg-base-200/60 text-base-content border border-base-300 p-5 flex flex-col gap-2"
      >
        <h3 class="text-sm text-base-content/75 flex items-center gap-2">
          <div
            v-if="serverInfo.ping === null"
            class="inline-grid *:[grid-area:1/1]"
          >
            <div class="status status-error animate-ping"></div>
            <div class="status status-error"></div>
          </div>
          <div v-else class="inline-grid *:[grid-area:1/1]">
            <div class="status status-success animate-ping"></div>
            <div class="status status-success"></div>
          </div>
          {{ translate('tools.serverInfo.status') }}
        </h3>
        <p class="text-2xl font-bold my-3">
          {{ serverInfo.ping === null ? translate('tools.serverInfo.offlineOrNotFound') : translate('tools.serverInfo.online') }}
        </p>
        <p class="text-rotate text-sm text-base-content/75">
          <span>
            <span>
              <i class="ri-link"></i>
              {{ queriedAddress }}
            </span>
            <span v-if="serverInfo.ping === null">
              <i class="ri-information-line"></i>
              {{ translate('tools.serverInfo.contactTheAdministratorOrCheckTheAddress') }}
            </span>
            <span v-else>
              <i class="ri-information-line"></i>
              {{ serverInfo.version }}
            </span>
          </span>
        </p>
      </article>

      <!-- 卡片：在线人数 -->
      <article
        v-if="serverInfo.ping !== null"
        class="rounded-box bg-base-200/60 text-base-content border border-base-300 p-5 flex flex-col gap-2"
      >
        <h3 class="text-sm text-base-content/75 flex items-center gap-2">
          <i class="ri-user-3-line"></i>
          {{ translate('tools.serverInfo.playersOnline') }}
        </h3>
        <p class="text-2xl font-bold my-3">
          {{ serverInfo.p }} / {{ serverInfo.mp }}
        </p>
        <p class="text-sm text-base-content/75">
          <span
            class="badge badge-sm badge-error"
            v-if="serverInfo.p / serverInfo.mp >= 0.75"
          >
            {{ translate('tools.serverInfo.busy') }}
          </span>
          <span
            class="badge badge-sm badge-warning"
            v-else-if="serverInfo.p / serverInfo.mp >= 0.4"
          >
            {{ translate('tools.serverInfo.active') }}
          </span>
          <span class="badge badge-sm badge-success" v-else>{{ translate('tools.serverInfo.quiet') }}</span>
        </p>
      </article>

      <!-- 卡片：网络延迟 -->
      <article
        v-if="serverInfo.ping !== null"
        class="rounded-box bg-base-200/60 text-base-content border border-base-300 p-5 flex flex-col gap-2"
      >
        <h3 class="text-sm text-base-content/75 flex items-center gap-2">
          <i class="ri-timer-line"></i>
          {{ translate('tools.serverInfo.latency') }}
        </h3>
        <p class="text-2xl font-bold my-3">{{ serverInfo.ping }} ms</p>
        <p class="text-sm text-base-content/75">
          <span
            class="badge badge-sm badge-error"
            v-if="serverInfo.ping > 200 || serverInfo.ping === null"
          >
            {{ translate('tools.serverInfo.high') }}
          </span>
          <span
            class="badge badge-sm badge-warning"
            v-else-if="serverInfo.ping > 100"
          >
            {{ translate('tools.serverInfo.medium') }}
          </span>
          <span class="badge badge-sm badge-success" v-else>{{ translate('tools.serverInfo.low') }}</span>
        </p>
      </article>
    </section>

    <LoadingIndicator v-else :size="`h-42`" />
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import LoadingIndicator from "@/components/feedback/LoadingIndicator.vue";

import { ref, onMounted } from "vue";
import { useServerApi } from "@/services/api-server";
import { useToast } from "@/composables/useToast";
const { getServerInfo, DEFAULT_SERVER } = useServerApi();
const toast = useToast();

const defaultServer = DEFAULT_SERVER;
const serverAddress = ref("");
const queriedAddress = ref("");
const serverInfo = ref(null);
const loading = ref(false);

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      serverAddress.value = text.trim();
    } else {
      toast.info(translate('tools.serverInfo.theClipboardIsEmpty'));
    }
  } catch (e) {
    console.error("无法读取剪贴板:", e);
    toast.error(translate('tools.serverInfo.cannotReadTheClipboardPleaseEnterTextManually'));
  }
};

const pasteAndFetch = async () => {
  await pasteFromClipboard();
  if (!serverAddress.value) return;
  fetchInfo();
};

const fetchInfo = async () => {
  loading.value = true;
  const address = serverAddress.value || undefined;
  try {
    const data = await getServerInfo(address);
    if (!data || Array.isArray(data) || !("ping" in data)) {
      toast.error(translate('tools.serverInfo.noServerDataWasReturned'));
      return;
    }
    if (data.error) {
      toast.error(data.error);
      return;
    }
    queriedAddress.value = address || defaultServer;
    serverInfo.value = data;
  } catch (e) {
    console.error(e);
    toast.error(translate('tools.serverInfo.lookupFailedPleaseCheckTheAddress'));
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const isPrerenderBot = /HeadlessChrome|Prerender/i.test(navigator.userAgent);
  if (isPrerenderBot) return;
  fetchInfo();
});
</script>
