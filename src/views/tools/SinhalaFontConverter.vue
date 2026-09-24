<template>
  <ContentPage title="僧伽罗字体编码转换器" metas-label="工具信息">
    <template #meta>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-repeat-2-line" aria-hidden="true"></i>
        双向转换
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-device-line" aria-hidden="true"></i>
        浏览器本地处理
      </span>
    </template>
    <template #actions>
      <div role="tablist" class="tabs tabs-box w-fit">
        <button
          type="button"
          role="tab"
          class="tab gap-1"
          :class="{ 'tab-active': inputMode === 'text' }"
          :aria-selected="inputMode === 'text'"
          @click="inputMode = 'text'"
        >
          <i class="ri-t-box-line" aria-hidden="true"></i>
          文本
        </button>
        <button
          type="button"
          role="tab"
          class="tab gap-1"
          :class="{ 'tab-active': inputMode === 'document' }"
          :aria-selected="inputMode === 'document'"
          @click="inputMode = 'document'"
        >
          <i class="ri-file-text-line" aria-hidden="true"></i>
          文档
        </button>
      </div>
    </template>
    <section>
      <div v-if="inputMode === 'document'" class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <hgroup class="min-w-0 flex flex-col items-start justify-between">
            <h2 class="block font-serif text-lg font-bold">
              {{ isDirectionReversed ? "Legacy" : "Unicode" }}
            </h2>
            <p class="text-xs text-base-content/55">源编码</p>
          </hgroup>
          <div
            class="tooltip"
            data-tip="交换源编码与目标编码位置（Ctrl+Shift+S）"
          >
            <button
              type="button"
              class="btn btn-ghost btn-circle"
              aria-label="交换源编码与目标编码位置"
              title="交换源编码与目标编码位置（Ctrl+Shift+S）"
              @click="swapPanels"
            >
              <i
                class="ri-arrow-left-right-line block text-lg"
                aria-hidden="true"
              ></i>
            </button>
          </div>
          <hgroup class="min-w-0 flex flex-col items-start justify-between">
            <h2 class="block font-serif text-lg font-bold">
              {{ isDirectionReversed ? "Unicode" : "Legacy" }}
            </h2>
            <p class="text-xs text-base-content/55">目标编码</p>
          </hgroup>
        </div>
        <div
          class="card card-dash min-h-[170px] border-base-content bg-base-100 transition-colors lg:min-h-[234px] motion-reduce:transition-none"
          :class="
            isDocumentDragging ? 'border-base-content/50 bg-base-200/60' : ''
          "
          @dragenter.prevent="isDocumentDragging = true"
          @dragover.prevent="isDocumentDragging = true"
          @dragleave.prevent="handleDocumentDragLeave"
          @drop.prevent="handleDocumentDrop"
        >
          <div
            class="card-body items-center justify-center gap-1 p-3 text-center lg:gap-2 lg:p-6"
          >
            <span
              class="flex size-10 items-center justify-center rounded-box bg-base-200 text-xl lg:size-12 lg:text-2xl"
              aria-hidden="true"
            >
              <i
                :class="
                  isDocumentDragging
                    ? 'ri-file-transfer-line'
                    : documentFile
                      ? 'ri-file-text-line'
                      : 'ri-file-add-line'
                "
              ></i>
            </span>
            <template v-if="documentFile">
              <p
                v-if="documentText"
                class="text-sm text-base-content/70 text-balance"
              >
                {{
                  documentDetectedEncoding
                    ? `检测到上传文件为 ${documentDetectedEncoding === "legacy" ? "Legacy" : "Unicode"} 编码的文档，如有误可手动交换`
                    : "未能识别源编码，请手动确认转换方向"
                }}
              </p>
              <p class="max-w-full break-all font-medium">
                <span
                  v-if="documentBusy"
                  class="loading loading-spinner loading-xs"
                  aria-hidden="true"
                ></span>
                <span v-else>
                  <i class="ri-checkbox-circle-fill text-success"></i>
                  <span class="badge badge-success badge-soft badge-xs"
                    >转换成功</span
                  >
                </span>
                {{ documentFile.name }}
              </p>
              <p class="text-xs text-base-content/60">
                {{ documentText.length }} 字符
              </p>
              <p v-if="documentError" role="alert" class="text-sm text-error">
                {{ documentError }}
              </p>
              <div class="card-actions justify-center gap-2">
                <label
                  class="btn btn-sm"
                  :class="isDocumentDragging ? 'btn-dash' : 'btn-outline'"
                  for="sinhala-document-upload"
                >
                  <i class="ri-upload-line"></i>
                  更换文件
                </label>
                <button
                  type="button"
                  class="btn btn-sm"
                  :disabled="!documentText.trim() || documentBusy"
                  @click="convertUploadedDocument"
                >
                  <span
                    v-if="documentBusy"
                    class="loading loading-spinner loading-xs"
                    aria-hidden="true"
                  ></span>
                  <i v-else class="ri-download-line"></i>
                  {{
                    documentBusy
                      ? documentText
                        ? "转换中…"
                        : "读取中…"
                      : "下载 DOCX"
                  }}
                </button>
              </div>
            </template>
            <template v-else>
              <div>
                <h3 class="font-serif text-base font-bold lg:text-lg">
                  {{
                    isDocumentDragging
                      ? "松开完成拖放"
                      : "拖放 DOCX 或 PDF 文件到这里"
                  }}
                </h3>
                <p class="mt-1 text-xs text-base-content/60 lg:text-sm">
                  选择文档后可检测编码并转换为 DOCX
                </p>
              </div>
              <label
                class="btn btn-sm"
                :class="isDocumentDragging ? 'btn-dash' : 'btn-outline'"
                for="sinhala-document-upload"
              >
                <i class="ri-folder-open-line" aria-hidden="true"></i>
                选择文档
              </label>
            </template>
            <input
              id="sinhala-document-upload"
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="sr-only"
              @change="handleDocumentSelection"
            />
          </div>
        </div>
      </div>
      <div
        v-show="inputMode === 'text'"
        class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-2"
      >
        <section
          class="min-w-0 space-y-2"
          :class="isDirectionReversed ? 'order-3' : 'order-1'"
        >
          <div class="min-w-0 flex items-center justify-between gap-2">
            <hgroup>
              <h2 class="block font-serif text-lg font-bold">Unicode Text</h2>
              <p class="text-xs text-base-content/55">
                标准 Unicode 僧伽罗语文本
              </p>
            </hgroup>
            <div class="flex min-w-0 shrink-0 items-end gap-2">
              <label class="label block text-xs w-24 sm:w-42">
                字体
                <FontSelect
                  ref="unicodeFontSelect"
                  v-model="unicodeFontId"
                  v-model:fallback-font-id="unicodeFallbackFontId"
                  :website-fonts="unicodeWebsiteFonts"
                  :uploaded-preview-text="sinhalaFontPreviewText"
                  uploaded-preview-language="si"
                  :local-preview-text="sinhalaFontPreviewText"
                  local-preview-language="si"
                  local-font-coverage="sinhala-unicode"
                  size="xs"
                  aria-label="Unicode 字体"
                  @select="onUnicodeFontSelected"
                />
              </label>
              <div class="tooltip" data-tip="加粗">
                <button
                  type="button"
                  class="btn btn-ghost btn-square btn-sm"
                  :class="{ 'btn-active': unicodeBold }"
                  :aria-pressed="unicodeBold"
                  aria-label="加粗 Unicode 字形"
                  title="加粗 Unicode 字形"
                  @click="toggleUnicodeBold"
                >
                  <i
                    class="ri-bold"
                    :class="{ 'font-bold!': unicodeBold }"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
            </div>
          </div>

          <div
            ref="unicodeFieldEl"
            class="textarea relative flex w-full flex-col p-0 [overflow-anchor:none] lg:w-[calc(100%+1.5rem)]"
            :class="{
              'border-primary/25 bg-primary/5 lg:-ml-6 focus-within:outline-0 focus-within:outline-offset-0':
                isDirectionReversed,
            }"
          >
            <textarea
              id="sinhala-unicode-text"
              ref="unicodeInput"
              v-model="unicodeText"
              class="min-h-32 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 font-abhaya placeholder:font-serif placeholder:text-lg text-lg leading-7 lg:min-h-48"
              :class="{ 'pr-10': hasText && !isDirectionReversed }"
              :style="{
                fontFamily: unicodeFontFamily,
                fontWeight: unicodeBold ? 700 : 400,
                fontSize: unicodePreviewSize,
              }"
              :readonly="isDirectionReversed"
              :placeholder="
                !isDirectionReversed
                  ? '在此输入 Unicode 僧伽罗语文本……'
                  : 'Unicode 文本预览'
              "
              lang="si"
              spellcheck="false"
              autofocus
              @input="handleUnicodeInput"
              @scroll.passive="syncTextScroll('unicode')"
            ></textarea>

            <label
              for="clear-text-1"
              class="tooltip absolute right-2 top-2"
              data-tip="清空全部"
            >
              <button
                v-if="hasText && !isDirectionReversed"
                type="button"
                id="clear-text-1"
                class="btn btn-ghost btn-circle btn-sm"
                aria-label="清空全部"
                title="清空全部"
                @click="clearText"
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </label>

            <div class="flex min-h-10 items-end justify-between pt-0 p-2">
              <section class="flex gap-2 items-center">
                <label
                  for="unicode-field-action"
                  class="tooltip tooltip-right"
                  :data-tip="
                    isDirectionReversed
                      ? copyLabel('unicode')
                      : pasteLabel('unicode')
                  "
                >
                  <button
                    type="button"
                    id="unicode-field-action"
                    class="btn btn-ghost btn-circle btn-sm"
                    :disabled="isDirectionReversed && !unicodeText"
                    :aria-label="
                      isDirectionReversed
                        ? copyLabel('unicode')
                        : pasteLabel('unicode')
                    "
                    :title="
                      isDirectionReversed
                        ? copyLabel('unicode')
                        : pasteLabel('unicode')
                    "
                    @click="
                      isDirectionReversed
                        ? copyText('unicode')
                        : pasteText('unicode')
                    "
                  >
                    <i
                      :class="
                        isDirectionReversed
                          ? copyIcon('unicode')
                          : pasteIcon('unicode')
                      "
                      aria-hidden="true"
                    ></i>
                  </button>
                </label>

                <div
                  v-if="isDirectionReversed"
                  class="tooltip tooltip-right"
                  data-tip="下载 Unicode DOCX 文档"
                >
                  <button
                    type="button"
                    class="btn btn-ghost btn-circle btn-sm"
                    :disabled="!unicodeText || downloadingField === 'unicode'"
                    aria-label="下载 Unicode DOCX 文档"
                    title="下载 Unicode DOCX 文档"
                    @click="downloadDocument('unicode')"
                  >
                    <i class="ri-download-line" aria-hidden="true"></i>
                  </button>
                </div>

                <span
                  v-if="!isDirectionReversed && encodingSuggestion"
                  role="alert"
                  class="flex gap-2 items-center"
                >
                  <i
                    class="ri-sparkling-2-fill text-primary text-lg"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0 text-sm text-pretty">
                    {{ encodingSuggestion.message }}
                  </span>
                  <button
                    type="button"
                    class="link link-primary link-hover"
                    @click="applyEncodingSuggestion"
                  >
                    {{ encodingSuggestion.actionLabel }}
                  </button>
                </span>
              </section>

              <span class="text-xs tabular-nums text-base-content/75">
                {{ unicodeText.length }} 字符
              </span>
            </div>
          </div>
        </section>

        <label
          for="swap-direction"
          class="tooltip order-2 justify-self-center self-start md:mt-1.5"
          data-tip="交换源编码与目标编码位置（Ctrl+Shift+S）"
        >
          <button
            type="button"
            id="swap-direction"
            class="btn btn-ghost btn-circle"
            aria-label="交换源编码与目标编码位置"
            title="交换源编码与目标编码位置（Ctrl+Shift+S）"
            @pointerdown.capture="captureControlViewport"
            @keydown.capture="captureControlViewport"
            @click="swapPanels"
          >
            <i
              class="ri-arrow-left-right-line block rotate-90 text-lg lg:rotate-0"
              aria-hidden="true"
            ></i>
          </button>
        </label>

        <section
          class="min-w-0 space-y-2"
          :class="isDirectionReversed ? 'order-1' : 'order-3'"
        >
          <div class="min-w-0 flex items-center justify-between gap-2">
            <hgroup>
              <h2
                id="sinhala-legacy-label"
                class="font-serif text-lg font-bold"
              >
                Legacy Text
              </h2>
              <p class="text-xs text-base-content/55">传统字体编码与字形预览</p>
            </hgroup>
            <div class="flex min-w-0 shrink-0 items-end gap-2">
              <label class="label block text-xs w-24 sm:w-42">
                字体
                <FontSelect
                  ref="legacyFontSelect"
                  v-model="legacyFontId"
                  v-model:fallback-font-id="legacyFallbackFontId"
                  :website-fonts="legacyWebsiteFonts"
                  :uploaded-preview-text="legacyFontPreviewText"
                  uploaded-preview-language="si"
                  :local-preview-text="legacyFontPreviewText"
                  local-preview-language="si"
                  local-font-coverage="sinhala-legacy"
                  size="xs"
                  aria-label="Legacy 字形预览字体"
                  :disabled="showLegacySource"
                  @select="onLegacyFontSelected"
                />
              </label>
              <div class="tooltip" data-tip="加粗">
                <button
                  type="button"
                  class="btn btn-ghost btn-square btn-sm"
                  :class="{ 'btn-active': legacyBold }"
                  :aria-pressed="legacyBold"
                  aria-label="加粗 Legacy 字形"
                  title="加粗 Legacy 字形"
                  :disabled="showLegacySource"
                  @click="toggleLegacyBold"
                >
                  <i
                    class="ri-bold"
                    :class="{ 'font-bold!': legacyBold }"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
            </div>
          </div>

          <div
            ref="fmFieldEl"
            class="textarea relative flex w-full flex-col p-0 [overflow-anchor:none] lg:w-[calc(100%+1.5rem)]"
            :class="{
              'border-primary/25 bg-primary/5 lg:-ml-6 focus-within:outline-0 focus-within:outline-offset-0':
                !isDirectionReversed,
            }"
          >
            <div
              id="sinhala-fm-text-preview"
              ref="fmPreviewInput"
              role="textbox"
              :contenteditable="
                isDirectionReversed ? 'plaintext-only' : 'false'
              "
              :aria-readonly="!isDirectionReversed"
              aria-multiline="true"
              aria-labelledby="sinhala-legacy-label"
              :data-placeholder="
                showLegacySource
                  ? isDirectionReversed
                    ? '在此输入传统字体源码……'
                    : '传统字体源码预览'
                  : isDirectionReversed
                    ? '在此输入传统字体文本……'
                    : '传统字体字形预览'
              "
              class="min-h-24 w-full overflow-y-auto whitespace-pre-wrap wrap-break-word bg-transparent px-3 py-2 text-lg leading-7 empty:before:pointer-events-none empty:before:font-serif empty:before:text-base-content/40 empty:before:content-[attr(data-placeholder)] lg:min-h-32"
              :class="{
                'pr-10': hasText && isDirectionReversed,
                'cursor-text outline-none': isDirectionReversed,
                'font-mono [font-variant-ligatures:none]': showLegacySource,
                'empty:before:font-bold': legacyBold && !showLegacySource,
              }"
              :style="{
                '--legacy-preview-font': legacyFontFamily,
                '--legacy-preview-non-sinhala-font': legacyNonSinhalaFontFamily,
                '--legacy-preview-non-sinhala-weight':
                  legacyBold || legacyNonSinhalaBold ? 700 : 400,
                '--legacy-preview-size': legacyPreviewSize,
                '--legacy-preview-weight': legacyBold ? 700 : 400,
              }"
              lang="si"
              spellcheck="false"
              v-html="renderedFmPreviewHtml"
              @focus="isFmPreviewEditing = true"
              @blur="handleFmPreviewBlur"
              @beforeinput="handleFmPreviewBeforeInput"
              @input="handleFmPreviewInput"
              @compositionstart="handleFmPreviewCompositionStart"
              @compositionend="handleFmPreviewCompositionEnd"
              @copy="handleFmPreviewCopy"
              @cut="handleFmPreviewCut"
              @paste="handleFmPreviewPaste"
              @keydown="handleFmPreviewKeydown"
              @scroll.passive="syncTextScroll('legacy')"
            ></div>

            <label
              for="clear-text-2"
              class="tooltip absolute right-2 top-2"
              data-tip="清空全部"
            >
              <button
                v-if="hasText && isDirectionReversed"
                type="button"
                id="clear-text-2"
                class="btn btn-ghost btn-circle btn-sm"
                aria-label="清空全部"
                title="清空全部"
                @click="clearText"
              >
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </label>

            <div class="flex min-h-10 items-end justify-between pt-0 p-2">
              <section class="flex min-w-0 flex-wrap gap-2 items-center">
                <label
                  for="fm-field-action"
                  class="tooltip tooltip-right"
                  :data-tip="
                    isDirectionReversed ? pasteLabel('fm') : copyLabel('fm')
                  "
                >
                  <button
                    type="button"
                    id="fm-field-action"
                    class="btn btn-ghost btn-circle btn-sm"
                    :disabled="!isDirectionReversed && !fmText"
                    :aria-label="
                      isDirectionReversed ? pasteLabel('fm') : copyLabel('fm')
                    "
                    :title="
                      isDirectionReversed ? pasteLabel('fm') : copyLabel('fm')
                    "
                    @click="
                      isDirectionReversed ? pasteText('fm') : copyText('fm')
                    "
                  >
                    <i
                      :class="
                        isDirectionReversed ? pasteIcon('fm') : copyIcon('fm')
                      "
                      aria-hidden="true"
                    ></i>
                  </button>
                </label>

                <div
                  v-if="!isDirectionReversed"
                  class="tooltip tooltip-right"
                  data-tip="下载 Legacy DOCX 文档"
                >
                  <button
                    type="button"
                    class="btn btn-ghost btn-circle btn-sm"
                    :disabled="!fmText || downloadingField === 'legacy'"
                    aria-label="下载 Legacy DOCX 文档"
                    title="下载 Legacy DOCX 文档"
                    @click="downloadDocument('legacy')"
                  >
                    <i class="ri-download-line" aria-hidden="true"></i>
                  </button>
                </div>

                <label class="label cursor-pointer gap-2 p-0">
                  <input
                    v-model="showLegacySource"
                    type="checkbox"
                    class="toggle toggle-sm"
                    aria-controls="sinhala-fm-text-preview"
                    @change="handleLegacySourceChange"
                  />
                  <span class="text-xs">显示源码</span>
                </label>

                <span
                  v-if="isDirectionReversed && encodingSuggestion"
                  role="alert"
                  class="flex gap-2 items-center"
                >
                  <i
                    class="ri-sparkling-2-fill text-primary text-lg"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0 text-sm text-pretty">
                    {{ encodingSuggestion.message }}
                  </span>
                  <button
                    type="button"
                    class="link link-primary link-hover"
                    @click="applyEncodingSuggestion"
                  >
                    {{ encodingSuggestion.actionLabel }}
                  </button>
                </span>
              </section>

              <span class="text-xs tabular-nums text-base-content/75">
                {{ fmText.length }} 字符
              </span>
            </div>
          </div>
        </section>
      </div>

      <p
        v-if="inputMode === 'text' && sourceTextLength >= LONG_TEXT_THRESHOLD"
        class="mt-3 text-sm text-base-content/70"
      >
        文本较长（{{ sourceTextLength }} 字符），建议改用
        <button
          type="button"
          class="link link-primary"
          @click="inputMode = 'document'"
        >
          文档模式
        </button>
        转换 DOCX 或 PDF。
      </p>

      <div
        class="mt-3 flex flex-wrap items-start gap-x-8 gap-y-4 [overflow-anchor:none] md:grid-cols-2"
        @pointerdown.capture="captureControlViewport"
        @keydown.capture="captureControlViewport"
      >
        <div class="flex min-w-0 flex-col gap-3">
          <label class="label cursor-pointer justify-start gap-3 p-0">
            <input
              v-model="preserveCurrentReducedForms"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              @change="handleConversionOptionsChange"
            />
            <span class="min-w-0">
              <span class="block text-sm font-medium">保留缩写辅音</span>
              <span class="block text-xs text-base-content/55">
                Preserve reduced consonant forms
              </span>
            </span>
          </label>

          <div
            v-if="!preserveCurrentReducedForms"
            class="ms-4 flex min-w-0 flex-col gap-3 border-s border-base-300 ps-6"
          >
            <label class="label cursor-pointer justify-start gap-3 p-0">
              <input
                v-model="preserveYansaya"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                @change="handleConversionOptionsChange"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">
                  <code
                    class="font-[Noto_Sans_Sinhala] text-xs bg-base-200/50 border border-base-300 rounded-md px-1 py-0.25"
                    >්‍ය</code
                  >
                  (යංශය)
                </span>
                <span class="block text-xs text-base-content/55">
                  关闭后拆为可见的 ්ය
                </span>
              </span>
            </label>

            <label class="label cursor-pointer justify-start gap-3 p-0">
              <input
                v-model="preserveRakaransaya"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                @change="handleConversionOptionsChange"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">
                  <code
                    class="font-[Noto_Sans_Sinhala] text-xs bg-base-200/50 border border-base-300 rounded-md px-1 py-0.25"
                    >්‍ර</code
                  >
                  (රකාරාංශය)
                </span>
                <span class="block text-xs text-base-content/55">
                  关闭后拆为可见的 ්ර
                </span>
              </span>
            </label>

            <label class="label cursor-pointer justify-start gap-3 p-0">
              <input
                v-model="preserveRepaya"
                type="checkbox"
                class="toggle toggle-primary toggle-sm"
                @change="handleConversionOptionsChange"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">
                  <code
                    class="font-[Noto_Sans_Sinhala] text-xs bg-base-200/50 border border-base-300 rounded-md px-1 py-0.25"
                    >◌ර්‍</code
                  >
                  (රේඵය)
                </span>
                <span class="block text-xs text-base-content/55">
                  关闭后拆为可见的
                  <span class="font-[Noto_Sans_Sinhala]">ර්◌</span>
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="flex min-w-0 flex-col gap-3">
          <label class="label cursor-pointer justify-start gap-3 p-0">
            <input
              v-model="preserveCurrentConjuncts"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              @change="handleConversionOptionsChange"
            />
            <span class="min-w-0">
              <span class="block text-sm font-medium">保留辅音合写</span>
              <span class="block text-xs text-base-content/55">
                Preserve conjunct forms
              </span>
            </span>
          </label>

          <div
            v-if="!preserveCurrentConjuncts"
            class="ms-4 min-w-0 border-s border-base-300 ps-6"
          >
            <fieldset class="flex min-w-0 flex-col gap-x-6 gap-y-3">
              <legend class="sr-only">统一形式</legend>
              <label class="label cursor-pointer justify-start gap-3 p-0">
                <input
                  v-model="unifiedConjunctForm"
                  type="radio"
                  name="sinhala-unified-conjunct-form"
                  value="decompose"
                  class="radio radio-primary radio-sm"
                  @change="handleConversionOptionsChange"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium">非连合形式</span>
                  <span class="block text-xs text-base-content/55">
                    Unjoined conjunct forms
                  </span>
                </span>
              </label>

              <label class="label cursor-pointer justify-start gap-3 p-0">
                <input
                  v-model="unifiedConjunctForm"
                  type="radio"
                  name="sinhala-unified-conjunct-form"
                  value="normalize"
                  class="radio radio-primary radio-sm"
                  @change="handleConversionOptionsChange"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium">连合形式</span>
                  <span class="block text-xs text-base-content/55">
                    Ligated conjunct forms
                  </span>
                </span>
              </label>
            </fieldset>
          </div>
        </div>

        <label
          v-if="!isDirectionReversed"
          class="label cursor-pointer justify-start gap-3 p-0 md:col-span-2"
        >
          <input
            v-model="compactDaForms"
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            @change="handleConversionOptionsChange"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium">ද 的紧凑组合字形</span>
            <span class="block text-xs text-base-content/55">
              Compact “ද” forms
            </span>
          </span>
        </label>
      </div>
    </section>

    <SinhalaConverterNotes />

    <SinhalaConverterInfo @announcement="liveMessage = $event" />

    <p class="sr-only" aria-live="polite">{{ liveMessage }}</p>
  </ContentPage>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";

