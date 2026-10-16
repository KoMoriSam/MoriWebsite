<template>
  <div class="divider"></div>

  <article aria-labelledby="sinhala-font-about">
    <hgroup class="mb-4 md:mb-6">
      <h2 id="sinhala-font-about" class="font-serif text-lg font-bold">
        {{ translate("tools.info.aboutSinhalaLegacyFontEncodings") }}
      </h2>
      <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
        {{
          translate("tools.info.howDoLegacyEncodingsDifferFromStandardUnicode")
        }}
      </p>
    </hgroup>
    <section class="prose max-md:prose-sm max-w-none prose-p:text-justify">
      <p>
        {{
          translate(
            "tools.info.beforeWidespreadUnicodeSupportSinhalaFontsMappedGlyphsToAscii",
          )
        }}
      </p>

      <p>
        {{
          translate("tools.info.bothFontTypesCanDisplayTheSameSinhalaTextBut")
        }}
      </p>

      <!-- 编码转换 -->
      <div
        class="not-prose my-5 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center"
      >
        <!-- FM / DL -->
        <div
          class="min-w-0 rounded-box border border-base-300 bg-base-200/15 p-3 sm:p-4"
        >
          <div
            class="mb-1 flex items-center gap-2 text-xs text-base-content/75"
          >
            <i class="ri-file-text-line"></i>
            {{ translate("tools.info.legacyFontEncoding") }}
          </div>

          <div class="mt-2 w-full text-xl">
            <ul
              class="grid min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-stretch sm:gap-y-0"
            >
              <li class="contents">
                <span
                  class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                  >{{ translate("common.sections.default") }}</span
                >
                <p
                  class="min-w-0 text-left text-base text-base-content font-mono sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                >
                  › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                </p>
              </li>

              <li class="contents">
                <span
                  class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                >
                  FM Abhaya
                </span>
                <p
                  class="min-w-0 text-left text-base text-base-content font-abhaya-legacy sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                  lang="si"
                >
                  › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                </p>
              </li>

              <li class="contents">
                <span
                  class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                >
                  FM Gemunu
                </span>
                <p
                  class="min-w-0 text-left text-base text-base-content font-gemunu-legacy font-bold sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                  lang="si"
                >
                  › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                </p>
              </li>
            </ul>
          </div>

          <p
            class="mt-3 leading-relaxed text-sm text-base-content/75 text-justify text-pretty"
          >
            {{
              translate(
                "tools.info.theStoredDataIsAsciiWithoutTheCorrespondingFontThe",
              )
            }}
            <br />
            <small class="grid grid-cols-[auto_minmax(0,1fr)] items-start mt-2">
              <span>{{ translate("tools.info.note") }}</span>

              <span class="space-y-1">
                <span class="block">
                  {{
                    translate(
                      "tools.info.sinhalafontsNetHasFmAbhayaFmMalithiFmGemunuFm",
                    )
                  }}
                  <a
                    href="https://sinhalafonts.net/fm-sinhala-fonts/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="not-prose link link-primary link-hover"
                  >
                    {{ translate("tools.info.viewFmFontsOnSinhalafontsNet")
                    }}<i class="ri-arrow-right-up-line"></i>
                  </a>
                </span>
                <span class="block">
                  {{
                    translate(
                      "tools.info.pitakaLkProvidesUnicodeVersionsThatPreserveTraditionalFmDesigns",
                    )
                  }}
                  <a
                    href="https://pitaka.lk/tools/unicode/download_unicode.htm#id-un-abhaya"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="not-prose link link-primary link-hover"
                  >
                    {{ translate("tools.info.viewUnicodeFontsOnPitakaLk")
                    }}<i class="ri-arrow-right-up-line"></i>
                  </a>
                </span>
              </span>
            </small>
          </p>
        </div>

        <!-- 箭头 -->
        <i
          class="ri-arrow-up-down-line justify-self-center text-xl lg:-rotate-90"
          aria-hidden="true"
        ></i>

        <!-- Unicode -->
        <div
          class="min-w-0 rounded-box border border-base-300 bg-base-200/15 p-3 sm:p-4"
        >
          <div
            class="mb-1 flex items-center gap-2 text-xs text-base-content/70"
          >
            <i class="ri-code-s-slash-line"></i>
            {{ translate("tools.info.standardUnicodeFonts") }}
          </div>

          <ul
            class="grid min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-stretch sm:gap-y-0"
          >
            <li class="contents">
              <span
                class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
              >
                sans-serif
              </span>
              <p
                class="min-w-0 text-left text-base text-base-content font-sinhala-sans sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                lang="si"
              >
                ශ්‍රී ලංකාව ඉන්දියන් සාගරයේ පිහිටි දූපතකි.
              </p>
            </li>

            <li class="contents">
              <span
                class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
              >
                serif
              </span>
              <p
                class="min-w-0 text-left text-base text-base-content font-sinhala-serif sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                lang="si"
              >
                ශ්‍රී ලංකාව ඉන්දියන් සාගරයේ පිහිටි දූපතකි.
              </p>
            </li>
          </ul>

          <p
            class="mt-3 leading-relaxed text-sm text-base-content/75 text-justify text-pretty"
          >
            {{
              translate(
                "tools.info.modernOperatingSystemsUsuallyIncludeSinhalaFontsTheTextUses",
              )
            }}
            <br />
            <small class="grid grid-cols-[auto_minmax(0,1fr)] items-start mt-2">
              <span>{{ translate("tools.info.note") }}</span>
              <span>
                {{
                  translate(
                    "tools.info.defaultFontsVaryByOperatingSystemCommonChoicesAreListed",
                  )
                }}
                <ul class="ml-2.45 ps-0 space-y-1 list-[circle]">
                  <li>
                    <strong>Windows：</strong>
                    {{
                      translate(
                        "tools.info.nirmalaUiIsASansSerifUiFontForWindows",
                      )
                    }}
                  </li>

                  <li>
                    <strong>macOS / iOS：</strong>
                    {{
                      translate(
                        "tools.info.sinhalaSangamMnHasAModernUiStyleWhileSinhala",
                      )
                    }}
                  </li>

                  <li>
                    <strong>Android / AOSP：</strong>
                    {{
                      translate(
                        "tools.info.notoSansSinhalaIsUsuallyTheMainSinhalaFallbackNoto",
                      )
                    }}
                  </li>
                </ul>
              </span>
            </small>
          </p>
        </div>
      </div>
    </section>
  </article>

  <div class="divider"></div>

  <article aria-labelledby="sinhala-font-about">
    <hgroup class="mb-4 md:mb-6">
      <h2 id="sinhala-font-about" class="font-serif text-lg font-bold">
        {{ translate("tools.info.aboutTheSinhalaEncodingConverter") }}
      </h2>
      <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
        {{ translate("tools.info.whatDoesThisConverterDo") }}
      </p>
    </hgroup>
    <section class="prose max-md:prose-sm max-w-none prose-p:text-justify">
      <p>
        <strong>{{
          translate("pages.home.sinhalaFontEncodingConverter")
        }}</strong>
        {{
          translate(
            "tools.info.itConvertsTheStoredCharacterDataBetweenUnicodeAndLegacy",
          )
        }}
      </p>

      <p>
        {{
          translate(
            "tools.info.convertingLegacyTextToUnicodeRemovesItsDependenceOnA",
          )
        }}
      </p>

      <p>
        {{ translate("tools.info.thisIsNotAOneToOneAsciiSubstitutionLegacy") }}
      </p>

      <p>
        {{
          translate("tools.info.theExamplesBelowShowLegacyGlyphsOnTheLeftAnd")
        }}
      </p>

      <ConversionExamples @announcement="emit('announcement', $event)" />
    </section>
  </article>

  <div class="divider"></div>

  <details class="collapse collapse-arrow border border-base-300">
    <summary class="collapse-title">
      <hgroup
        class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2"
      >
        <i
          class="ri-information-line row-span-2 text-xl"
          aria-hidden="true"
        ></i>

        <h2 class="min-w-0 font-serif text-base font-bold sm:text-lg">
          {{ translate("tools.info.aboutTheFmFontsOnThisPage") }}
        </h2>

        <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
          {{
            translate("tools.info.areTheseOriginalFontsWhatAboutUsageRights")
          }}
        </p>
      </hgroup>
    </summary>

    <p
      class="collapse-content prose max-md:prose-sm max-w-none prose-p:text-justify"
    >
      {{
        translate(
          "tools.info.theLegacyEditorAndExamplesUseBuiltInCompatibleFonts",
        )
      }}<a
        href="/licenses"
        target="_blank"
        rel="noopener noreferrer"
        class="not-prose link link-primary link-hover"
        >{{ translate("tools.info.thirdPartyLicenses")
        }}<i class="ri-arrow-right-up-line"></i></a
      >{{
        translate(
          "tools.info.theySimulateLegacyCharacterMappingsAndAreNotTheOriginal",
        )
      }}
    </p>
  </details>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { t: translate } = useLocale();

import ConversionExamples from "./ConversionExamples.vue";

const emit = defineEmits(["announcement"]);
</script>
