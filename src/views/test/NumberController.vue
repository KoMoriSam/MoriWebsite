<template>
  <TestPage section-id="number-controller">
    <TestCard title="NumberController 组件">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <TestControlRow label="字体大小" :value="fontSize">
          <NumberController
            v-model="fontSize"
            :step="1"
            :places="0"
            :min="12"
            :max="48"
          />
        </TestControlRow>
        <TestControlRow label="字间距" :value="fontGap">
          <NumberController
            v-model="fontGap"
            :step="0.01"
            :places="2"
            :min="-1"
            :max="1"
          />
        </TestControlRow>
        <TestControlRow label="行高" :value="lineHeight">
          <NumberController
            v-model="lineHeight"
            :step="0.1"
            :places="1"
            :min="1"
            :max="3"
          />
        </TestControlRow>
      </div>
    </TestCard>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import NumberController from "@/components/ui/input/NumberController.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestControlRow from "@/components/test/_TestControlRow.vue";
import TestPage from "./_TestPage.vue";

const fontSize = ref(24);
const fontGap = ref(0);
const lineHeight = ref(1.5);
</script>