import ContentPage from "@/components/layout/ContentPage.vue";
import FontSelect from "@/components/ui/FontSelect.vue";
import SinhalaConverterInfo from "@/components/tools/sinhala/Info.vue";
import SinhalaConverterNotes from "@/components/tools/sinhala/Notes.vue";
import { createSinhalaDocx } from "@/utils/sinhala/create-docx";
import { readSinhalaDocument } from "@/utils/sinhala/read-document";
import {
  legacyFontPreviewText,
  legacyWebsiteFonts,
  sinhalaFontPreviewText,
  unicodeWebsiteFonts,
} from "@/utils/sinhala/fonts";
import {
  editablePlainText,
  editableRange,
  editableSelection,
  restoreEditableSelection,
} from "@/utils/sinhala/editor";
import {
  detectSinhalaEncoding,
  fmToUnicode,
  fmToUnicodePreservingNonSinhala,
  fmToUnicodeSegments,
  unicodeToFm,
  unicodeToFmPreservingNonSinhala,
  unicodeToFmSegments,
} from "@/utils/sinhala/converter";

const unicodeText = ref("");
const fmText = ref("");
const unicodeFontId = ref("abhaya");
const unicodeFallbackFontId = ref("abhaya");
const unicodeFontFamily = ref("var(--font-abhaya)");
const unicodePreviewSize = ref("");
const unicodeBold = ref(false);
const unicodeFontSelect = ref(null);
let unicodeFontRequest = 0;
let unicodeFontManuallySelected = false;
const showLegacySource = ref(false);
const legacyFontId = ref("abhaya-legacy");
const legacyFallbackFontId = ref("abhaya-legacy");
const legacyFontFamily = ref("var(--font-abhaya-legacy)");
const legacyNonSinhalaFontFamily = ref('"XITS for Abhaya", serif');
const legacyNonSinhalaBold = ref(false);
const legacyPreviewSize = ref("100%");
const legacyBold = ref(false);
const legacyFontSelect = ref(null);
let legacyFontRequest = 0;
let legacyFontManuallySelected = false;
const correspondingLegacyFontIds = {
  abhaya: "abhaya-legacy",
  gemunu: "gemunu-legacy",
};
const correspondingUnicodeFontIds = {
  "abhaya-legacy": "abhaya",
  "gemunu-legacy": "gemunu",
};

