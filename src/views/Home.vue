<template>
  <section
    class="hero min-h-[calc(100dvh-4rem)] lg:min-h-[calc(100dvh-5rem)] relative"
    v-fade-in="hero.url || fallbackImage"
    :style="{
      backgroundImage: `url('${hero.url || fallbackImage}')`,
    }"
  >
    <section class="hero-overlay"></section>
    <section class="hero-content text-center">
      <figure class="max-w-md">
        <div
          v-show="!imageLoaded"
          class="skeleton h-16 w-16 lg:h-24 lg:w-24 mx-auto rounded-lg z-20"
        ></div>
        <img
          v-fade-in
          v-show="imageLoaded"
          src="/favicon.webp"
          alt="myAvatar"
          class="h-16 w-16 lg:h-24 lg:w-24 mx-auto object-cover z-10"
          @load="handleImageLoad"
        />
        <figcaption
          class="flex flex-col text-neutral-content gap-2 lg:gap-4 mt-8 lg:mt-12"
        >
          <h1 class="font-serif font-black text-2xl lg:text-4xl">KoMoriSam</h1>
          <client-only>
            <h2 class="font-kai text-lg lg:text-xl">
              {{ greeting }} {{ description }}
            </h2>
          </client-only>
          <p class="font-kai text-base lg:text-lg">
            写点代码 · 搭点方块 · 折腾点服务器
          </p>
          <section
            class="flex max-lg:flex-col gap-4 justify-center mt-8 lg:mt-12"
          >
            <router-link to="/blog" class="btn btn-primary">
              <i class="ri-article-fill font-normal"></i>阅读博客
            </router-link>
            <router-link to="/novel" class="btn btn-primary btn-soft group">
              <i
                class="ri-eye-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-eye-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              视奸小说
            </router-link>
            <router-link to="/tools" class="btn btn-primary btn-soft group">
              <i
                class="ri-gamepad-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-gamepad-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              服务器状态
            </router-link>
          </section>
          <client-only v-if="hero.pageUrl">
            <a
              :href="hero.pageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="absolute bottom-4 right-4 z-10 text-right text-xs text-neutral-content/60 hover:text-neutral-content"
            >
              摄影 · {{ hero.author?.name || "Pixabay 用户" }}
              <br />
              来源 · Pixabay
            </a>
          </client-only>
          <a
            v-else
            href="https://pixabay.com/zh/photos/mountains-leaves-water-landscape-4950252/"
            target="_blank"
            rel="noopener noreferrer"
            class="absolute bottom-4 right-4 z-10 text-right text-xs text-neutral-content/60 hover:text-neutral-content"
          >
            摄影 · florianhoellmueller
            <br />
            来源 · Pixabay
          </a>
          <i
            class="ri-arrow-down-s-line absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          >
          </i>
        </figcaption>
      </figure>
    </section>
  </section>

  <section class="py-24 px-4">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <h2 class="font-serif text-3xl font-bold mb-3">我在做什么</h2>
        <figure class="my-4 lg:my-8 p-0 mx-auto w-fit lg:w-52">
          <div
            v-show="!imageLoaded"
            class="skeleton h-52 lg:w-52 lg:h-auto rounded-lg z-10"
          ></div>
          <img
            v-fade-in
            v-show="imageLoaded"
            src="/assets/images/profile/me1.webp"
            class="h-52 lg:w-52 lg:h-auto object-cover rounded-lg z-0"
            @load="handleImageLoad"
          />
        </figure>
        <p class="max-w-lg mx-auto">典中典之「这里是我的『数字花园』」</p>
      </section>
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <section class="card card-dash bg-base-200/10 border border-base-200">
          <section class="card-body">
            <aside class="card-icon">
              <i class="ri-article-line"></i>
            </aside>
            <h2 class="card-title font-serif font-bold">个人博客</h2>
            <p>
              记录技术探索 <small>AI 探索也是探索</small>
              <br />以及随笔、读书笔记等内容<br />
              <small>不定期更新，不支持 RSS 订阅</small>
            </p>
            <router-link to="/blog" class="btn btn-primary btn-soft btn-sm">
              阅读文章<i class="ri-arrow-right-line"></i>
            </router-link>
          </section>
        </section>
        <section class="card card-dash bg-base-200/10 border border-base-200">
          <section class="card-body">
            <aside class="card-icon">
              <i class="ri-article-line"></i>
            </aside>
            <h2 class="card-title font-serif font-bold">瞎写小说</h2>
            <p>
              经典写小说
              <br />孩子写着玩的<br />
              <small>不保证更新，不保证完结</small>
            </p>
            <router-link to="/novel" class="btn btn-primary btn-soft btn-sm">
              看看小说<i class="ri-arrow-right-line"></i>
            </router-link>
          </section>
        </section>
        <section class="card card-dash bg-base-200/10 border border-base-200">
          <section class="card-body">
            <aside class="card-icon">
              <i class="ri-pencil-ruler-2-line"></i>
            </aside>
            <h2 class="card-title font-serif font-bold">工具集</h2>
            <p>
              Minecraft 服务器状态查询
              <br />
              <small>是的，目前只有这一个毫无技术含量的调用 API 工具</small>
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="badge badge-outline badge-sm"> 服务器查询 </span>
              <span class="badge badge-outline badge-sm">
                僧伽罗字体转换器
                <small>待开发</small>
              </span>
            </div>
            <router-link to="/tools" class="btn btn-primary btn-soft btn-sm">
              使用工具<i class="ri-arrow-right-line"></i>
            </router-link>
          </section>
        </section>
      </section>
    </section>
  </section>

  <div class="divider"></div>

  <section class="py-24 px-4">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <h2 class="font-serif text-3xl font-bold mb-3">关于我</h2>
        <figure class="my-4 lg:my-8 p-0 mx-auto w-fit lg:w-52">
          <div
            v-show="!imageLoaded"
            class="skeleton h-52 lg:w-52 lg:h-auto rounded-lg z-10"
          ></div>
          <img
            v-fade-in
            v-show="imageLoaded"
            src="/assets/images/profile/me2.webp"
            class="h-52 lg:w-52 lg:h-auto object-cover rounded-lg z-0"
            @load="handleImageLoad"
          />
        </figure>
        <p class="max-w-lg mx-auto">
          你好，我是 KoMori
          <br />
          <span lang="ja"
            >22 <ruby>歳<rt>さい</rt></ruby
            >で、<ruby>学生<rt>がくせい</rt></ruby
            >です。</span
          >
          <br />
          <small
            >你还可以叫我的僧伽罗名字 <ruby>විශ්ව<rt>Wishwa</rt></ruby></small
          >
          <br />
          一个热衷于折腾各种东西的独立开发者 <small>（存疑）</small>
        </p>
      </section>
    </section>
  </section>

  <div class="divider"></div>

  <section class="py-24 px-4">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <h2 class="font-serif text-3xl font-bold mb-3">关注 & 联系</h2>
        <figure class="my-4 lg:my-8 p-0 mx-auto w-fit lg:w-52">
          <div
            v-show="!imageLoaded"
            class="skeleton h-52 lg:w-52 lg:h-auto rounded-lg z-10"
          ></div>
          <img
            v-fade-in
            v-show="imageLoaded"
            src="/assets/images/profile/me3.webp"
            class="h-52 lg:w-52 lg:h-auto object-cover rounded-lg z-0"
            @load="handleImageLoad"
          />
        </figure>
        <p class="max-w-lg mx-auto">
          在这些平台上可以找到我
          <br />
          <small> 微信和 QQ 常年不在线喵，不保证可以加上</small>
        </p>
        <div class="flex flex-wrap gap-3 justify-center mt-4 lg:mt-8">
          <a
            href="https://space.bilibili.com/71104942"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button class="btn btn-info">
              <i class="ri-bilibili-line font-normal"></i>Bilibili
            </button></a
          >
          <a
            href="https://github.com/KoMoriSam"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button class="btn btn-neutral">
              <i class="ri-github-fill font-normal"></i>
              GitHub
            </button>
          </a>
          <a
            href="https://weibo.com/u/5281976456"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button class="btn btn-error btn-soft group">
              <i
                class="ri-weibo-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-weibo-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              微博
            </button>
          </a>
          <div class="dropdown dropdown-bottom dropdown-center">
            <a
              tabindex="0"
              role="button"
              class="btn btn-success btn-soft group"
            >
              <i
                class="ri-wechat-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-wechat-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              微信
            </a>
            <div
              tabindex="0"
              class="card card-sm dropdown-content bg-base-200/10 border border-base-200 rounded-box z-1 shadow-sm w-32 mt-2"
            >
              <section tabindex="0" class="card-body">
                <div
                  class="aspect-square bg-base-content mask-contain mask-no-repeat mask-[url(/assets/images/profile/wechat.svg)]"
                >
                  <div alt="" class="w-30"></div>
                </div>
              </section>
            </div>
          </div>
          <a
            href="https://qm.qq.com/q/eYk72ol3qg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button class="btn btn-info btn-soft group">
              <i
                class="ri-qq-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-qq-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              QQ
            </button>
          </a>
        </div>
      </section>
    </section>
  </section>
  <FootBar />
