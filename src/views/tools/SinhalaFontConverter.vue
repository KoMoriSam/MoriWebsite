<template>
  <ContentPage
    eyebrow="Sinhala Unicode–ASCII Font Converter"
    title="僧伽罗字体编码转换器"
    description="在标准 Unicode 与 ASCII 传统字体编码之间双向转换，所有处理均在浏览器本地完成。"
  >
    <section class="card card-border overflow-hidden bg-base-100">
      <div
        class="flex gap-3 border-b border-base-300 bg-base-200/40 px-4 sm:py-2 flex-row items-center justify-between"
      >
        <p
          id="sinhala-converter-hint"
          class="flex items-center gap-2 text-sm text-base-content/65 truncate"
        >
          <i
            class="ri-arrow-up-down-line text-lg lg:-rotate-90"
            aria-hidden="true"
          ></i>
          任意一侧输入，另一侧实时输出
        </p>

        <button
          type="button"
          class="btn btn-ghost sm:btn-sm"
          :disabled="!hasText"
          @click="clearText"
        >
          <i class="ri-delete-bin-line" aria-hidden="true"></i>
          <span class="hidden sm:inline">清空全部</span>
        </button>
      </div>

      <div class="grid lg:grid-cols-2">
        <section
          class="flex min-w-0 flex-col p-4 lg:border-r lg:border-base-300"
        >
          <label
            for="sinhala-unicode-text"
            class="mb-2 flex items-end justify-between gap-4"
          >
            <span>
              <span class="block font-serif text-lg font-bold"
                >Unicode Text</span
              >
              <span class="text-xs text-base-content/55"
                >标准 Unicode 僧伽罗语文本</span
              >
            </span>
            <button
              type="button"
              class="btn sm:btn-sm max-sm:btn-square"
              :disabled="!unicodeText"
              @click="copyText('unicode')"
            >
              <i :class="copyIcon('unicode')" aria-hidden="true"></i>
              <span class="hidden sm:inline">{{ copyLabel("unicode") }}</span>
            </button>
          </label>

          <textarea
            id="sinhala-unicode-text"
            ref="unicodeInput"
            v-model="unicodeText"
            class="textarea min-h-32 w-full resize-y bg-base-200/35 font-[Kaiming_Punctuation_Serif,Abhaya_Libre,serif] placeholder:font-serif text-lg leading-7 focus:outline-primary lg:min-h-48"
            placeholder="在此输入或粘贴 Unicode 僧伽罗语文本……"
            aria-describedby="sinhala-converter-hint"
            lang="si"
            spellcheck="false"
            autofocus
            @input="handleUnicodeInput"
          ></textarea>

          <div class="mt-2 flex justify-end">
            <span class="text-xs tabular-nums text-base-content/75">
              {{ unicodeText.length }} 字符
            </span>
          </div>
        </section>

        <section
          class="flex min-w-0 flex-col border-t border-base-300 p-4 lg:border-t-0"
        >
          <label
            for="sinhala-fm-text"
            class="mb-2 flex items-end justify-between gap-4"
          >
            <span>
              <span class="block font-serif text-lg font-bold">ASCII Text</span>
              <span class="text-xs text-base-content/55">
                ASCII 传统字体编码与字形预览
              </span>
            </span>
            <button
              type="button"
              class="btn sm:btn-sm max-sm:btn-square"
              :disabled="!fmText"
              @click="copyText('fm')"
            >
              <i :class="copyIcon('fm')" aria-hidden="true"></i>
              <span class="hidden sm:inline">{{ copyLabel("fm") }}</span>
            </button>
          </label>

          <div class="join join-vertical min-h-30 lg:min-h-46">
            <textarea
              id="sinhala-fm-text-preview"
              v-model="fmText"
              class="join-item min-h-23 lg:min-h-31 textarea w-full resize-y bg-base-200/35 font-[FM_Abhaya_Libre_Legacy,Abhaya_Libre,serif] placeholder:font-serif text-lg leading-7 focus:outline-primary"
              placeholder="在此输入或粘贴 ASCII 传统字体编码……"
              aria-describedby="sinhala-converter-hint"
              lang="si"
              spellcheck="false"
              @input="handleFmInput"
            ></textarea>
            <textarea
              id="sinhala-fm-text-output"
              v-model="fmText"
              class="join-item min-h-7 lg:min-h-16 textarea w-full resize-y bg-base-200/35 font-mono text-sm leading-[1.8] focus:outline-primary"
              placeholder="上方为传统字体字形预览，此处显示实际 ASCII 字符"
              aria-describedby="sinhala-converter-hint"
              lang="si"
              spellcheck="false"
              @input="handleFmInput"
            ></textarea>
          </div>

          <div class="mt-2 flex justify-end">
            <p class="text-xs tabular-nums text-base-content/75">
              {{ fmText.length }} 字符
            </p>
          </div>
        </section>
      </div>
    </section>

    <section class="join join-vertical w-full mt-4">
      <details
        role="note"
        class="join-item collapse collapse-arrow bg-base-100 border border-base-300"
        open
      >
        <summary class="collapse-title">
          <hgroup
            class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2"
          >
            <i
              class="ri-file-text-line row-span-2 text-xl"
              aria-hidden="true"
            ></i>

            <h2 class="min-w-0 font-serif text-base font-bold sm:text-lg">
              关于僧伽罗语传统字体编码
            </h2>

            <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
              ASCII 传统字体编码与标准 Unicode 有什么区别？
            </p>
          </hgroup>
        </summary>

        <div
          class="collapse-content prose max-md:prose-sm max-w-none prose-p:text-justify"
        >
          <p>
            在僧伽罗语数字化早期，由于计算机系统尚未普遍支持 Unicode，
            许多字体通过 ASCII 字符位置映射僧伽罗文字形。FM Abhaya、FM
            Malithi、DL-Manel 等都属于这类传统非 Unicode
            字体。这种编码方式至今仍可见于旧版文档、报刊排版文件和早期电子资料中。
          </p>

          <!-- 编码转换 -->
          <div
            class="not-prose my-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
          >
            <!-- FM / DL -->
            <div
              class="min-w-0 rounded-box border border-base-300 bg-base-200/25 p-3 sm:p-4"
            >
              <div
                class="mb-1 flex items-center gap-2 text-xs text-base-content/75"
              >
                <i class="ri-file-text-line"></i>
                ASCII 传统字体编码
              </div>

              <div class="mt-2 w-full text-xl">
                <div
                  class="grid min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-stretch sm:gap-y-0"
                >
                  <span
                    class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                  >
                    Default
                  </span>

                  <span
                    class="min-w-0 break-words text-left font-mono text-base sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                  >
                    › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                  </span>

                  <span
                    class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                  >
                    FM Abhaya
                  </span>

                  <span
                    class="min-w-0 break-words text-left font-[FM_Abhaya_Libre_Legacy] text-base sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                  >
                    › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                  </span>

                  <span
                    class="badge badge-xs font-mono w-fit sm:badge-sm sm:my-2 sm:mr-3 sm:justify-self-end sm:self-center"
                  >
                    FM Gemunu
                  </span>

                  <span
                    class="min-w-0 break-words text-left font-[FM_Gemunu_Libre_Legacy] font-bold text-base sm:border-l-2 sm:border-base-content/10 sm:py-2 sm:pl-3 sm:text-xl"
                  >
                    › ,xldj bkaÈhka id.rfha msysá ¥m;ls'
                  </span>
                </div>
              </div>

              <p
                class="mt-3 leading-relaxed text-sm text-base-content/75 text-justify text-pretty"
              >
                实际保存的是 ASCII
                字符，需要配合对应的传统字体才能显示为僧伽罗文字形；在缺少相应字体的环境中，会直接显示底层
                ASCII 字符。
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
                      僧伽罗语文本的字体，并提供下载安装。当然，若将这些字体用于商业用途，仍需获取相应的授权许可。
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
              class="ri-arrow-up-down-line justify-self-center text-xl sm:-rotate-90"
              aria-hidden="true"
            ></i>

            <!-- Unicode -->
            <div
              class="min-w-0 rounded-box border border-base-300 bg-base-200/25 p-3 sm:p-4"
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
                实际保存的是标准 Unicode
                僧伽罗语字符，字符本身具有明确语义；如上所示，现代操作系统通常已提供可用于显示僧伽罗语的字体。
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
                        及以上）；Iskoola Pota 则更接近传统正文 /
                        衬线风格，为早期 Windows 的僧伽罗语默认字体。自 Windows
                        10 起，Iskoola Pota
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

          <p>
            两者在屏幕上都可以呈现相同的僧伽罗语内容，但保存方式并不相同。ASCII
            传统字体编码保存的是映射到特定字形的 ASCII 字符，而 Unicode
            保存的则是标准僧伽罗语字符。因此，传统编码文本在缺少对应字体时可能显示为英文字母或符号，并且难以直接用于搜索、文本分析、机器翻译和自然语言处理。
          </p>
        </div>
      </details>

      <details
        class="join-item collapse collapse-arrow border-t border-base-300"
      >
        <summary class="collapse-title">
          <hgroup
            class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2"
          >
            <i
              class="ri-question-line row-span-2 text-xl"
              aria-hidden="true"
            ></i>

            <h2 class="min-w-0 font-serif text-base font-bold sm:text-lg">
              关于僧伽罗字体编码转换器
            </h2>

            <p class="mt-0.5 min-w-0 text-sm text-base-content/60">
              这个转换器可以做什么？
            </p>
          </hgroup>
        </summary>

        <div
          class="collapse-content prose max-md:prose-sm max-w-none prose-p:text-justify"
        >
          <p>
            <strong>僧伽罗字体编码转换器</strong>
            用于在这两种表示方式之间转换实际保存的字符数据。将 ASCII
            传统字体编码转换为 Unicode
            后，文本可以脱离特定旧字体，更方便地用于网页、数据库、搜索、机器翻译和自然语言处理；反向转换则可以生成传统字体所需的
            ASCII 编码，用于仍依赖这类字体的旧版软件、排版文件和既有工作流程。
          </p>

          <p>
            整理旧文献、报刊、政府文件或历史排版资料时，可使用
            <strong>ASCII → Unicode</strong>；需要将现代 Unicode
            文本用于传统字体环境时，则可使用 <strong>Unicode → ASCII</strong>。
          </p>
        </div>
      </details>

      <!-- 技术说明 -->
      <details
        class="join-item collapse collapse-arrow border-t border-base-300"
      >
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
          ASCII 编辑区与编码简介中的字形预览使用基于 Abhaya Libre 和 Gemunu
          Libre 制作的内置传统编码兼容字体（详见<a
            href="/licenses"
            target="_blank"
            rel="noopener noreferrer"
            class="not-prose link link-primary link-hover"
            >第三方协议<i class="ri-arrow-right-up-line"></i></a
          >），仅用于模拟 ASCII 字体的字符映射效果，并非原版 FM Abhaya / Gemunu
          字体。
        </p>
      </details>
    </section>

    <p class="sr-only" aria-live="polite">{{ liveMessage }}</p>
  </ContentPage>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";

