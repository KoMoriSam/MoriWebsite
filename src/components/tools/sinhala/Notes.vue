<template>
    <article class="flex flex-col sm:flex-row gap-2 mt-6">
      <section class="min-w-0" aria-labelledby="sinhala-converter-note">
        <h2 id="sinhala-converter-note" class="font-serif text-lg font-bold">
          {{ translate('tools.notes.notes') }}
        </h2>
        <ol
          class="ms-4 list-decimal marker:font-serif text-sm leading-relaxed text-pretty text-base-content/75"
        >
          <li>
            {{ translate('tools.notes.legacyFontsUsuallyDoNotSupportStraightQuotesConversionReplaces') }}
          </li>
          <li>
            {{ translate('tools.notes.legacyFontsLackDedicatedAndConjunctsTheseAreExpandedTo') }}
          </li>
          <li>
            {{ translate('tools.notes.legacyFontsLackDedicatedAndGlyphsSoTheseCannotBe') }}
          </li>
          <li>
            {{ translate('tools.notes.theLegacyCodeForWorksOnlyInSomeFontsAnd') }}
          </li>
          <li>
            {{ translate('tools.notes.touchingLettersHaveNoDedicatedLegacyCodesConversionExpandsThem') }}
          </li>
          <li>
            {{ translate('tools.notes.unicodeDocumentsExportedInEitherModeUseSystemFontsRather') }}
          </li>
          <li>
            {{ translate('tools.notes.documentModeExtractsSelectableTextOnlyOriginalLayoutAndFormatting') }}
          </li>
        </ol>
      </section>

      <div class="divider sm:divider-horizontal"></div>

      <section class="min-w-0" aria-labelledby="sinhala-converter-feedback">
        <h2
          id="sinhala-converter-feedback"
          class="font-serif text-lg font-bold"
        >
          {{ translate('tools.notes.foundAConversionIssue') }}
        </h2>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          {{ translate('tools.notes.chooseAFeedbackMethod') }}
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
            <i class="ri-external-link-line" :aria-label="translate('tools.notes.openInNewTab')"></i>
          </a>
          <a :href="emailFeedbackUrl" class="btn">
            <i class="ri-mail-line" aria-hidden="true"></i>
            {{ translate('tools.notes.sendEmail') }}
          </a>
        </div>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          {{ translate('tools.notes.yourTextIsNotUploadedAutomaticallyPasteAReproducibleSample') }}
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
    get title() { return translate('tools.notes.bugSinhalaFontEncodingConverter'); },
    body: translate('tools.notes.feedbackTemplate'),
  },
)}`);
const emailFeedbackUrl = computed(() => `mailto:wishwaluo@gmail.com?${new URLSearchParams({
  get subject() { return translate('tools.notes.feedbackSinhalaFontEncodingConverter'); },
  body: translate('tools.notes.feedbackTemplate'),
})}`);
</script>