</template>

<script setup>
import FootBar from "@/components/layout/FootBar.vue";

import { useImageLoad } from "@/composables/useImageLoad";

const { imageLoaded, handleImageLoad } = useImageLoad();

import { ref, onMounted, reactive } from "vue";

const greeting = ref("你好！");
const description = ref("欢迎来到我的个人网站！");

onMounted(() => {
  const isPrerenderBot = /HeadlessChrome|Prerender/i.test(navigator.userAgent);
  if (isPrerenderBot) return;
  const hour = new Date().getHours();
  if (hour < 6) {
    greeting.value = "凌晨好！";
    description.value = "夜深了，早点休息吧！";
  } else if (hour < 12) {
    greeting.value = "早上好！";
    description.value = "记得吃早餐哦！";
  } else if (hour < 14) {
    greeting.value = "中午好！";
    description.value = "午餐时间到了，休息一下吧！";
  } else if (hour < 18) {
    greeting.value = "下午好！";
    description.value = "工作辛苦了，喝杯茶放松一下！";
  } else if (hour < 21) {
    greeting.value = "晚上好！";
    description.value = "今天过得怎么样？";
  } else {
    greeting.value = "深夜好！";
    description.value = "记得照顾好自己！";
  }
});

import { fetchRandomHero } from "@/services/api-pixabay";

const fallbackImage =
  "assets/images/backgrounds/florianhoellmueller-mountains-4950252_1920.webp";

const hero = reactive({
  url: "",
  pageUrl: "",
  author: null,
});

async function loadHero() {
  try {
    const data = await fetchRandomHero();

    hero.url = data.url;
    hero.pageUrl = data.pageUrl;
    hero.author = data.author;
  } catch (error) {
    console.error("首页背景图加载失败：", error);
    hero.url = fallbackImage;
  }
}

onMounted(loadHero);
</script>