import ContentPage from "@/components/layout/ContentPage.vue";
import { fmToUnicode, unicodeToFm } from "@/utils/sinhala-font-converter";

const unicodeText = ref("");
const fmText = ref("");
const unicodeInput = ref(null);
const copiedField = ref("");
const copyFailedField = ref("");
const liveMessage = ref("");
const hasText = computed(() => Boolean(unicodeText.value || fmText.value));

let resetCopyTimer = null;

function resetCopyStatus() {
  copiedField.value = "";
  copyFailedField.value = "";
  window.clearTimeout(resetCopyTimer);
}

function handleUnicodeInput() {
  resetCopyStatus();
  fmText.value = unicodeToFm(unicodeText.value);
}

function handleFmInput() {
  resetCopyStatus();
  unicodeText.value = fmToUnicode(fmText.value);
}

async function clearText() {
  unicodeText.value = "";
  fmText.value = "";
  resetCopyStatus();
  liveMessage.value = "内容已清空";
  await nextTick();
  unicodeInput.value?.focus();
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.setAttribute("readonly", "");
  fallback.style.position = "fixed";
  fallback.style.opacity = "0";
  document.body.appendChild(fallback);
  fallback.select();
  const copied = document.execCommand("copy");
  fallback.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
}

async function copyText(field) {
  const text = field === "unicode" ? unicodeText.value : fmText.value;
  resetCopyStatus();

  try {
    await writeClipboard(text);
    copiedField.value = field;
    liveMessage.value =
      field === "unicode" ? "Unicode 文本已复制" : "FM 编码文本已复制";
  } catch {
    copyFailedField.value = field;
    liveMessage.value = "无法自动复制，请手动选择文本";
  }

  resetCopyTimer = window.setTimeout(resetCopyStatus, 1800);
}

function copyLabel(field) {
  if (copiedField.value === field) return "已复制";
  if (copyFailedField.value === field) return "复制失败";
  return field === "unicode" ? "复制 Unicode 文本" : "复制 ASCII 文本";
}

function copyIcon(field) {
  return copiedField.value === field ? "ri-check-line" : "ri-file-copy-line";
}
</script>
