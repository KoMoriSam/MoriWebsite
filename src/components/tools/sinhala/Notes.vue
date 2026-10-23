<template>
    <article class="flex flex-col sm:flex-row gap-2 mt-6">
      <section class="min-w-0" aria-labelledby="sinhala-converter-note">
        <h2 id="sinhala-converter-note" class="font-serif text-lg font-bold">
          {{ translate('sinhala.notes.title') }}
        </h2>
        <ol
          class="ms-4 list-decimal marker:font-serif text-sm leading-relaxed text-pretty text-base-content/75"
        >
          <li>
            {{ translate('sinhala.notes.quotes') }}
          </li>
          <li>
            {{ translate('sinhala.notes.vowelCodes') }}
          </li>
          <li>
            {{ translate('sinhala.notes.missingGlyphs') }}
          </li>
          <li>
            {{ translate('sinhala.notes.partialSupport') }}
          </li>
          <li>
            {{ translate('sinhala.notes.touchingLetters') }}
          </li>
          <li>
            {{ translate('sinhala.notes.exportFonts') }}
          </li>
          <li>
            {{ translate('sinhala.notes.documentLayout') }}
          </li>
        </ol>
      </section>

      <div class="divider sm:divider-horizontal"></div>

      <section class="min-w-0" aria-labelledby="sinhala-converter-feedback">
        <h2
          id="sinhala-converter-feedback"
          class="font-serif text-lg font-bold"
        >
          {{ translate('sinhala.notes.feedbackTitle') }}
        </h2>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          {{ translate('sinhala.notes.feedbackHint') }}
        </p>
        <div class="flex flex-wrap sm:flex-col lg:flex-row gap-2 mt-1 mb-2">
          <a
            :href="githubIssueUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary"
          >
            <i class="ri-github-fill" aria-hidden="true"></i>
            GitHub Issue
            <i class="ri-external-link-line" :aria-label="translate('sinhala.notes.openInNewTab')"></i>
          </a>
          <a :href="emailFeedbackUrl" class="btn">
            <i class="ri-mail-line" aria-hidden="true"></i>
            {{ translate('sinhala.notes.sendEmail') }}
          </a>
        </div>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          {{ translate('sinhala.notes.privacyHint') }}
        </p>
      </section>
    </article>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();
import { computed } from "vue";

const githubIssueUrl = computed(() => `https://github.com/KoMoriSam/MoriWebsite/issues/new?${new URLSearchParams(
  {
    get title() { return translate('sinhala.notes.issueTitle'); },
    body: translate('sinhala.notes.feedbackTemplate'),
  },
)}`);
const emailFeedbackUrl = computed(() => `mailto:wishwaluo@gmail.com?${new URLSearchParams({
  get subject() { return translate('sinhala.notes.emailSubject'); },
  body: translate('sinhala.notes.feedbackTemplate'),
})}`);
</script>
