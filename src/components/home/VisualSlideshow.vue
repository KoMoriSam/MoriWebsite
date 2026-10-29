<template>
  <figure ref="slideshow">
    <div
      class="relative mx-3 @min-[30rem]/entrance:flex @min-[30rem]/entrance:min-h-0 @min-[30rem]/entrance:flex-col"
    >
      <div
        class="photo-frame @min-[30rem]/entrance:border-8 @min-[30rem]/entrance:flex @min-[30rem]/entrance:min-h-0 @min-[30rem]/entrance:flex-col"
      >
        <div
          class="relative aspect-4/5 bg-primary/10 @min-[30rem]/entrance:min-h-0"
          :aria-busy="!loaded.has(current)"
        >
          <client-only>
            <div
              v-if="!loaded.has(current)"
              class="skeleton absolute inset-0 rounded-none"
              aria-hidden="true"
            ></div>
          </client-only>
          <div
            v-for="(slide, index) in slides"
            :key="slide.src"
            :aria-hidden="index !== current"
            class="absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
            :class="index === current ? 'opacity-100' : 'opacity-0'"
          >
            <img
              v-if="requested.has(index)"
              v-fade-in
              v-bind="
                getImageAttrs(
                  slide.src,
                  '(min-width: 1024px) 400px, (min-width: 768px) 50vw, 60vw',
                )
              "
              :alt="
                [
                  translate(`${slide.captionKey}.location`),
                  translate(`${slide.captionKey}.description`),
                  slide.year,
                ].join(' · ')
              "
              :data-slide-index="index"
              :fetchpriority="index === 0 ? 'high' : 'low'"
              loading="eager"
              decoding="async"
              class="absolute inset-0 size-full object-cover object-[43%_center]"
              @load="handleSlideLoad"
              @error="handleSlideError"
            />
          </div>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/55 to-transparent"
          ></div>
          <time
            :datetime="localClock.datetime"
            lang="en"
            class="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 text-white drop-shadow-sm @min-[30rem]/entrance:bottom-6 @min-[30rem]/entrance:left-6"
          >
            <span
              class="text-xs font-kai font-medium tracking-widest text-white/80 @min-[30rem]/entrance:text-base"
            >
              {{ translate("home.hero.time.now") }}
            </span>
            <span
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              :aria-label="localClock.time"
              class="inline-flex items-baseline gap-0.5 font-mono text-lg leading-none font-black tabular-nums @min-[30rem]/entrance:text-3xl @min-[60rem]/entrance:text-4xl"
            >
              <template v-if="localNow">
                <template v-for="(unit, index) in clockUnits" :key="unit">
                  <span
                    v-if="index > 0"
                    aria-hidden="true"
                    class="text-white/65"
                    >:</span
                  >
                  <span
                    class="countdown [--digits:2] motion-reduce:[&>span]:transition-none motion-reduce:[&>span::before]:transition-none motion-reduce:[&>span::after]:transition-none"
                    aria-hidden="true"
                  >
                    <span :style="{ '--value': localClock[unit] }">{{
                      localClock[unit]
                    }}</span>
                  </span>
                </template>
                <span
                  aria-hidden="true"
                  class="ml-1 text-[0.35em] font-normal text-white/80"
                  >{{ localClock.period }}</span
                >
              </template>
              <span v-else aria-hidden="true">--:--:--</span>
            </span>
            <span
              class="font-serif text-[0.625rem] leading-relaxed tracking-wide text-white/80 italic @min-[30rem]/entrance:text-xs"
              >{{ localClock.date }}, {{ localClock.year }}</span
            >
          </time>
        </div>
      </div>
      <picture
        class="absolute right-0 bottom-2 z-20 size-16 @min-[30rem]/entrance:size-20 @min-[60rem]/entrance:size-28"
      >
        <source
          media="(prefers-reduced-motion: reduce)"
          srcset="/assets/images/avatar/komorisam.webp"
        />
        <img
          src="/assets/images/animates/happyHeart.gif"
          :alt="translate('home.hero.characterAlt')"
          width="128"
          height="128"
          class="size-full object-contain"
        />
      </picture>
    </div>
    <figcaption
      class="mt-2 grid min-w-0 shrink-0 px-2 text-center sm:px-8 sm:text-right"
    >
      <div
        v-for="(slide, index) in slides"
        :key="slide.src"
        :aria-hidden="index !== current"
        :inert="index !== current"
        class="flex min-w-0 flex-col gap-1 self-start [grid-area:1/1] transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
        :class="index === current ? 'opacity-100' : 'opacity-0'"
      >
        <p
          class="font-serif text-xs leading-relaxed text-balance text-base-content/75 sm:text-sm"
        >
          {{ translate(`${slide.captionKey}.description`) }}
        </p>
        <p
          class="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[0.625rem] leading-relaxed sm:justify-end sm:text-xs"
        >
          <span
            class="inline-flex items-center gap-1 font-medium text-base-content/55"
          >
            <i class="ri-map-pin-2-fill text-primary/70" aria-hidden="true"></i>
            {{ translate(`${slide.captionKey}.location`) }}
          </span>
          <time
            :datetime="String(slide.year)"
            class="inline-flex items-center gap-1 font-mono tabular-nums text-base-content/40"
          >
            <i class="ri-calendar-fill" aria-hidden="true"></i>
            {{ slide.year }}
          </time>
        </p>
      </div>
    </figcaption>
  </figure>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import { useLocale } from "@/i18n";