function onUnicodeFontSelected(fontId) {
  unicodeFontManuallySelected = true;
  if (!legacyFontManuallySelected && correspondingLegacyFontIds[fontId]) {
    legacyFontId.value = correspondingLegacyFontIds[fontId];
  }
}

function onLegacyFontSelected(fontId) {
  legacyFontManuallySelected = true;
  if (!unicodeFontManuallySelected && correspondingUnicodeFontIds[fontId]) {
    unicodeFontId.value = correspondingUnicodeFontIds[fontId];
  }
}
const unicodeInput = ref(null);
const fmPreviewInput = ref(null);
const unicodeFieldEl = ref(null);
const fmFieldEl = ref(null);
const copiedField = ref("");
const copyFailedField = ref("");
const pastedField = ref("");
const pasteFailedField = ref("");
const liveMessage = ref("");
const downloadingField = ref("");
const route = useRoute();
const router = useRouter();
const inputMode = computed({
  get: () => (route.query.mode === "document" ? "document" : "text"),
  set: (mode) => {
    if (route.query.mode === mode) return;
    void router.replace({ query: { ...route.query, mode } });
  },
});
const documentFile = ref(null);
const documentText = ref("");
const documentDetectedEncoding = ref(null);
const documentError = ref("");
const documentBusy = ref(false);
const isDocumentDragging = ref(false);
const LONG_TEXT_THRESHOLD = 5000;
const isDirectionReversed = ref(false);
const preserveCurrentReducedForms = ref(true);
const preserveRepaya = ref(true);
const preserveYansaya = ref(true);
const preserveRakaransaya = ref(true);
const preserveCurrentConjuncts = ref(true);
const unifiedConjunctForm = ref("decompose");
const compactDaForms = ref(false);
const isFmPreviewEditing = ref(false);
const isFmPreviewComposing = ref(false);
const renderedFmPreviewHtml = ref("");
// Retain source-script provenance while a generated Unicode/Legacy pair only
// changes position, so sequences such as `ys` remain associated with `හි`.
const fmTextDerivedFromUnicode = ref(false);
const hasText = computed(() => Boolean(unicodeText.value || fmText.value));
const sourceTextLength = computed(() =>
  isDirectionReversed.value ? fmText.value.length : unicodeText.value.length,
);
const fmPreviewSegments = computed(() => {
  if (isDirectionReversed.value && !fmTextDerivedFromUnicode.value) {
    return fmToUnicodeSegments(fmText.value, conjunctConversionOptions()).map(
      ({ source, useLegacyFont }) => ({
        text: source,
        useLegacyFont,
      }),
    );
  }

  return unicodeToFmSegments(unicodeText.value, {
    ...conjunctConversionOptions(),
    compactDaForms: compactDaForms.value,
  });
});
const encodingSuggestion = computed(() => {
  const sourceText = isDirectionReversed.value
    ? fmText.value
    : unicodeText.value;
  if (!sourceText.trim()) return null;

  const detectedEncoding = detectSinhalaEncoding(sourceText);
  const expectedEncoding = isDirectionReversed.value ? "legacy" : "unicode";
  if (!detectedEncoding || detectedEncoding === expectedEncoding) return null;

  return isDirectionReversed.value
    ? {
        message: "源编码：",
        actionLabel: "Unicode",
      }
    : {
        message: "源编码：",
        actionLabel: "Legacy",
      };
});

