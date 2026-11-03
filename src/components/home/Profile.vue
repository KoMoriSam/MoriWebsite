<template>
  <div
    class="grid items-start gap-6 sm:grid-cols-[8rem_minmax(0,1fr)] lg:grid-cols-[9rem_minmax(0,1.2fr)_auto_minmax(0,1fr)] xl:gap-x-8"
  >
    <div
      class="flex min-w-0 items-center gap-3 sm:row-span-2 sm:flex-col sm:text-center lg:row-auto"
    >
      <picture class="w-24 shrink-0 sm:w-32">
        <source
          media="(prefers-reduced-motion: reduce)"
          srcset="/assets/images/avatar/komorisam.webp"
        />
        <img
          src="/assets/images/animates/wave.gif"
          alt=""
          width="208"
          height="208"
          loading="lazy"
          class="aspect-square w-full object-contain"
        />
      </picture>
    </div>

    <div class="min-w-0">
      <p
        class="mb-2 font-sans text-xs font-semibold tracking-widest text-primary uppercase"
        lang="en"
      >
        Behind the forest
      </p>

      <ScrollableContainer ref="typingScroll" class="-my-4 w-full min-w-0">
        <div
          class="w-full min-w-0 overflow-x-auto overflow-y-hidden py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <h2
            id="home-about-title"
            ref="typingHeading"
            :key="locale"
            :aria-label="
              translate('home.about.title', {
                name: locale === 'zh-CN' ? '小森' : 'コモリ(KoMori)',
              })
            "
            :style="{ '--count': aboutTitleUnits.length - 1 }"
            class="w-max animate-typing whitespace-nowrap pr-2 font-serif text-2xl font-bold leading-snug motion-reduce:animate-none motion-reduce:[--typed:var(--count)]"
          >
            <span
              v-for="(unit, index) in aboutTitleUnits"
              :key="index"
              :style="{ '--i': index }"
              class="relative"
              aria-hidden="true"
            >
              <span
                class="pointer-events-none absolute bottom-1 left-0 opacity-[clamp(0,1-max(var(--typed)-var(--i),var(--i)-var(--typed)),1)] motion-reduce:hidden"
              >
                <span
                  class="block h-[1em] w-[0.25em] animate-cursor-blink bg-base-content/50"
                ></span>
              </span>

              <span
                class="whitespace-pre"
                style="opacity: clamp(0, var(--typed) - var(--i), 1)"
              >
                <span
                  :class="
                    unit.type === 'ruby'
                      ? 'inline-block whitespace-nowrap'
                      : 'whitespace-pre'
                  "
                  style="opacity: clamp(0, var(--typed) - var(--i), 1)"
                >
                  <ruby
                    v-if="unit.type === 'ruby'"
                    lang="ja"
                    class="whitespace-nowrap"
                  >
                    小森<rp>（</rp><rt class="font-normal">コモリ</rt
                    ><rp>）</rp>
                  </ruby>
                  <template v-else>{{ unit.value }}</template>
                </span>
              </span>
            </span>
          </h2>
        </div>
      </ScrollableContainer>

      <p class="mt-3 text-sm text-pretty leading-6 text-base-content/70">
        {{ translate("home.about.intro") }}
      </p>
      <p class="mt-2 text-sm text-pretty leading-6 text-base-content/60">
        {{ translate("home.about.note") }}
      </p>
    </div>

    <div
      class="divider divider-horizontal hidden lg:flex"
      aria-hidden="true"
    ></div>

    <div class="@container/social min-w-0 sm:col-start-2 lg:col-start-4">
      <p class="mb-3 text-sm font-medium">
        {{ translate("home.about.contact") }}
      </p>
      <nav
        ref="socialNav"
        class="flex flex-wrap items-center justify-center gap-2 *:min-w-0 *:shrink-0 *:basis-[calc((100%_-_0.5rem)/2)] @min-[21rem]/social:*:basis-[calc((100%_-_1rem)/3)] @min-[34rem]/social:md:gap-2.5 @min-[34rem]/social:*:basis-[calc((100%_-_2.5rem)/5)] max-md:[&>:nth-child(-n+2)]:basis-[calc((100%_-_0.5rem)/2)] max-md:[&>:nth-child(n+3)]:basis-[calc((100%_-_1rem)/3)]"
        :aria-label="translate('home.about.contact')"
      >
        <div
          v-for="social in socials"
          :key="social.label"
          class="flex items-center"
          :class="
            social.aura
              ? 'aura text-[#00a1d6] before:[animation-play-state:var(--aura-play-state)] after:[animation-play-state:var(--aura-play-state)]'
              : ''
          "
          :style="
            social.aura
              ? {
                  '--aura-play-state':
                    auraVisible && !layoutMotionActive ? 'running' : 'paused',
                  animationPlayState: 'var(--aura-play-state)',
                }
              : undefined
          "
        >
          <a
            :href="social.href"
            target="_blank"
            rel="noopener noreferrer"
            :class="[socialButtonClass, social.color]"
          >
            <i
              :class="[
                social.icon,
                social.activeIcon
                  ? 'group-hover:hidden group-active:hidden'
                  : '',
              ]"
              aria-hidden="true"
            ></i>
            <i
              v-if="social.activeIcon"
              :class="social.activeIcon"
              class="hidden group-hover:block group-active:block"
              aria-hidden="true"
            ></i>
            {{
              social.label === "weibo" ? translate("home.weibo") : social.label
            }}
          </a>
        </div>
        <button
          type="button"
          class="btn-soft [--btn-color:#07c160] [--btn-fg:#000]"
          :class="socialButtonClass"
          popovertarget="home-wechat-qr"
          style="anchor-name: --home-wechat-anchor"
          aria-controls="home-wechat-qr"
        >
          <i
            class="ri-wechat-line group-hover:hidden group-active:hidden"
            aria-hidden="true"
          ></i>
          <i
            class="ri-wechat-fill hidden group-hover:block group-active:block"
            aria-hidden="true"
          ></i>
          {{ translate("home.wechat") }}
        </button>
      </nav>
      <div
        id="home-wechat-qr"
        popover="auto"
        class="dropdown dropdown-bottom dropdown-end mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
        style="position-anchor: --home-wechat-anchor"
      >
        <div
          role="img"
          :aria-label="translate('home.about.wechatQr')"
          class="mx-auto aspect-square w-40 max-w-full bg-base-content mask-contain mask-no-repeat mask-[url(/assets/images/profile/wechat.svg)]"
        ></div>
      </div>
      <p class="mt-3 text-xs text-pretty leading-relaxed text-base-content/50">
        {{ translate("home.contactHint") }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "@/i18n";
import { layoutMotionActive } from "@/composables/layout/useLayoutMotion";
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";

const { t: translate, locale } = useLocale();

const socialNav = ref(null);
const auraVisible = ref(false);

const typingScroll = ref(null);
const typingHeading = ref(null);

let socialObserver;
let typingFrame;
let previousHeading = null;
let previousTyped = -1;
let previousViewportWidth = 0;

const followTypingCursor = () => {
  const viewport = typingScroll.value?.viewport;
  const heading = typingHeading.value;

  if (viewport && heading) {
    if (heading !== previousHeading) {
      previousHeading = heading;
      previousTyped = -1;
      previousViewportWidth = 0;
      viewport.scrollLeft = 0;
    }

    const typed = Number.parseInt(
      getComputedStyle(heading).getPropertyValue("--typed"),
      10,
    );

    const viewportWidth = viewport.clientWidth;

    if (
      Number.isFinite(typed) &&
      (typed !== previousTyped || viewportWidth !== previousViewportWidth)
    ) {
      previousTyped = typed;
      previousViewportWidth = viewportWidth;

      if (
        typed === 0 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        viewport.scrollLeft = 0;
      } else {
        const cursorUnit = heading.children.item(typed);

        if (cursorUnit) {
          const cursorX =
            cursorUnit.getBoundingClientRect().left -
            viewport.getBoundingClientRect().left +
            viewport.scrollLeft;

          viewport.scrollLeft = Math.max(0, cursorX - viewportWidth * 0.75);
        }
      }
    }
  }

  typingFrame = requestAnimationFrame(followTypingCursor);
};

onMounted(() => {
  socialObserver = new IntersectionObserver(([entry]) => {
    auraVisible.value = entry.isIntersecting;
  });

  socialObserver.observe(socialNav.value);

  typingFrame = requestAnimationFrame(followTypingCursor);
});

onBeforeUnmount(() => {
  socialObserver?.disconnect();
  cancelAnimationFrame(typingFrame);
});

const aboutTitleUnits = computed(() => {
  const marker = "\uE000";
  const segmenter = new Intl.Segmenter(locale.value, {
    granularity: "grapheme",
  });

  const split = (text) =>
    Array.from(segmenter.segment(text), ({ segment }) => ({
      type: "text",
      value: segment,
    }));

  const [before = "", after = ""] = translate("home.about.title", {
    name: marker,
  }).split(marker);

  return [
    ...split(before),
    ...(locale.value === "zh-CN"
      ? [{ type: "ruby", value: "小森", reading: "コモリ" }]
      : split("コモリ(KoMori)")),
    ...split(after),
    { type: "end", value: "\u200B" },
  ];
});

const socialButtonClass =
  "btn btn-sm group h-9 min-h-9 w-full flex-nowrap gap-1.5 px-2 py-0 whitespace-nowrap [&>i]:shrink-0 @min-[34rem]/social:gap-2";

const socials = [
  {
    label: "GitHub",
    icon: "ri-github-fill",
    color:
      "btn-soft [--btn-color:#181717] [--btn-fg:#fff] [--btn-rest-fg:var(--color-base-content)]",
    href: "https://github.com/KoMoriSam",
  },
  {
    label: "Bilibili",
    icon: "ri-bilibili-line",
    color: "[--btn-color:#00a1d6] [--btn-fg:#000]",
    aura: true,
    href: "https://space.bilibili.com/71104942",
  },
  {
    label: "weibo",
    icon: "ri-weibo-line",
    activeIcon: "ri-weibo-fill",
    color: "btn-soft [--btn-color:#e6162d] [--btn-fg:#fff]",
    href: "https://weibo.com/u/5281976456",
  },
  {
    label: "QQ",
    icon: "ri-qq-line",
    activeIcon: "ri-qq-fill",
    color: "btn-soft [--btn-color:#12b7f5] [--btn-fg:#000]",
    href: "https://qm.qq.com/q/eYk72ol3qg",
  },
];
</script>
