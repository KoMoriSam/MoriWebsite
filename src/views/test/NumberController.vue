<template>
  <TestPage section-id="number-controller">
    <section title="NumberController 组件">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <p class="mb-2 text-sm font-semibold">
            字体大小 <code class="font-normal">{{ fontSize }}</code>
          </p>
          <NumberController
            v-model="fontSize"
            :step="1"
            :places="0"
            :min="12"
            :max="48"
          />
        </div>
        <div>
          <p class="mb-2 text-sm font-semibold">
            字间距 <code class="font-normal">{{ fontGap }}</code>
          </p>
          <NumberController
            v-model="fontGap"
            :step="0.01"
            :places="2"
            :min="-1"
            :max="1"
          />
        </div>
        <div>
          <p class="mb-2 text-sm font-semibold">
            行高 <code class="font-normal">{{ lineHeight }}</code>
          </p>
          <NumberController
            v-model="lineHeight"
            :step="0.1"
            :places="1"
            :min="1"
            :max="3"
          />
        </div>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import NumberController from "@/components/ui/input/NumberController.vue";

import TestPage from "./_TestPage.vue";

const fontSize = ref(24);
const fontGap = ref(0);
const lineHeight = ref(1.5);
</script>
