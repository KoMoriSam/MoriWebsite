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
      <router-link class="btn btn-xs no-underline my-2 sm:my-5" to="/changelog">
        <i class="ri-history-line"></i>
        <span>更新日志</span>
      </router-link>
      <small class="text-sm"> KoMoriSam © 2025 </small>
    </aside>
    <nav>
      <h6 class="footer-title">社交帐号</h6>
      <div class="grid grid-flow-col gap-4">
        <a href="https://github.com/KoMoriSam">
          <i class="ri-github-fill text-2xl"></i>
        </a>
        <a href="https://space.bilibili.com/71104942">
          <i class="ri-bilibili-fill text-2xl"></i>
        </a>
        <a href="https://weibo.com/u/5281976456">
          <i class="ri-weibo-fill text-2xl"></i>
        </a>
      </div>
      <br />
      <small class="text-xs lg:text-sm text-base-content/50">
        <span>
          在找旧版网页？
          <a
            class="link link-primary no-underline hover:underline"
            href="/archive/home/index.html"
            target="_blank"
          >
            这里跳转
            <i class="ri-arrow-right-up-line"></i>
          </a>
        </span>
      </small>
    </nav>
  </footer>
</template>
