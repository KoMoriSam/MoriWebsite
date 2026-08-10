<template>
  <footer
    class="footer sm:footer-horizontal bg-base-200 text-base-content p-10"
  >
    <aside>
      <img
        src="/assets/images/titles/welcome.webp"
        alt="welcome!"
        class="h-6"
      />
      <p class="leading-relaxed">
        远方之森&#8197;|&#8197;个人博客与独立开发
        <br />
        © 2025–2026 KoMoriSam
      </p>
      <small class="text-xs text-base-content/50">
        <router-link class="link link-hover block my-2" to="/changelog">
          更新日志
          <i class="ri-arrow-right-line"></i>
        </router-link>
        <router-link class="link link-hover block my-2" to="/licenses">
          开源许可与第三方声明
          <i class="ri-arrow-right-line"></i>
        </router-link>
      </small>
    </aside>
    <nav>
      <h6 class="footer-title">社交帐号</h6>
      <address class="grid grid-flow-col gap-4">
        <a href="https://github.com/KoMoriSam">
          <i class="ri-github-fill text-2xl"></i>
        </a>
        <a href="https://space.bilibili.com/71104942">
          <i class="ri-bilibili-fill text-2xl"></i>
        </a>
        <a href="https://weibo.com/u/5281976456">
          <i class="ri-weibo-fill text-2xl"></i>
        </a>
      </address>
      <br />
      <small class="text-xs text-base-content/50">
        在找旧版网页？
        <a
          class="link link-primary no-underline hover:underline"
          href="/archive/home/index.html"
          target="_blank"
        >
          这里跳转
          <i class="ri-arrow-right-up-line"></i>
        </a>
      </small>
    </nav>
  </footer>
</template>