import { getImageAttrs } from "@/utils/images/responsive-images";

const { t: translate } = useLocale();
const slideshow = ref(null);
const current = ref(0);
const localNow = ref(null);
const clockUnits = ["hours", "minutes", "seconds"];
const loaded = reactive(new Set());
const requested = reactive(new Set([0]));
const failed = new Set();
let preloadNext = () => {};
let refreshPlayback = () => {};
async function handleSlideLoad(event) {
  const image = event.currentTarget;
  const index = Number(image.dataset.slideIndex);
  try {
    await image.decode();
  } catch {
    if (!image.naturalWidth) {
      handleSlideError({ currentTarget: image });
      return;
    }
  }
  if (!image.isConnected) return;
  loaded.add(index);
  failed.delete(index);
  preloadNext();
  refreshPlayback();
}
function handleSlideError(event) {
  const image = event.currentTarget;
  // A responsive-image fallback may already be loading its original source.
  if (image.complete && !image.naturalWidth) {
    const index = Number(image.dataset.slideIndex);
    loaded.delete(index);
    failed.add(index);
    preloadNext();
    refreshPlayback();
  }
}
const slides = [
  {
    src: "/assets/images/banners/ginkgo_leaves.jpg",
    captionKey: "home.hero.photos.ginkgo",
    year: 2023,
  },
  {
    src: "/assets/images/banners/bell_tower.jpg",
    captionKey: "home.hero.photos.bellTower",
    year: 2023,
  },
  {
    src: "/assets/images/banners/pavilion.jpg",
    captionKey: "home.hero.photos.pavilion",
    year: 2023,
  },
  {
    src: "/assets/images/banners/observatory.jpg",
    captionKey: "home.hero.photos.observatory",
    year: 2023,
  },
  {
    src: "/assets/images/banners/lake_side.jpg",
    captionKey: "home.hero.photos.lakeSide",
    year: 2023,
  },
  {
    src: "/assets/images/banners/playground_lawn.jpg",
    captionKey: "home.hero.photos.playgroundLawn",
    year: 2023,
  },
  {
    src: "/assets/images/banners/university_road.jpg",
    captionKey: "home.hero.photos.universityRoad",
    year: 2023,
  },
  {
    src: "/assets/images/banners/a_corner_of_zhongshan_park.jpg",
    captionKey: "home.hero.photos.zhongshanPark",
    year: 2024,
  },
  {
    src: "/assets/images/banners/beijing_hutong.jpg",
    captionKey: "home.hero.photos.beijingHutong",
    year: 2024,
  },
  {
    src: "/assets/images/banners/bfsu_library.jpg",
    captionKey: "home.hero.photos.bfsuLibrary",
    year: 2026,
  },
  {
    src: "/assets/images/banners/boating_in_beihai_park.jpg",
    captionKey: "home.hero.photos.beihaiBoating",
    year: 2024,
  },
  {
    src: "/assets/images/banners/pavilion_in_jingshan_park.jpg",
    captionKey: "home.hero.photos.jingshanPavilion",
    year: 2024,
  },
  {
    src: "/assets/images/banners/tiananmen_slogans.jpg",
    captionKey: "home.hero.photos.tiananmenSlogans",
    year: 2024,
  },
  {
    src: "/assets/images/banners/white_pagoda_in_beihai_park.jpg",
    captionKey: "home.hero.photos.beihaiPagoda",
    year: 2024,
  },
];
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const pad = (value) => String(value).padStart(2, "0");
const localClock = computed(() => {
  const now = localNow.value;
  if (!now)
    return {
      datetime: undefined,
      year: "----",
      date: "—",
      time: "--:--:--",
      hours: 0,
      minutes: 0,
      seconds: 0,
      period: "",
    };
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = pad(now.getDate());
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const hours = now.getHours() % 12 || 12;
  const period = now.getHours() < 12 ? "AM" : "PM";
  const offset = -now.getTimezoneOffset();
  const zone = `${offset < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return {
    datetime: `${year}-${pad(month + 1)}-${day}T${time}${zone}`,
    year,
    date: `${months[month]} ${day}`,
    time: `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${period}`,
    hours,
    period,
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
});
let dispose = () => {};

onMounted(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let active = true;
  let inView = false;
  let timer;
  let clockTimer;
  let preloadIdle;
  let preloadTimer;
  let displayFrame;
  let shownIndex;
  let waitingIndex;
  let timeLeft = 6000;
  let startedAt;
  function shuffle(indices) {
    for (let index = indices.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [indices[index], indices[other]] = [indices[other], indices[index]];
    }
    return indices;
  }
  // The opening ginkgo photo has already occupied the first round's first slot.
  let remaining = shuffle(slides.map((_, index) => index).slice(1));

  function nextSlide() {
    remaining = remaining.filter((index) => !failed.has(index));
    if (!remaining.length) {
      remaining = shuffle(
        slides.map((_, index) => index).filter((index) => !failed.has(index)),
      );
      if (remaining.length > 1 && remaining[0] === current.value) {
        remaining.push(remaining.shift());
      }
    }
    return remaining[0] !== current.value ? remaining[0] : undefined;
  }

  function cancelPreload() {
    if (preloadIdle !== undefined) window.cancelIdleCallback(preloadIdle);
    clearTimeout(preloadTimer);
    preloadIdle = undefined;
    preloadTimer = undefined;
  }

  function schedulePreload() {
    if (
      !active ||
      !inView ||
      document.hidden ||
      reducedMotion.matches ||
      document.readyState !== "complete" ||
      (!loaded.has(current.value) && !failed.has(current.value)) ||
      preloadIdle !== undefined ||
      preloadTimer !== undefined
    )
      return;
    const next = nextSlide();
    if (next === undefined || requested.has(next)) return;
    const load = () => {
      preloadIdle = undefined;
      preloadTimer = undefined;
      if (!active || !inView || document.hidden || reducedMotion.matches)
        return;
      requested.add(next);
    };
    if (window.requestIdleCallback) {
      preloadIdle = window.requestIdleCallback(load, { timeout: 1500 });
    } else {
      preloadTimer = setTimeout(load, 250);
    }
  }
  preloadNext = schedulePreload;

  function syncClock() {
    clearTimeout(clockTimer);
    if (!active || document.hidden) return;
    localNow.value = new Date();
    if (inView) clockTimer = setTimeout(syncClock, 1000 - (Date.now() % 1000));
  }
  syncClock();

  slideshow.value.querySelectorAll("img[data-slide-index]").forEach((image) => {
    if (!image.complete) return;
    if (image.naturalWidth) handleSlideLoad({ currentTarget: image });
    else handleSlideError({ currentTarget: image });
  });

  function pausePlayback() {
    clearTimeout(timer);
    if (startedAt !== undefined) {
      timeLeft = Math.max(0, timeLeft - (performance.now() - startedAt));
      startedAt = undefined;
    }
  }

  function waitForDisplay(index) {
    if (waitingIndex === index) return;
    waitingIndex = index;
    nextTick(() => {
      if (!active || current.value !== index) return;
      displayFrame = requestAnimationFrame(() => {
        displayFrame = undefined;
        const image = slideshow.value?.querySelector(
          `img[data-slide-index="${index}"]`,
        );
        if (!image) {
          if (waitingIndex === index) waitingIndex = undefined;
          return;
        }
        const animations = [image.parentElement, image].flatMap((element) =>
          element.getAnimations(),
        );
        Promise.allSettled(
          animations.map((animation) => animation.finished),
        ).then(() => {
          if (!active || current.value !== index) return;
          waitingIndex = undefined;
          if (!loaded.has(index)) return;
          shownIndex = index;
          syncPlayback();
        });
      });
    });
  }

  function syncPlayback() {
    pausePlayback();
    if (!active || !inView || document.hidden || reducedMotion.matches) {
      cancelPreload();
      return;
    }
    schedulePreload();
    if (slideshow.value.matches(":hover, :focus-within")) return;
    if (!failed.has(current.value)) {
      if (!loaded.has(current.value)) return;
      if (shownIndex !== current.value) {
        waitForDisplay(current.value);
        return;
      }
    }
    if (timeLeft <= 0 || failed.has(current.value)) {
      const next = nextSlide();
      if (next === undefined || !loaded.has(next)) {
        schedulePreload();
        return;
      }
      remaining.shift();
      current.value = next;
      timeLeft = 6000;
      shownIndex = undefined;
      waitingIndex = undefined;
      syncPlayback();
      return;
    }
    startedAt = performance.now();
    timer = setTimeout(() => {
      startedAt = undefined;
      timeLeft = 0;
      syncPlayback();
    }, timeLeft);
  }
  refreshPlayback = syncPlayback;

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
    syncClock();
  });
  observer.observe(slideshow.value);
  const element = slideshow.value;
  const events = ["pointerenter", "pointerleave", "focusin", "focusout"];
  const syncAfterFocus = () => queueMicrotask(syncPlayback);
  events.forEach((event) => element.addEventListener(event, syncAfterFocus));
  document.addEventListener("visibilitychange", syncPlayback);
  document.addEventListener("visibilitychange", syncClock);
  reducedMotion.addEventListener("change", syncPlayback);
  window.addEventListener("load", schedulePreload, { once: true });

  dispose = () => {
    active = false;
    preloadNext = () => {};
    refreshPlayback = () => {};
    cancelPreload();
    pausePlayback();
    cancelAnimationFrame(displayFrame);
    clearTimeout(clockTimer);
    observer.disconnect();
    events.forEach((event) =>
      element.removeEventListener(event, syncAfterFocus),
    );
    document.removeEventListener("visibilitychange", syncPlayback);
    document.removeEventListener("visibilitychange", syncClock);
    reducedMotion.removeEventListener("change", syncPlayback);
    window.removeEventListener("load", schedulePreload);
  };
});

onBeforeUnmount(() => dispose());
</script>
