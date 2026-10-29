<template>
  <div class="@container/entrance">
    <section
      class="grid min-w-0 grid-cols-12 items-start gap-x-3 gap-y-3 pt-6 @min-[30rem]/entrance:gap-x-6 @min-[30rem]/entrance:gap-y-4 @min-[30rem]/entrance:pt-8 @min-[60rem]/entrance:gap-x-12"
      aria-labelledby="home-title"
    >
      <!-- 主题、气泡与介绍 -->
      <div
        class="relative isolate col-span-full row-start-1 min-w-0 md:col-span-6 md:col-start-1 md:self-center md:py-4"
      >
        <AmbientBackdrop />
        <p
          class="mb-3 font-sans text-xs font-semibold tracking-widest text-base-content/60 uppercase"
          lang="en"
        >
          KoMori's personal website
        </p>

        <h1
          id="home-title"
          class="font-serif text-[clamp(2.75rem,5vw,4rem)] leading-tight font-black tracking-tight text-balance"
          lang="zh-CN"
        >
          <span class="text-primary">远方</span>之森
        </h1>

        <p
          class="mt-3 font-serif font-semibold text-2xl leading-tight @min-[30rem]/entrance:text-3xl"
          lang="en"
        >
          Explore <em class="text-primary">Beyond.</em>
        </p>

        <GreetingMessage class="my-4 md:my-8 xl:my-12">
          {{ translate(`home.greeting.${greeting}`) }}
          {{
            translate(
              greeting === "default"
                ? "home.greeting.welcome"
                : `home.greeting.${greeting}Hint`,
            )
          }}
        </GreetingMessage>

        <p class="my-4 max-w-2xl leading-7 text-base-content/70 text-pretty">
          {{ translate("home.hero.description") }}
        </p>
      </div>

      <!-- 首屏操作 -->
      <div
        class="relative z-20 col-span-5 col-start-1 row-start-2 flex min-w-0 flex-col items-stretch gap-2 self-center @min-[30rem]/entrance:col-span-6 md:self-start md:flex-row md:flex-wrap md:items-center"
      >
        <router-link
          to="/blog"
          class="btn btn-primary @max-[30rem]/entrance:h-auto @max-[30rem]/entrance:min-h-10 w-full md:w-auto @max-[30rem]/entrance:px-2 @max-[30rem]/entrance:text-sm @max-[30rem]/entrance:whitespace-normal"
        >
          {{ translate("home.hero.read") }}
          <i class="ri-article-fill" aria-hidden="true"></i>
        </router-link>

        <a
          href="#about"
          @click.prevent="$emit('explore')"
          class="btn btn-ghost @max-[30rem]/entrance:h-auto @max-[30rem]/entrance:min-h-10 w-full md:w-auto @max-[30rem]/entrance:px-2 @max-[30rem]/entrance:text-sm @max-[30rem]/entrance:whitespace-normal"
        >
          {{ translate("home.hero.explore") }}
          <i
            class="ri-arrow-down-s-line animate-arrow-bounce motion-reduce:animate-none translate-y-0.25"
            aria-hidden="true"
          ></i>
        </a>
      </div>

      <!-- 主视觉 -->
      <VisualSlideshow
        class="relative z-10 col-span-7 col-start-6 row-start-2 -mt-2 w-full min-w-0 self-start justify-self-end @min-[30rem]/entrance:col-span-6 @min-[30rem]/entrance:col-start-7 @min-[30rem]/entrance:max-md:-mt-3 @min-[30rem]/entrance:flex @min-[30rem]/entrance:max-w-100 @min-[30rem]/entrance:flex-col md:row-span-2 md:row-start-1 md:mt-0 md:self-center"
      />
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useLocale } from "@/i18n";
import GreetingMessage from "@/components/interaction/feedback/GreetingMessage.vue";
import AmbientBackdrop from "@/components/home/AmbientBackdrop.vue";
import VisualSlideshow from "@/components/home/VisualSlideshow.vue";

defineProps({
  article: {
    type: Object,
    default: null,
  },
});

defineEmits(["explore"]);
const { t: translate } = useLocale();
const greeting = ref("default");
onMounted(() => {
  const hour = new Date().getHours();
  greeting.value =
    hour < 6
      ? "dawn"
      : hour < 12
        ? "morning"
        : hour < 14
          ? "noon"
          : hour < 18
            ? "afternoon"
            : hour < 21
              ? "evening"
              : "night";
});
</script>