let resetCopyTimer = null;
let fmPreviewConversionTimer = null;
let fmCompositionCommitTimer = null;
let fmCompositionHistoryEntry = null;
let fmClipboardInputResetTimer = null;
let pendingFmClipboardInputType = "";
let textareaResizeFrame = null;
let textareaResizeRequest = 0;
let textareaViewportWidth = 0;
let textareaViewportHeight = 0;
let pendingControlViewport = null;
let stopControlViewportRestore = null;
let pendingFmHistoryEntry = null;
let pendingFmHistoryInputType = "";
let fmHistoryGroup = null;
let fmPreviewRenderToken = 0;
const fmUndoStack = [];
const fmRedoStack = [];
const FM_HISTORY_LIMIT = 200;
const FM_HISTORY_GROUP_DELAY = 1000;
const FM_GROUPABLE_INPUT_TYPES = new Set([
  "insertText",
  "deleteContentBackward",
  "deleteContentForward",
]);

function escapeFmPreviewHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmPreviewHtml() {
  if (showLegacySource.value) return escapeFmPreviewHtml(fmText.value);

  return fmPreviewSegments.value
    .map(
      ({ text, useLegacyFont }) =>
        `<span class="leading-none" style="${useLegacyFont ? "font-family:var(--legacy-preview-font);font-size:var(--legacy-preview-size);font-weight:var(--legacy-preview-weight)" : "font-family:var(--legacy-preview-non-sinhala-font);font-weight:var(--legacy-preview-non-sinhala-weight)"}">${escapeFmPreviewHtml(text)}</span>`,
    )
    .join("");
}

function isFmAbabldFont(family) {
  return /^fmababld$/iu.test(family.replace(/[\s_-]/gu, ""));
}

function refreshFmPreview({
  preserveSelection = false,
  selection = null,
} = {}) {
  if (isFmPreviewComposing.value) return;

  const element = fmPreviewInput.value;
  const savedSelection =
    selection ??
    (preserveSelection && element ? editableSelection(element) : null);
  const html = fmPreviewHtml();
  const htmlChanged = renderedFmPreviewHtml.value !== html;
  const renderToken = ++fmPreviewRenderToken;
  renderedFmPreviewHtml.value = html;

  if (htmlChanged) {
    nextTick(() => {
      if (renderToken !== fmPreviewRenderToken) return;
      restoreEditableSelection(fmPreviewInput.value, savedSelection);
    });
    return;
  }

  if (element?.innerHTML !== html) {
    element.innerHTML = html;
  }
  restoreEditableSelection(element, savedSelection);
}

function resetFmHistory() {
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmHistoryGroup = null;
  fmCompositionHistoryEntry = null;
  fmUndoStack.length = 0;
  fmRedoStack.length = 0;
}

function pushFmHistory(stack, entry) {
  if (!entry) return;
  stack.push(entry);
  if (stack.length > FM_HISTORY_LIMIT) stack.shift();
}

function resizeTextarea(textarea) {
  const borderHeight = textarea.offsetHeight - textarea.clientHeight;
  if (textarea.scrollHeight > textarea.clientHeight + 1)
    return textarea.scrollHeight + borderHeight;
  const scrollTop = textarea.scrollTop;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
  textarea.scrollTop = scrollTop;
  return textarea.offsetHeight;
}

let lastTextScrollSide = "unicode";
let expectedSyncedScroll = null;

function syncTextScroll(side) {
  const source = side === "unicode" ? unicodeInput.value : fmPreviewInput.value;
  const target = side === "unicode" ? fmPreviewInput.value : unicodeInput.value;
  if (!source || !target) return;
  if (
    expectedSyncedScroll?.side === side &&
    Math.abs(source.scrollTop - expectedSyncedScroll.top) < 1
  ) {
    expectedSyncedScroll = null;
    return;
  }
  expectedSyncedScroll = null;
  lastTextScrollSide = side;
  const sourceRange = Math.max(0, source.scrollHeight - source.clientHeight);
  const targetRange = Math.max(0, target.scrollHeight - target.clientHeight);
  const targetTop = sourceRange
    ? (source.scrollTop / sourceRange) * targetRange
    : 0;
  if (Math.abs(target.scrollTop - targetTop) < 1) return;
  target.scrollTop = targetTop;
  expectedSyncedScroll = {
    side: side === "unicode" ? "legacy" : "unicode",
    top: target.scrollTop,
  };
}

