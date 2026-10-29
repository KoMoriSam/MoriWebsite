<template>
  <section class="min-w-0 pb-6" :aria-label="t('games.entryTitle')">
    <div class="grid min-w-0 gap-6 lg:grid-cols-12">
      <div
        class="col-span-full min-w-0 lg:col-span-6 lg:col-start-7 lg:min-h-96 lg:pb-4"
      >
        <section
          data-entry-surface
          class="@container/entry-form min-w-0"
          :aria-label="t('games.entryTitle')"
        >
          <slot name="form"></slot>
        </section>
        <div data-entry-follow class="flow-root">
          <div class="divider" aria-hidden="true"></div>
          <section class="min-w-0"><slot name="instructions"></slot></section>
          <aside
            class="mt-5 flex min-w-0 items-start gap-2 text-xs leading-6 text-pretty text-base-content/55"
          >
            <i
              class="ri-shield-keyhole-line shrink-0 text-base text-primary"
              aria-hidden="true"
            ></i>
            <p>{{ t("games.reconnectHint") }}</p>
          </aside>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { t } = useLocale();
</script>
