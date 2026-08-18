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
      <figure class="max-w-md select-none">
        <img
          v-fade-in
          src="/assets/images/animates/idle.gif"
          alt="idle"
          class="w-42 md:w-48 lg:w-56 mx-auto object-cover"
          @load="handleImageLoad"
        />
        <figcaption
          class="flex flex-col text-neutral-content gap-2 md:gap-3 lg:gap-4"
        >
          <h1 class="font-serif font-black text-2xl md:text-3xl lg:text-4xl">
            <span
              tabindex="0"
              class="inline-flex items-baseline outline-none"
              @mouseenter="handleNameEnter"
              @mouseleave="handleNameLeave"
              @focus="handleNameFocus"
              @blur="handleNameBlur"
            >
              远方之森&#8197;
              <span
                ref="nameRef"
                class="inline-block max-w-0 overflow-hidden whitespace-nowrap -translate-x-2 opacity-0 font-normal text-base md:text-lg lg:text-xl animate-name-reveal transition-[max-width,margin-left,transform,opacity] duration-500 ease-out"
              >
                /&#8197;<em>Wishwa Luo</em>
              </span>
            </span>
          </h1>
          <h2
            class="relative mx-auto w-[15ch] whitespace-nowrap font-mono text-lg md:text-xl lg:text-2xl [--type-color:color-mix(in_oklab,var(--color-neutral-content)_70%,transparent)] text-transparent bg-[linear-gradient(var(--type-color),var(--type-color))] bg-no-repeat bg-[length:var(--type-progress)_100%] bg-clip-text animate-typing after:absolute after:top-1.25 after:lg:top-0 after:left-[var(--type-progress)] after:h-[1em] after:lg:h-[1.25em] after:w-1 after:lg:w-2 after:bg-[var(--type-color)] after:animate-cursor-blink"
          >
            Explore Beyond.
          </h2>
          <p class="text-base md:text-lg lg:text-xl">
            {{ greeting }}{{ description }}
          </p>
          <section
            class="flex flex-col lg:flex-row gap-4 justify-center items-center mt-6 md:mt-8 lg:mt-12"
          >
            <router-link to="/blog" class="btn btn-primary w-64 lg:w-fit">
              <i class="ri-article-fill font-normal"></i>阅读博客
            </router-link>
            <router-link
              to="/novel"
              class="btn btn-primary btn-soft w-64 lg:w-fit group"
            >
              <i
                class="ri-eye-line group-hover:hidden group-active:hidden font-normal"
              ></i>
              <i
                class="ri-eye-fill hidden group-hover:block group-active:block font-normal"
              ></i>
              视奸小说
            </router-link>
            <router-link
              to="/tools/server-status"
              class="btn btn-primary btn-soft w-64 lg:w-fit group"
            >
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
              摄影&#8197;·&#8197;{{ hero.author?.name || "Pixabay 用户" }}
              <br />
              来源&#8197;·&#8197;Pixabay
            </a>
          </client-only>
          <a
            v-else
            href="https://pixabay.com/zh/photos/mountains-leaves-water-landscape-4950252/"
            target="_blank"
            rel="noopener noreferrer"
            class="absolute bottom-4 right-4 z-10 text-right text-xs text-neutral-content/60 hover:text-neutral-content"
          >
            摄影&#8197;·&#8197;florianhoellmueller
            <br />
            来源&#8197;·&#8197;Pixabay
          </a>
          <i
            class="ri-arrow-down-s-line absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          >
          </i>
        </figcaption>
      </figure>
    </section>
  </section>

  <section class="py-24 px-6 sm:px-8 lg:px-10">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <hgroup>
          <span
            class="mb-2 text-[0.675rem] md:text-xs font-semibold tracking-wide text-base-content/50 uppercase"
            >What am I doing?</span
          >
          <h2 class="font-serif text-3xl font-bold mb-3">我在做什么</h2>
        </hgroup>
        <figure class="p-0 mx-auto w-42 lg:w-56">
          <img
            v-fade-in
            src="/assets/images/animates/mine.gif"
            class="w-42 lg:w-56 object-cover rounded-lg z-0"
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
              一些有用没用的小工具捏
              <br />
              <small
                >持续更新中……<br />现已支持<i class="ri-arrow-down-line"></i
              ></small>
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span class="badge badge-outline badge-sm">
                Minecraft 服务器查询
              </span>
              <span class="badge badge-outline badge-sm">
                僧伽罗字体编码转换器
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

  <section class="py-24 px-6 sm:px-8 lg:px-10">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <hgroup>
          <span
            class="mb-2 text-[0.675rem] md:text-xs font-semibold tracking-wide text-base-content/50 uppercase"
            >About me</span
          >
          <h2 class="font-serif text-3xl font-bold mb-3">关于我</h2>
        </hgroup>
        <figure class="p-0 mx-auto w-32 lg:w-46">
          <img
            v-fade-in
            src="/assets/images/animates/turn.gif"
            class="w-32 lg:w-46 object-cover rounded-lg z-0"
            @load="handleImageLoad"
          />
        </figure>
        <p class="max-w-lg mx-auto">
          你好，我是 KoMori
          <br />
          <span lang="ja"
            >22 <ruby>歳<rp>（</rp><rt>さい</rt><rp>）</rp></ruby>で、<ruby
              >学生<rp>（</rp><rt>がくせい</rt><rp>）</rp></ruby
            >です。</span
          >
          <br />
          <small
            >你还可以叫我的僧伽罗名字
            <ruby>විශ්ව<rp>（</rp><rt>Wishwa</rt><rp>）</rp></ruby></small
          >
          <br />
          一个热衷于折腾各种东西的独立开发者 <small>（存疑）</small>
        </p>
      </section>
    </section>
  </section>

  <div class="divider"></div>

  <section class="py-24 px-6 sm:px-8 lg:px-10">
    <section class="max-w-6xl mx-auto">
      <section class="text-center mb-14">
        <hgroup>
          <span
            class="mb-2 text-[0.675rem] md:text-xs font-semibold tracking-wide text-base-content/50 uppercase"
            >Follow & Contact Me</span
          >
          <h2 class="font-serif text-3xl font-bold mb-3">关注 & 联系我</h2>
        </hgroup>
        <figure class="my-4 lg:my-8 p-0 mx-auto w-32 lg:w-46">
          <img
            v-fade-in
            src="/assets/images/animates/thanks.gif"
            class="w-32 lg:w-46 object-cover rounded-lg z-0"
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
            href="https://space.bilibili.com/71104942"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="aura text-info">
              <button class="btn btn-info">
                <i class="ri-bilibili-line font-normal"></i>Bilibili
              </button>
            </div>
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
    description.value = "夜深了，早点休息～";
  } else if (hour < 12) {
    greeting.value = "早上好！";
    description.value = "记得吃早餐～";
  } else if (hour < 14) {
    greeting.value = "中午好！";
    description.value = "午餐时间到了，休息一下～";
  } else if (hour < 18) {
    greeting.value = "下午好！";
    description.value = "工作辛苦了，喝杯茶放松一下～";
  } else if (hour < 21) {
    greeting.value = "晚上好！";
    description.value = "今天过得怎么样?";
  } else {
    greeting.value = "深夜好！";
    description.value = "记得照顾好自己～";
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

const nameRef = ref(null);

let isHovered = false;
let isFocused = false;
let resetTimer = null;

function freezeCurrentFrame() {
  const el = nameRef.value;
  if (!el) return;

  clearTimeout(resetTimer);

  const style = getComputedStyle(el);

  const current = {
    maxWidth: style.maxWidth,
    marginLeft: style.marginLeft,
    transform: style.transform,
    opacity: style.opacity,
  };

  // 先保存动画当前帧
  el.style.maxWidth = current.maxWidth;
  el.style.marginLeft = current.marginLeft;
  el.style.transform = current.transform;
  el.style.opacity = current.opacity;

  // 再关闭 animation。
  // 因为已经保存了当前值，所以这里不会瞬移。
  el.style.animation = "none";

  // 强制浏览器提交当前帧
  void el.offsetWidth;
}

function revealName() {
  const el = nameRef.value;
  if (!el) return;

  freezeCurrentFrame();

  requestAnimationFrame(() => {
    el.style.maxWidth = "12rem";
    el.style.marginLeft = "0.5rem";
    el.style.transform = "translateX(0)";
    el.style.opacity = "0.75";
  });
}

function collapseAndResume() {
  const el = nameRef.value;
  if (!el) return;

  freezeCurrentFrame();

  requestAnimationFrame(() => {
    el.style.maxWidth = "0";
    el.style.marginLeft = "0";
    el.style.transform = "translateX(-0.5rem)";
    el.style.opacity = "0";
  });

  // 收回完成后重新交还给自动循环动画
  resetTimer = setTimeout(() => {
    if (isHovered || isFocused) return;

    el.style.maxWidth = "";
    el.style.marginLeft = "";
    el.style.transform = "";
    el.style.opacity = "";
    el.style.animation = "";
  }, 500);
}

function handleNameEnter() {
  isHovered = true;
  revealName();
}

function handleNameLeave() {
  isHovered = false;

  if (!isFocused) {
    collapseAndResume();
  }
}

function handleNameFocus() {
  isFocused = true;
  revealName();
}

function handleNameBlur() {
  isFocused = false;

  if (!isHovered) {
    collapseAndResume();
  }
}
</script>