function resizeAllTextareas() {
  if (inputMode.value !== "text") return;
  const unicodeTextarea = unicodeInput.value;
  const fmPreviewTextarea = fmPreviewInput.value;
  const unicodeField = unicodeFieldEl.value;
  const fmField = fmFieldEl.value;
  if (!unicodeTextarea || !fmPreviewTextarea || !unicodeField || !fmField) {
    return;
  }

  unicodeField.style.height = "";
  fmField.style.height = "";
  const unicodeFieldExtra =
    unicodeField.offsetHeight - unicodeTextarea.offsetHeight;
  const fmFieldExtra = fmField.offsetHeight - fmPreviewTextarea.offsetHeight;
  const unicodeHeight = resizeTextarea(unicodeTextarea);
  const fmPreviewHeight = resizeTextarea(fmPreviewTextarea);
  const maxFieldHeight = Math.max(
    256,
    Math.min(512, (textareaViewportHeight || window.innerHeight) * 0.25),
  );
  const sharedFieldHeight = Math.min(
    maxFieldHeight,
    Math.ceil(
      Math.max(
        unicodeHeight + unicodeFieldExtra,
        fmPreviewHeight + fmFieldExtra,
      ),
    ),
  );

  unicodeTextarea.style.height = `${sharedFieldHeight - unicodeFieldExtra}px`;
  fmPreviewTextarea.style.height = `${sharedFieldHeight - fmFieldExtra}px`;

  unicodeField.style.height = `${sharedFieldHeight}px`;
  fmField.style.height = `${sharedFieldHeight}px`;
  syncTextScroll(lastTextScrollSide);
}

function handleLegacySourceChange() {
  flushFmPreviewConversion();
  refreshFmPreview();
  liveMessage.value = showLegacySource.value
    ? "已显示 Legacy 源码"
    : "已显示 Legacy 字形预览";
  scheduleTextareaResize();
}

function toggleUnicodeBold() {
  unicodeBold.value = !unicodeBold.value;
  scheduleTextareaResize();
}

function toggleLegacyBold() {
  legacyBold.value = !legacyBold.value;
  scheduleTextareaResize();
}

const fontSizeSample = "සිංහල අකුරු";
const legacyFontSizeSample = unicodeToFm(fontSizeSample);
const localFontScaleCache = new Map();

function registeredFontScale(family) {
  const target = family.trim().toLocaleLowerCase();
  const findInRules = (rules) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const name = rule.style
          .getPropertyValue("font-family")
          .trim()
          .replace(/^["']|["']$/gu, "")
          .toLocaleLowerCase();
        const scale = Number.parseFloat(
          rule.style.getPropertyValue("size-adjust"),
        );
        if (name === target && Number.isFinite(scale) && scale > 0)
          return scale / 100;
      }
      const nested = rule.styleSheet?.cssRules || rule.cssRules;
      if (nested) {
        const scale = findInRules(nested);
        if (scale) return scale;
      }
    }
    return null;
  };
  for (const sheet of document.styleSheets) {
    try {
      const scale = findInRules(sheet.cssRules);
      if (scale) return scale;
    } catch {
      // Cross-origin stylesheets do not expose their rules.
    }
  }
  return null;
}

async function localFontScale(fontId, font, referenceFamily, sample) {
  if (!font.sourceFamily) return 1;
  if (font.usesRegisteredCssFont) return 1;
  const registered = registeredFontScale(font.sourceFamily);
  if (registered) return registered;
  const key = `${fontId}:${referenceFamily}`;
  if (!localFontScaleCache.has(key)) {
    localFontScaleCache.set(
      key,
      (async () => {
        await Promise.all([
          document.fonts.load(`100px ${font.family}`, sample),
          document.fonts.load(`100px "${referenceFamily}"`, sample),
        ]);
        const context = document.createElement("canvas").getContext("2d");
        if (!context) return 1;
        context.font = `100px "${referenceFamily}"`;
        const reference = context.measureText(sample);
        context.font = `100px ${font.family}`;
        const selected = context.measureText(sample);
        const referenceHeight =
          reference.actualBoundingBoxAscent +
          reference.actualBoundingBoxDescent;
        const selectedHeight =
          selected.actualBoundingBoxAscent + selected.actualBoundingBoxDescent;
        if (!referenceHeight || !selectedHeight) return 1;
        const scale = Math.max(
          0.75,
          Math.min(1.8, referenceHeight / selectedHeight),
        );
        return /^UN[-_\s]+/iu.test(font.sourceFamily)
          ? Math.min(1.4, scale * 0.9)
          : scale;
      })().catch(() => 1),
    );
  }
  return localFontScaleCache.get(key);
}

watch(
  [unicodeFontId, unicodeFallbackFontId, unicodeBold],
  async ([fontId, fallbackFontId, bold]) => {
    const request = ++unicodeFontRequest;
    try {
      const font = await unicodeFontSelect.value?.resolveFont(
        fontId,
        unicodeText.value,
        bold ? "bold" : "normal",
        fallbackFontId,
        'Arial, "Helvetica Neue", "Liberation Sans"',
      );
      if (request !== unicodeFontRequest || !font) return;
      const scale = await localFontScale(
        fontId,
        font,
        "Abhaya Libre",
        fontSizeSample,
      );
      if (request !== unicodeFontRequest) return;
      unicodeFontFamily.value = font.family;
      unicodePreviewSize.value = font.sourceFamily
        ? `calc(1.125rem * ${scale})`
        : "";
      scheduleTextareaResize();
    } catch {
      if (request === unicodeFontRequest) {
        liveMessage.value = "无法加载所选 Unicode 字体，请重新选择";
      }
    }
  },
);

watch(
  [legacyFontId, legacyFallbackFontId],
  async ([fontId, fallbackFontId]) => {
    const request = ++legacyFontRequest;
    try {
      const font = await legacyFontSelect.value?.resolveFont(
        fontId,
        fmText.value,
        "normal",
        fallbackFontId,
      );
      if (request !== legacyFontRequest || !font) return;
      const scale = await localFontScale(
        fontId,
        font,
        "Abhaya Legacy",
        legacyFontSizeSample,
      );
      if (request !== legacyFontRequest) return;
      legacyFontFamily.value = font.family;
      const selectedFontName =
        font.sourceFamily ||
        (await legacyFontSelect.value?.selectedDocumentFontInfo())?.family ||
        "";
      if (request !== legacyFontRequest) return;
      legacyNonSinhalaBold.value = isFmAbabldFont(selectedFontName);
      legacyNonSinhalaFontFamily.value =
        fontId === "abhaya-legacy" ||
        /^fm[\s_-]*(?:abhaya|abbaya|aba)/iu.test(selectedFontName)
          ? '"XITS for Abhaya", serif'
          : fontId === "gemunu-legacy" ||
              /^fm[\s_-]*gemunu/iu.test(selectedFontName)
            ? '"Gemunu Libre", sans-serif'
            : "var(--font-sans)";
      legacyPreviewSize.value = font.sourceFamily
        ? `${Math.round(scale * 100)}%`
        : fontId.startsWith("upload:")
          ? "125%"
          : "100%";
      scheduleTextareaResize();
    } catch {
      if (request === legacyFontRequest) {
        liveMessage.value = "无法加载所选字体，请重新选择";
      }
    }
  },
);

function scheduleTextareaResize() {
  const request = ++textareaResizeRequest;
  nextTick(() => {
    if (request !== textareaResizeRequest) return;
    if (textareaResizeFrame !== null) return;
    textareaResizeFrame = window.requestAnimationFrame(() => {
      textareaResizeFrame = null;
      resizeAllTextareas();
    });
  });
}

function handleWindowResize() {
  if (window.innerWidth === textareaViewportWidth) return;
  textareaViewportWidth = window.innerWidth;
  textareaViewportHeight = window.innerHeight;
  scheduleTextareaResize();
}

function cancelScheduledTextareaResize() {
  textareaResizeRequest++;
  if (textareaResizeFrame !== null) {
    window.cancelAnimationFrame(textareaResizeFrame);
    textareaResizeFrame = null;
  }
}

watch(inputMode, (mode) => {
  if (mode === "text") scheduleTextareaResize();
  else cancelScheduledTextareaResize();
});

function resetCopyStatus() {
  copiedField.value = "";
  copyFailedField.value = "";
  pastedField.value = "";
  pasteFailedField.value = "";
  window.clearTimeout(resetCopyTimer);
}

function conjunctConversionOptions() {
  const reducedForms = preserveCurrentReducedForms.value
    ? {
        preserveRepaya: true,
        preserveYansaya: true,
        preserveRakaransaya: true,
      }
    : {
        preserveRepaya: preserveRepaya.value,
        preserveYansaya: preserveYansaya.value,
        preserveRakaransaya: preserveRakaransaya.value,
      };
  if (preserveCurrentConjuncts.value) {
    return {
      ...reducedForms,
      preserveConjuncts: true,
      normalizeConjuncts: false,
    };
  }

  const normalizeConjuncts = unifiedConjunctForm.value === "normalize";
  return {
    ...reducedForms,
    preserveConjuncts: normalizeConjuncts,
    normalizeConjuncts,
  };
}

