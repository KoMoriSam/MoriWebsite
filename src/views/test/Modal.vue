<template>
  <TestPage section-id="modal">
    <TestCard title="Modal 弹窗">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <article class="rounded-box border border-base-300 p-4">
          <h3 class="font-semibold">1. 无按钮</h3>
          <p class="mt-1 text-sm opacity-70">应仅能通过 Esc 或点击弹窗外部关闭。</p>
          <button class="btn btn-sm mt-3" @click="openNoButtonModal">
            测试无按钮 Modal
          </button>
        </article>

        <article class="rounded-box border border-base-300 p-4">
          <h3 class="font-semibold">2. 右上角关闭按钮</h3>
          <p class="mt-1 text-sm opacity-70">
            可点击右上角关闭按钮，也可通过 Esc 或点击外部关闭。
          </p>
          <button class="btn btn-sm mt-3" @click="openTopCloseModal">
            测试顶部关闭按钮
          </button>
        </article>

        <article class="rounded-box border border-base-300 p-4">
          <h3 class="font-semibold">3. 右下角操作按钮</h3>
          <p class="mt-1 text-sm opacity-70">
            点击按钮应显示成功提示；Esc 或点击外部只关闭，不显示提示。
          </p>
          <button class="btn btn-sm mt-3" @click="openFooterModal">
            测试底部按钮
          </button>
        </article>

        <article class="rounded-box border border-base-300 p-4">
          <h3 class="font-semibold">4. 确认 Modal</h3>
          <p class="mt-1 text-sm opacity-70">
            确认按钮应为主色，取消按钮在右侧；Esc 与点击外部均不能关闭。
          </p>
          <button class="btn btn-sm mt-3" @click="openConfirmModal">
            测试确认 Modal
          </button>
        </article>

        <article class="rounded-box border border-base-300 p-4 sm:col-span-2">
          <h3 class="font-semibold">5. 声明式 Modal 组件</h3>
          <p class="mt-1 text-sm opacity-70">
            直接使用 &lt;Modal&gt;，验证 visible、button-text 与 close 事件。
          </p>
          <button class="btn btn-sm mt-3" @click="inlineModal = !inlineModal">
            {{ inlineModal ? "关闭声明式 Modal" : "打开声明式 Modal" }}
          </button>
        </article>
      </div>
      <Modal
        v-if="inlineModal"
        :visible="true"
        title="声明式 Modal"
        description="这是通过 &lt;Modal :visible /&gt; 直接声明的弹窗。"
        button-text="关闭"
        @close="inlineModal = false"
      />
    </TestCard>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import { useToast } from "@/composables/useToast";
import { useModal } from "@/composables/useModal";
import Modal from "@/components/ui/Modal.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});
const modal = useModal();
const inlineModal = ref(false);

function openNoButtonModal() {
  modal.show({
    title: "无按钮 Modal",
    description: "请分别使用 Esc 和点击弹窗外部来关闭。",
    buttonMode: "none",
  });
}

function openTopCloseModal() {
  modal.info("右上角关闭按钮", "请依次验证关闭按钮、Esc 和点击弹窗外部。", {
    buttonMode: "close",
  });
}

function openFooterModal() {
  modal.info(
    "右下角操作按钮",
    "只有点击“我知道了”才应显示成功提示；Esc 和点击外部只负责关闭。",
    {
      buttonMode: "footer",
      buttonText: "我知道了",
      onSubmit: () => toast.success("右下角按钮已触发"),
    },
  );
}

function openConfirmModal() {
  modal.confirm(
    "确认操作",
    "Esc 和点击弹窗外部不应关闭此弹窗，请测试确认和取消按钮。",
    {
      buttonText: "确认",
      cancelText: "取消",
      onSubmit: () => toast.success("已确认"),
      onCancel: () => toast.info("已取消"),
    },
  );
}
</script>
