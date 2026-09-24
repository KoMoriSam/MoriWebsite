<template>
    <div class="divider"></div>

    <article aria-labelledby="sinhala-font-about">
      <hgroup class="mb-4 md:mb-6">
        <h2 id="sinhala-font-about" class="font-serif text-lg font-bold">
          关于僧伽罗语传统字体编码
        </h2>
        <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
          传统字体编码与标准 Unicode 有什么区别？
        </p>
      </hgroup>
      <section class="prose max-md:prose-sm max-w-none prose-p:text-justify">
        <p>
          在僧伽罗语数字化早期，由于计算机系统尚未普遍支持 Unicode，
          许多字体通过 ASCII 字符位置映射僧伽罗文字形。FM Abhaya、FM
          Malithi、DL-Manel 等都属于这类传统非 Unicode
          字体。这种编码方式至今仍可见于文档、报刊排版文件和电子资料中。
        </p>

        <p>
          传统字体和 Unicode
          字体在屏幕上都可以呈现相同的僧伽罗语内容，但保存方式并不相同。传统字体编码保存的是映射到特定字形的
          ASCII 字符，而 Unicode
          保存的则是标准僧伽罗语字符。因此，传统编码文本在缺少对应字体时可能显示为英文字母或符号，并且难以直接用于搜索、文本分析、机器翻译和自然语言处理。
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
              传统字体编码
            </div>

            <div class="mt-2 w-full text-xl">
              <ul
                class="grid min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-stretch sm:gap-y-0"
              >
                <li class="contents">
                  <span
                    class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                  >
                    Default
                  </span>
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
                    class="min-w-0 text-left text-base text-base-content font-[Gemunu_Legacy] font-bold sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
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
              实际保存的是 ASCII
              字符，在缺少相应字体的环境中，会直接显示底层字符，因此需要配合对应的传统字体才能显示为僧伽罗文字形。
              <br />
              <small
                class="grid grid-cols-[auto_minmax(0,1fr)] items-start mt-2"
              >
                <span>注：</span>

                <span class="space-y-1">
                  <span class="block">
                    如需查找传统 FM 字体，可参考 SinhalaFonts.net 的 FM
                    字体专区，其中收录了 FM Abhaya、FM Malithi、FM Gemunu、FM
                    Bindumathi
                    等多种常用字体，并提供字体预览和字体包下载。第三方网站提供下载并不代表相关字体采用开放许可，实际使用时仍应以各字体自身的授权条款为准。
                    <a
                      href="https://sinhalafonts.net/fm-sinhala-fonts/"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="not-prose link link-primary link-hover"
                    >
                      前往 SinhalaFonts.net 查看 FM 字体<i
                        class="ri-arrow-right-up-line"
                      ></i>
                    </a>
                  </span>
                  <span class="block">
                    若希望继续使用 FM 系列的传统字形，同时兼容标准 Unicode
                    文本，可参考 Pitaka.lk 提供的 Unicode
                    字体版本。该项目在保留相关传统字体设计的基础上制作了可用于
                    Unicode
                    僧伽罗语文本的字体，并提供下载安装。当然，将这些字体用于商业用途仍需获取相应的授权许可。
                    <a
                      href="https://pitaka.lk/tools/unicode/download_unicode.htm#id-un-abhaya"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="not-prose link link-primary link-hover"
                    >
                      前往 Pitaka.lk 查看 Unicode 字体<i
                        class="ri-arrow-right-up-line"
                      ></i>
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
              标准 Unicode 字体
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
              如上所示，现代操作系统通常已提供可用于显示僧伽罗语的字体，字体中实际保存的是标准
              Unicode 僧伽罗语字符，字符本身具有明确语义。
              <br />
              <small
                class="grid grid-cols-[auto_minmax(0,1fr)] items-start mt-2"
              >
                <span>注：</span>
                <span>
                  系统默认字体会因操作系统而异，常见对应如下。
                  <ul class="ml-2.45 ps-0 space-y-1 list-[circle]">
                    <li>
                      <strong>Windows：</strong>
                      Nirmala UI 为无衬线 / UI 风格字体（Windows 8
                      及以上）；Iskoola Pota 则更接近传统正文 / 衬线风格，为早期
                      Windows 的僧伽罗语默认字体。自 Windows 10 起，Iskoola Pota
                      作为僧伽罗语补充字体提供，安装相应语言支持后通常会一并安装。
                    </li>

                    <li>
                      <strong>macOS / iOS：</strong>
                      Sinhala Sangam MN 偏现代无衬线 / UI 风格，Sinhala MN
                      偏传统正文风格。Apple
                      在系统中同时提供这两套僧伽罗语字体，但并未明确将它们定义为一组
                      serif / sans-serif 系统回退字体。
                    </li>

                    <li>
                      <strong>Android / AOSP：</strong>
                      Noto Sans Sinhala
                      为无衬线字体，通常用于僧伽罗语的主要系统回退；Noto Serif
                      Sinhala 为衬线字体，并在 AOSP 字体配置中明确作为 serif
                      回退字体。不同 Android
                      厂商可能调整系统字体配置，因此实际使用的字体可能有所不同。
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
          关于僧伽罗字体编码转换器
        </h2>
        <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
          这个转换器可以做什么？
        </p>
      </hgroup>
      <section class="prose max-md:prose-sm max-w-none prose-p:text-justify">
        <p>
          <strong>僧伽罗字体编码转换器</strong>
          用于在 Unicode 与传统字体编码之间转换文本实际保存的字符数据。
        </p>

        <p>
          将传统字体编码转换为 Unicode
          后，文本即可脱离特定旧字体，作为真正的僧伽罗语文本使用，更便于网页显示、数据库存储、全文搜索、复制粘贴、机器翻译及自然语言处理。反向转换则可将
          Unicode 文本重新编码为传统字体所使用的 ASCII 字符序列，以兼容仍依赖
          FM、DL 等旧式字体的排版软件、历史文档和既有工作流程。
        </p>

        <p>
          与网络上常见的简单编码替换工具不同，本转换器并不是将 ASCII 字符与
          Unicode
          字符逐一对应替换。传统僧伽罗字体往往按照字形的视觉位置和排版顺序保存字符，而
          Unicode
          则按照文字的逻辑组成顺序编码。因此，转换过程中需要识别辅音、元音附标、连接符、简写形式及合写字形之间的关系，重新组合字符顺序；反向转换时，则需要再次生成传统字体排版所要求的字形编码序列。
        </p>

        <p>
          转换器主要处理以下情况。每组示例左侧为 Legacy 字形，右侧为对应的
          Unicode 文本；点击“显示底层编码”可查看左侧使用的字符。
        </p>

        <button
          type="button"
          class="not-prose btn btn-ghost btn-xs mb-2 ml-auto flex"
          :class="{ 'btn-active': showExampleEncodings }"
          :aria-pressed="showExampleEncodings"
          aria-controls="sinhala-converter-examples"
          :title="showExampleEncodings ? '显示字形' : '显示底层编码'"
          @click="toggleExampleEncodings"
        >
          <i class="ri-code-line" aria-hidden="true"></i>
          {{ showExampleEncodings ? "显示字形" : "显示底层编码" }}
        </button>

        <div
          id="sinhala-converter-examples"
          class="grid grid-cols-1 gap-x-6 md:grid-cols-2"
        >
          <ul class="mt-0 max-md:mb-0!">
            <li>
              <strong>元音附标</strong>
              <br />
              处理元音附标在 Legacy 编码中的位置，并还原 Unicode 字符顺序。
              <p class="not-prose font-serif text-base-content/70">
                常见元音：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{ exampleText(exampleSamples.vowelMarks, "legacy") }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{ exampleText(exampleSamples.vowelMarks, "unicode") }}
                  </span>
                </span>
              </p>
              <p class="not-prose font-serif text-base-content/70">
                变形与叠加：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{
                      exampleText(exampleSamples.stackedVowelMarks, "legacy")
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{
                      exampleText(exampleSamples.stackedVowelMarks, "unicode")
                    }}
                  </span>
                </span>
              </p>
            </li>
            <li>
              <strong>合写字与特殊字形</strong>
              <br />
              识别合写字、鼻音前置辅音；启用紧凑字形选项后，还可输出 ද
              的专用字形。
              <p class="not-prose font-serif text-base-content/70">
                合写字：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{ exampleText(exampleSamples.ligatures, "legacy") }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{ exampleText(exampleSamples.ligatures, "unicode") }}
                  </span>
                </span>
              </p>
              <p class="not-prose font-serif text-base-content/70">
                鼻音前置辅音：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{
                      exampleText(
                        exampleSamples.prenasalizedConsonants,
                        "legacy",
                      )
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{
                      exampleText(
                        exampleSamples.prenasalizedConsonants,
                        "unicode",
                      )
                    }}
                  </span>
                </span>
              </p>
              <p class="not-prose font-serif text-base-content/70">
                紧凑字形（需启用选项）：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{
                      exampleText(
                        exampleSamples.compactDaForms,
                        "legacy",
                        compactDaExampleLegacy,
                      )
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya font-features-['ss01']" lang="si">
                    {{ exampleText(exampleSamples.compactDaForms, "unicode") }}
                  </span>
                </span>
              </p>
            </li>
          </ul>
          <ul class="mt-0 max-md:mt-0!">
            <li>
              <strong>辅音简写与连接</strong>
              <br />
              识别后置 ය、下置 ර、上置 ර 等由消音符和连接符组成的字形。
              <p class="not-prose font-serif text-base-content/70">
                后置 ය、下置 ර、上置 ර：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{ exampleText(exampleSamples.consonantForms, "legacy") }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{ exampleText(exampleSamples.consonantForms, "unicode") }}
                  </span>
                </span>
              </p>
            </li>
            <li>
              <strong>支持僧语与非僧语混写的 Legacy 文本</strong>
              <br />
              只转换僧伽罗语片段，保留同一段文本中的英文、数字等内容。
              <p class="not-prose font-serif text-base-content/70">
                僧语、英文与数字混排：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    v-for="(segment, index) in mixedExampleSegments"
                    :key="index"
                    :class="
                      showExampleEncodings
                        ? 'font-mono'
                        : segment.useLegacyFont
                          ? 'font-abhaya-legacy'
                          : 'font-abhaya'
                    "
                    >{{ segment.text }}</span
                  >
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{ exampleSamples.mixedText }}
                  </span>
                </span>
              </p>
            </li>
            <li>
              <strong>旧文档中的非标准字形顺序</strong>
              <br />
              同一个字形在旧文档中可能有不同的输入顺序；转换后统一为相同的
              Unicode 字符序列。
              <p class="not-prose font-serif text-base-content/70">
                下置 ර 与元音附标的顺序：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{
                      exampleText(
                        exampleSamples.nonstandardOrderUnicode,
                        "legacy",
                        exampleSamples.nonstandardOrderLegacy,
                      )
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{
                      exampleText(
                        exampleSamples.nonstandardOrderUnicode,
                        "unicode",
                        exampleSamples.nonstandardOrderLegacy,
                      )
                    }}
                  </span>
                </span>
              </p>
              <p class="not-prose font-serif text-base-content/70">
                下置 ර 与消音符的顺序：
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">FM Abhaya</span>
                  <span
                    :class="
                      showExampleEncodings ? 'font-mono' : 'font-abhaya-legacy'
                    "
                  >
                    {{
                      exampleText(
                        exampleSamples.nonstandardViramaUnicode,
                        "legacy",
                        exampleSamples.nonstandardViramaLegacy,
                      )
                    }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="badge badge-xs font-mono">Abhaya Libre</span>
                  <span class="font-abhaya" lang="si">
                    {{ exampleSamples.nonstandardViramaUnicode }}
                  </span>
                </span>
              </p>
            </li>
          </ul>
        </div>
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
            关于本页面所使用的 FM 字体
          </h2>

          <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
            是否为原版字体？是否有版权/使用权风险？
          </p>
        </hgroup>
      </summary>

      <p
        class="collapse-content prose max-md:prose-sm max-w-none prose-p:text-justify"
      >
        Legacy 编辑区与编码简介中的字形预览使用基于 Abhaya Libre 和 Gemunu Libre
        制作的内置传统编码兼容字体（详见<a
          href="/licenses"
          target="_blank"
          rel="noopener noreferrer"
          class="not-prose link link-primary link-hover"
          >第三方协议<i class="ri-arrow-right-up-line"></i></a
        >），仅用于模拟 Legacy 字体的字符映射效果，并非原版 FM Abhaya / Gemunu
        字体。
      </p>
    </details>
</template>

<script setup>
import { ref } from "vue";
import { unicodeToFm, unicodeToFmSegments } from "@/utils/sinhala/converter";

const emit = defineEmits(["announcement"]);
const showExampleEncodings = ref(false);
const exampleSamples = Object.freeze({
  vowelMarks: "කෙ, කෝ, කූ",
  stackedVowelMarks: "ළූ, ත්‍රෙු, තෙු්",
  consonantForms: "ක්‍ය, ක්‍ර, ර්‍ක",
  ligatures: "ක්‍ෂ, ත්‍ථ, ද්‍ධ",
  prenasalizedConsonants: "ඟ, ඦ, ඬ, ඳ",
  compactDaForms: "දා, දැ, ඳා, න්‍දා, ද්‍ය",
  mixedText: "සිංහල English 2026",
  nonstandardOrderUnicode: "ක්‍රි",
  nonstandardOrderLegacy: "l%s / ls%",
  nonstandardViramaUnicode: "ක්‍ර්",
  nonstandardViramaLegacy: "l%a / la%",
});
const compactDaExampleLegacy = unicodeToFm(exampleSamples.compactDaForms, {
  compactDaForms: true,
});
const mixedExampleSegments = unicodeToFmSegments(exampleSamples.mixedText);

function exampleText(unicodeText, targetFont, legacyText = null) {
  const resolvedLegacyText = legacyText ?? unicodeToFm(unicodeText);
  return targetFont === "legacy" ? resolvedLegacyText : unicodeText;
}

function toggleExampleEncodings() {
  showExampleEncodings.value = !showExampleEncodings.value;
  emit(
    "announcement",
    showExampleEncodings.value
      ? "已显示 Legacy 示例底层编码"
      : "已显示 Legacy 示例字形",
  );
}
</script>