function handleUnicodeInput() {
  resetCopyStatus();
  fmText.value = unicodeToFmPreservingNonSinhala(unicodeText.value, {
    ...conjunctConversionOptions(),
    compactDaForms: compactDaForms.value,
  });
  fmTextDerivedFromUnicode.value = true;
  resetFmHistory();
  refreshFmPreview();
  scheduleTextareaResize();
}

function handleFmInput() {
  window.clearTimeout(fmPreviewConversionTimer);
  fmPreviewConversionTimer = null;
  resetCopyStatus();
  fmTextDerivedFromUnicode.value = false;
  unicodeText.value = fmToUnicodePreservingNonSinhala(
    fmText.value,
    conjunctConversionOptions(),
  );
  resetFmHistory();
  refreshFmPreview();
  scheduleTextareaResize();
}

function scheduleFmPreviewConversion() {
  window.clearTimeout(fmPreviewConversionTimer);
  resetCopyStatus();
  fmTextDerivedFromUnicode.value = false;
  if (isFmPreviewComposing.value || fmCompositionCommitTimer !== null) {
    unicodeText.value = fmToUnicodePreservingNonSinhala(
      fmText.value,
      conjunctConversionOptions(),
    );
    return;
  }

  fmPreviewConversionTimer = window.setTimeout(() => {
    fmPreviewConversionTimer = null;
    refreshFmPreview({ preserveSelection: true });
    unicodeText.value = fmToUnicodePreservingNonSinhala(
      fmText.value,
      conjunctConversionOptions(),
    );
    scheduleTextareaResize();
  }, 120);

  const preview = fmPreviewInput.value;
  if (preview && preview.scrollHeight > preview.clientHeight) {
    scheduleTextareaResize();
  }
}

function flushFmPreviewConversion() {
  if (isFmPreviewComposing.value || fmCompositionCommitTimer !== null) {
    commitFmPreviewComposition();
  }
  if (fmPreviewConversionTimer === null) return;
  window.clearTimeout(fmPreviewConversionTimer);
  fmPreviewConversionTimer = null;
  refreshFmPreview({ preserveSelection: true });
  unicodeText.value = fmToUnicodePreservingNonSinhala(
    fmText.value,
    conjunctConversionOptions(),
  );
}

function handleFmPreviewBlur() {
  commitFmPreviewComposition();
  flushFmPreviewConversion();
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmHistoryGroup = null;
  isFmPreviewEditing.value = false;
  scheduleTextareaResize();
}

function handleFmPreviewInput(event) {
  const element = fmPreviewInput.value;
  if (!element || !isDirectionReversed.value) return;
  if (pendingFmClipboardInputType) {
    clearExpectedFmClipboardInput();
    refreshFmPreview({ preserveSelection: true });
    return;
  }
  const nextText = editablePlainText(element);
  if (nextText === fmText.value) {
    pendingFmHistoryEntry = null;
    pendingFmHistoryInputType = "";
    return;
  }

  if (
    isFmPreviewComposing.value ||
    event.isComposing ||
    fmCompositionCommitTimer !== null
  ) {
    resetCopyStatus();
    fmTextDerivedFromUnicode.value = false;
    fmText.value = nextText;
    unicodeText.value = fmToUnicodePreservingNonSinhala(
      fmText.value,
      conjunctConversionOptions(),
    );
    return;
  }

  if (pendingFmHistoryEntry?.text !== nextText) {
    pushFmHistory(fmUndoStack, pendingFmHistoryEntry);
  }
  fmRedoStack.length = 0;
  fmHistoryGroup = FM_GROUPABLE_INPUT_TYPES.has(pendingFmHistoryInputType)
    ? {
        inputType: pendingFmHistoryInputType,
        selection: editableSelection(element),
        updatedAt: window.performance.now(),
      }
    : null;
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmText.value = nextText;
  scheduleFmPreviewConversion();
}

function handleFmPreviewBeforeInput(event) {
  if (!isDirectionReversed.value) return;
  if (pendingFmClipboardInputType) {
    event.preventDefault();
    clearExpectedFmClipboardInput();
    return;
  }
  if (
    isFmPreviewComposing.value ||
    event.isComposing ||
    fmCompositionCommitTimer !== null
  ) {
    return;
  }
  if (event.inputType === "historyUndo") {
    event.preventDefault();
    applyFmHistory(fmUndoStack, fmRedoStack);
    return;
  }
  if (event.inputType === "historyRedo") {
    event.preventDefault();
    applyFmHistory(fmRedoStack, fmUndoStack);
    return;
  }

  const element = event.currentTarget;
  const selection = editableSelection(element);
  const now = window.performance.now();
  const continuesHistoryGroup =
    FM_GROUPABLE_INPUT_TYPES.has(event.inputType) &&
    fmHistoryGroup?.inputType === event.inputType &&
    now - fmHistoryGroup.updatedAt <= FM_HISTORY_GROUP_DELAY &&
    fmHistoryGroup.selection?.start === selection?.start &&
    fmHistoryGroup.selection?.end === selection?.end;

  pendingFmHistoryEntry = continuesHistoryGroup
    ? null
    : {
        text: editablePlainText(element),
        selection,
      };
  pendingFmHistoryInputType = event.inputType;
}

function selectedFmPreviewText(element) {
  const selection = editableSelection(element);
  if (!selection || selection.start === selection.end) return null;
  return {
    selection,
    text: fmText.value.slice(selection.start, selection.end),
  };
}

function setFmPreviewClipboardText(event, text) {
  if (!event.clipboardData) return false;
  try {
    event.clipboardData.setData("text/plain", text);
    event.preventDefault();
    return true;
  } catch {
    return false;
  }
}

function replaceFmPreviewSelection(element, selection, replacement) {
  const currentText = fmText.value;
  const nextText = `${currentText.slice(0, selection.start)}${replacement}${currentText.slice(selection.end)}`;
  const nextCaret = selection.start + replacement.length;

  pushFmHistory(fmUndoStack, {
    text: currentText,
    selection,
  });
  fmRedoStack.length = 0;
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmHistoryGroup = null;
  fmCompositionHistoryEntry = null;
  window.clearTimeout(fmCompositionCommitTimer);
  fmCompositionCommitTimer = null;
  isFmPreviewComposing.value = false;
  fmText.value = nextText;
  fmTextDerivedFromUnicode.value = false;

  const range = editableRange(element);
  const currentSelection = window.getSelection();
  if (range && currentSelection) {
    range.deleteContents();
    if (replacement) {
      const textNode = document.createTextNode(replacement);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
    }
    range.collapse(true);
    currentSelection.removeAllRanges();
    currentSelection.addRange(range);
  } else {
    refreshFmPreview({
      selection: { start: nextCaret, end: nextCaret },
    });
  }

  scheduleFmPreviewConversion();
}

function clearExpectedFmClipboardInput() {
  window.clearTimeout(fmClipboardInputResetTimer);
  fmClipboardInputResetTimer = null;
  pendingFmClipboardInputType = "";
}

function expectFmClipboardInput(inputType) {
  clearExpectedFmClipboardInput();
  pendingFmClipboardInputType = inputType;
  fmClipboardInputResetTimer = window.setTimeout(() => {
    clearExpectedFmClipboardInput();
  }, 0);
}

function handleFmPreviewCopy(event) {
  const selected = selectedFmPreviewText(event.currentTarget);
  if (!selected) return;
  setFmPreviewClipboardText(event, selected.text);
}

function handleFmPreviewCut(event) {
  if (!isDirectionReversed.value) return;
  const selected = selectedFmPreviewText(event.currentTarget);
  if (!selected || !setFmPreviewClipboardText(event, selected.text)) return;
  expectFmClipboardInput("deleteByCut");
  replaceFmPreviewSelection(event.currentTarget, selected.selection, "");
}

function handleFmPreviewPaste(event) {
  if (!isDirectionReversed.value || !event.clipboardData) return;
  const selection = editableSelection(event.currentTarget);
  if (!selection) return;
  const text = event.clipboardData
    .getData("text/plain")
    .replace(/\r\n?/gu, "\n");
  event.preventDefault();
  expectFmClipboardInput("insertFromPaste");
  replaceFmPreviewSelection(event.currentTarget, selection, text);
}

function handleFmPreviewCompositionStart(event) {
  if (!isDirectionReversed.value) return;
  window.clearTimeout(fmPreviewConversionTimer);
  fmPreviewConversionTimer = null;
  window.clearTimeout(fmCompositionCommitTimer);
  fmCompositionCommitTimer = null;
  isFmPreviewComposing.value = true;
  fmCompositionHistoryEntry = {
    text: editablePlainText(event.currentTarget),
    selection: editableSelection(event.currentTarget),
  };
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmHistoryGroup = null;
}

function commitFmPreviewComposition() {
  window.clearTimeout(fmCompositionCommitTimer);
  fmCompositionCommitTimer = null;
  clearExpectedFmClipboardInput();
  isFmPreviewComposing.value = false;

  const element = fmPreviewInput.value;
  if (!element || !isDirectionReversed.value) {
    fmCompositionHistoryEntry = null;
    return;
  }

  const nextText = editablePlainText(element);
  if (
    fmCompositionHistoryEntry &&
    fmCompositionHistoryEntry.text !== nextText
  ) {
    pushFmHistory(fmUndoStack, fmCompositionHistoryEntry);
    fmRedoStack.length = 0;
  }
  fmCompositionHistoryEntry = null;
  fmText.value = nextText;
  fmTextDerivedFromUnicode.value = false;
  unicodeText.value = fmToUnicodePreservingNonSinhala(
    fmText.value,
    conjunctConversionOptions(),
  );
  refreshFmPreview({ preserveSelection: true });
  scheduleTextareaResize();
}

function handleFmPreviewCompositionEnd() {
  isFmPreviewComposing.value = false;
  window.clearTimeout(fmCompositionCommitTimer);
  clearExpectedFmClipboardInput();
  fmCompositionCommitTimer = window.setTimeout(commitFmPreviewComposition, 0);
}

function applyFmHistory(sourceStack, targetStack) {
  const element = fmPreviewInput.value;
  const entry = sourceStack.pop();
  if (!element || !entry) return;

  pushFmHistory(targetStack, {
    text: editablePlainText(element),
    selection: editableSelection(element),
  });
  pendingFmHistoryEntry = null;
  pendingFmHistoryInputType = "";
  fmHistoryGroup = null;
  window.clearTimeout(fmPreviewConversionTimer);
  fmPreviewConversionTimer = null;
  window.clearTimeout(fmCompositionCommitTimer);
  fmCompositionCommitTimer = null;
  clearExpectedFmClipboardInput();
  isFmPreviewComposing.value = false;
  fmCompositionHistoryEntry = null;
  fmText.value = entry.text;
  fmTextDerivedFromUnicode.value = false;
  unicodeText.value = fmToUnicodePreservingNonSinhala(
    fmText.value,
    conjunctConversionOptions(),
  );
  refreshFmPreview({ selection: entry.selection });
  scheduleTextareaResize();
}

function handleFmPreviewKeydown(event) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === "a" && isDirectionReversed.value) {
    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } else if (key === "z") {
    event.preventDefault();
    applyFmHistory(
      event.shiftKey ? fmRedoStack : fmUndoStack,
      event.shiftKey ? fmUndoStack : fmRedoStack,
    );
  } else if (key === "y" && !event.shiftKey) {
    event.preventDefault();
    applyFmHistory(fmRedoStack, fmUndoStack);
  }
}

function controlViewportTop(element) {
  return (
    element.getBoundingClientRect().top -
    (window.visualViewport?.offsetTop ?? 0)
  );
}

function captureControlViewport(event) {
  if (
    event instanceof KeyboardEvent &&
    ![" ", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      event.key,
    )
  ) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  const element =
    event.currentTarget?.id === "swap-direction"
      ? event.currentTarget
      : target?.closest("label");
  if (element) {
    pendingControlViewport = { element, top: controlViewportTop(element) };
  }
}

function stabilizeControlViewport(event) {
  stopControlViewportRestore?.();
  if (!event) {
    pendingControlViewport = null;
    return;
  }
  const target = event?.target instanceof Element ? event.target : null;
  const element = target?.closest("label") ?? event?.currentTarget;
  const anchor = pendingControlViewport?.element.isConnected
    ? pendingControlViewport
    : element instanceof Element
      ? { element, top: controlViewportTop(element) }
      : null;
  pendingControlViewport = null;
  if (!anchor) return;

  const restore = () => {
    if (!anchor.element.isConnected) return;
    const delta = controlViewportTop(anchor.element) - anchor.top;
    if (Math.abs(delta) > 1) {
      window.scrollTo({ top: window.scrollY + delta, behavior: "instant" });
    }
  };
  const viewport = window.visualViewport;
  const restoreAfterViewportResize = () =>
    window.requestAnimationFrame(restore);
  viewport?.addEventListener("resize", restoreAfterViewportResize);
  const timer = window.setTimeout(() => {
    viewport?.removeEventListener("resize", restoreAfterViewportResize);
    stopControlViewportRestore = null;
  }, 600);
  stopControlViewportRestore = () => {
    window.clearTimeout(timer);
    viewport?.removeEventListener("resize", restoreAfterViewportResize);
    stopControlViewportRestore = null;
  };

  nextTick(() => {
    window.requestAnimationFrame(() => {
      restore();
      window.requestAnimationFrame(restore);
    });
  });
}

function handleConversionOptionsChange(event) {
  cancelScheduledTextareaResize();
  flushFmPreviewConversion();
  resetCopyStatus();
  if (isDirectionReversed.value) {
    fmTextDerivedFromUnicode.value = false;
    unicodeText.value = fmToUnicodePreservingNonSinhala(
      fmText.value,
      conjunctConversionOptions(),
    );
  } else {
    fmText.value = unicodeToFmPreservingNonSinhala(unicodeText.value, {
      ...conjunctConversionOptions(),
      compactDaForms: compactDaForms.value,
    });
    fmTextDerivedFromUnicode.value = true;
  }
  refreshFmPreview({ preserveSelection: isFmPreviewEditing.value });
  liveMessage.value = "已更新转换选项";
  stabilizeControlViewport(event);
}

function swapPanels(event) {
  cancelScheduledTextareaResize();
  flushFmPreviewConversion();
  isDirectionReversed.value = !isDirectionReversed.value;
  resetFmHistory();
  refreshFmPreview();
  liveMessage.value = "已交换源编码与目标编码位置";
  stabilizeControlViewport(event);
}

function handleGlobalKeydown(event) {
  if (
    event.repeat ||
    !event.ctrlKey ||
    !event.shiftKey ||
    event.altKey ||
    event.metaKey ||
    event.key.toLowerCase() !== "s"
  ) {
    return;
  }

  event.preventDefault();
  swapPanels();
}

function applyEncodingSuggestion() {
  flushFmPreviewConversion();
  resetCopyStatus();
  if (isDirectionReversed.value) {
    const sourceText = fmText.value;
    isDirectionReversed.value = false;
    unicodeText.value = sourceText;
    fmText.value = unicodeToFmPreservingNonSinhala(sourceText, {
      ...conjunctConversionOptions(),
      compactDaForms: compactDaForms.value,
    });
    fmTextDerivedFromUnicode.value = true;
  } else {
    const sourceText = unicodeText.value;
    isDirectionReversed.value = true;
    fmText.value = sourceText;
    fmTextDerivedFromUnicode.value = false;
    unicodeText.value = fmToUnicodePreservingNonSinhala(
      sourceText,
      conjunctConversionOptions(),
    );
  }
  resetFmHistory();
  refreshFmPreview();
  liveMessage.value = "已保留输入内容并交换转换方向";
  scheduleTextareaResize();
}

async function clearText() {
  window.clearTimeout(fmPreviewConversionTimer);
  fmPreviewConversionTimer = null;
  window.clearTimeout(fmCompositionCommitTimer);
  fmCompositionCommitTimer = null;
  clearExpectedFmClipboardInput();
  isFmPreviewComposing.value = false;
  fmCompositionHistoryEntry = null;
  unicodeText.value = "";
  fmText.value = "";
  fmTextDerivedFromUnicode.value = false;
  resetFmHistory();
  refreshFmPreview();
  resetCopyStatus();
  liveMessage.value = "内容已清空";
  await nextTick();
  resizeAllTextareas();
  if (isDirectionReversed.value) {
    fmPreviewInput.value?.focus();
  } else {
    unicodeInput.value?.focus();
  }
}

onMounted(() => {
  textareaViewportWidth = window.innerWidth;
  textareaViewportHeight = window.innerHeight;
  refreshFmPreview();
  resizeAllTextareas();
  document.fonts?.ready.then(scheduleTextareaResize);
  window.addEventListener("resize", handleWindowResize);
  window.addEventListener("keydown", handleGlobalKeydown);
});

onBeforeUnmount(() => {
  stopControlViewportRestore?.();
  unicodeFontRequest++;
  legacyFontRequest++;
  window.removeEventListener("resize", handleWindowResize);
  window.removeEventListener("keydown", handleGlobalKeydown);
  window.clearTimeout(resetCopyTimer);
  window.clearTimeout(fmPreviewConversionTimer);
  window.clearTimeout(fmCompositionCommitTimer);
  clearExpectedFmClipboardInput();
  if (textareaResizeFrame !== null) {
    window.cancelAnimationFrame(textareaResizeFrame);
  }
});

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

async function readClipboard() {
  if (!navigator.clipboard?.readText) {
    throw new Error("Clipboard read is unavailable");
  }

  return navigator.clipboard.readText();
}

async function pasteText(field) {
  resetCopyStatus();

  try {
    const text = await readClipboard();
    if (field === "unicode") {
      unicodeText.value = text;
      handleUnicodeInput();
    } else {
      fmText.value = text;
      handleFmInput();
    }

    pastedField.value = field;
    liveMessage.value =
      field === "unicode"
        ? "已从剪贴板粘贴 Unicode 文本"
        : "已从剪贴板粘贴 Legacy 编码文本";

    await nextTick();
    if (field === "unicode") {
      unicodeInput.value?.focus();
      unicodeInput.value?.setSelectionRange(text.length, text.length);
    } else {
      fmPreviewInput.value?.focus();
      restoreEditableSelection(fmPreviewInput.value, {
        start: text.length,
        end: text.length,
      });
    }
  } catch {
    pasteFailedField.value = field;
    liveMessage.value = "无法读取剪贴板，请允许剪贴板访问或手动粘贴";
  }

  resetCopyTimer = window.setTimeout(resetCopyStatus, 1800);
}

async function copyText(field) {
  if (field === "unicode" && isDirectionReversed.value) {
    flushFmPreviewConversion();
  }
  const text = field === "unicode" ? unicodeText.value : fmText.value;
  resetCopyStatus();

  try {
    await writeClipboard(text);
    copiedField.value = field;
    liveMessage.value =
      field === "unicode" ? "Unicode 文本已复制" : "Legacy 编码文本已复制";
  } catch {
    copyFailedField.value = field;
    liveMessage.value = "无法自动复制，请手动选择文本";
  }

  resetCopyTimer = window.setTimeout(resetCopyStatus, 1800);
}

async function legacyDocumentFontPair() {
  if (legacyFontId.value === "abhaya-legacy") {
    return {
      sinhala: legacyBold.value ? "FMAbabld" : "FMAbhaya",
      other: "Times New Roman",
      otherBold: false,
    };
  }
  if (legacyFontId.value === "gemunu-legacy") {
    return { sinhala: "FMGemunu", other: "Arial", otherBold: false };
  }
  const selected = await legacyFontSelect.value?.selectedDocumentFontInfo();
  const sinhala = selected?.family || "FMAbhaya";
  const isFmAbabld = isFmAbabldFont(sinhala);
  return {
    sinhala,
    other: /abhaya/iu.test(sinhala) || isFmAbabld ? "Times New Roman" : "Arial",
    otherBold: isFmAbabld,
  };
}

async function convertedLegacyDocumentSegments(text = unicodeText.value) {
  const { sinhala, other, otherBold } = await legacyDocumentFontPair();
  const sinhalaBold = legacyBold.value && !isFmAbabldFont(sinhala);
  return unicodeToFmSegments(text, {
    ...conjunctConversionOptions(),
    compactDaForms: compactDaForms.value,
  }).flatMap(({ text, useLegacyFont }) =>
    text
      .split(/([0-9]+)/gu)
      .filter(Boolean)
      .map((part) => {
        const isNumber = /^[0-9]+$/u.test(part);
        const isNonSinhala = !useLegacyFont && !isNumber;
        return {
          text: part,
          fontFamily: useLegacyFont || isNumber ? sinhala : other,
          bold: isNonSinhala ? legacyBold.value || otherBold : sinhalaBold,
          sizeHalfPoints: useLegacyFont || isNumber ? 28 : 24,
          noProof: true,
        };
      }),
  );
}

async function systemDocumentFont(serifFonts) {
  for (const family of serifFonts) {
    try {
      await new FontFace(family, `local(${JSON.stringify(family)})`).load();
      return family;
    } catch {
      // Continue to the next installed system font.
    }
  }
  return null;
}

async function unicodeDocumentFonts() {
  const [western, eastAsia, sinhala] = await Promise.all([
    systemDocumentFont([
      "Times New Roman",
      "Times",
      "Liberation Serif",
      "Noto Serif",
    ]),
    systemDocumentFont(["SimSun", "Songti SC", "Noto Serif CJK SC"]),
    systemDocumentFont([
      "Iskoola Pota",
      "Sinhala MN",
      "Noto Serif Sinhala",
      "LKLUG",
    ]),
  ]);
  return western && eastAsia && sinhala
    ? { ascii: western, hAnsi: western, eastAsia, cs: sinhala }
    : {
        ascii: "Times New Roman",
        hAnsi: "Times New Roman",
        eastAsia: "SimSun",
        cs: "Iskoola Pota",
      };
}

function convertedUnicodeDocumentSegments(text, fontFamilies) {
  return text
    .split(/([\u0D80-\u0DFF\u200C\u200D]+)/gu)
    .filter(Boolean)
    .map((part) => {
      const isSinhala = /^[\u0D80-\u0DFF\u200C\u200D]+$/u.test(part);
      return {
        text: part,
        fontFamilies,
        sizeHalfPoints: 24,
        complexSizeHalfPoints: 28,
        complexScript: isSinhala,
        language: "en-US",
        eastAsiaLanguage: "zh-CN",
        bidiLanguage: "si-LK",
      };
    });
}

async function setDocumentFile(file) {
  documentFile.value = file;
  documentText.value = "";
  documentDetectedEncoding.value = null;
  documentError.value = "";
  if (!file) return;
  documentBusy.value = true;
  try {
    const text = await readSinhalaDocument(file);
    if (documentFile.value !== file) return;
    if (!text.trim()) throw new Error("未读取到文字；扫描版 PDF 暂不支持");
    documentText.value = text;
    const detectedEncoding = detectSinhalaEncoding(text);
    documentDetectedEncoding.value = detectedEncoding;
    if (detectedEncoding) {
      isDirectionReversed.value = detectedEncoding === "legacy";
      resetFmHistory();
      refreshFmPreview();
    }
    liveMessage.value = detectedEncoding
      ? `已读取 ${file.name}，检测到${detectedEncoding === "legacy" ? "Legacy" : "Unicode"}编码`
      : `已读取 ${file.name}，未能识别源编码`;
  } catch (error) {
    if (documentFile.value === file) {
      documentError.value =
        error instanceof Error ? error.message : "文件读取失败";
      liveMessage.value = documentError.value;
    }
  } finally {
    if (documentFile.value === file) documentBusy.value = false;
  }
}

function handleDocumentSelection(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (file) setDocumentFile(file);
}

function handleDocumentDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDocumentDragging.value = false;
  }
}

function handleDocumentDrop(event) {
  isDocumentDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) setDocumentFile(file);
}

async function convertUploadedDocument() {
  if (!documentText.value.trim() || documentBusy.value) return;
  documentBusy.value = true;
  documentError.value = "";
  try {
    const target = isDirectionReversed.value ? "unicode" : "legacy";
    const segments = isDirectionReversed.value
      ? convertedUnicodeDocumentSegments(
          fmToUnicodePreservingNonSinhala(
            documentText.value,
            conjunctConversionOptions(),
          ),
          await unicodeDocumentFonts(),
        )
      : await convertedLegacyDocumentSegments(documentText.value);
    const blob = await createSinhalaDocx(segments);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${documentFile.value.name.replace(/\.(docx|pdf)$/iu, "")}-${target}.docx`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    liveMessage.value = "转换后的 DOCX 文档已下载";
  } catch {
    documentError.value = "文档转换失败，请重试";
    liveMessage.value = documentError.value;
  } finally {
    documentBusy.value = false;
  }
}

async function downloadDocument(field) {
  if (downloadingField.value) return;
  if (isDirectionReversed.value) flushFmPreviewConversion();
  if (!unicodeText.value && !fmText.value) return;

  downloadingField.value = field;
  try {
    const segments =
      field === "unicode"
        ? convertedUnicodeDocumentSegments(
            fmToUnicodePreservingNonSinhala(
              fmText.value,
              conjunctConversionOptions(),
            ),
            await unicodeDocumentFonts(),
          )
        : await convertedLegacyDocumentSegments();
    const blob = await createSinhalaDocx(segments);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sinhala-${field}.docx`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    liveMessage.value = `${field === "unicode" ? "Unicode" : "Legacy"} 文档已下载`;
  } catch {
    liveMessage.value = "文档生成失败，请重试";
  } finally {
    downloadingField.value = "";
  }
}

function copyLabel(field) {
  if (copiedField.value === field) return "已复制";
  if (copyFailedField.value === field) return "复制失败";
  return field === "unicode" ? "复制 Unicode 文本" : "复制 Legacy 编码文本";
}

function copyIcon(field) {
  return copiedField.value === field ? "ri-check-line" : "ri-file-copy-line";
}

function pasteLabel(field) {
  if (pastedField.value === field) return "已粘贴";
  if (pasteFailedField.value === field) return "粘贴失败";
  return "从剪贴板粘贴";
}

function pasteIcon(field) {
  if (pastedField.value === field) return "ri-check-line";
  if (pasteFailedField.value === field) return "ri-error-warning-line";
  return "ri-clipboard-line";
}
</script>
