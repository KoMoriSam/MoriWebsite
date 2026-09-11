<template>
  <ContentPage
    eyebrow="Image Converter"
    title="图片格式转换"
    description="批量转换、压缩、调整尺寸和添加水印。文件仅在当前浏览器中处理，不会上传。"
  >
    <div class="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="contents">
        <section
          v-if="selectedItem"
          class="min-w-0 space-y-2 overflow-hidden max-sm:sticky max-sm:top-2 max-sm:z-20 max-sm:rounded-box max-sm:border max-sm:border-base-300 max-sm:bg-base-100/95 max-sm:p-2 max-sm:shadow-sm max-sm:backdrop-blur"
        >
          <header class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="card-title font-serif">预览</h2>
            <span class="text-xs text-base-content/55">
              {{ selectedItem.width || "—" }} ×
              {{ selectedItem.height || "—" }}
              <template
                v-if="
                  selectedPreviewDimensions &&
                  (selectedPreviewDimensions.width !== selectedItem.width ||
                    selectedPreviewDimensions.height !== selectedItem.height)
                "
              >
                → {{ selectedPreviewDimensions.width }} ×
                {{ selectedPreviewDimensions.height }}</template
              >
            </span>
          </header>
          <div
            class="image-checker h-[clamp(12rem,25dvh,16rem)] overflow-hidden rounded-box border border-base-300 sm:h-[clamp(20rem,60vh,32rem)]"
          >
            <ImagePreview
              v-model:index="previewIndex"
              mode="inline"
              class="size-full"
              :slides="previewSlides"
              :aria-label="`${selectedItem.file.name}预览`"
            >
              <template #overlay>
                <canvas
                  v-if="watermark.enabled"
                  :ref="setWatermarkPreviewCanvas"
                  class="pointer-events-none absolute inset-0 size-full"
                  aria-hidden="true"
                ></canvas>
              </template>
            </ImagePreview>
          </div>
          <div
            v-if="selectedItem.frameCount > 1"
            class="space-y-1 text-xs text-base-content/60"
          >
            <div class="flex gap-2">
              <i class="ri-movie-2-line" aria-hidden="true"></i>
              <input
                v-model.number="previewFramePosition"
                class="range range-xs w-full"
                type="range"
                min="0"
                :max="Math.max(0, selectedPreviewFrames.length - 1)"
                :disabled="!selectedPreviewFrames.length"
                aria-label="动画帧进度"
              />
              <span class="tabular-nums"
                >{{ previewFramePosition + 1 }}/{{
                  selectedItem.frameCount
                }}</span
              >
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                class="btn btn-ghost btn-sm btn-circle"
                type="button"
                aria-label="上一帧"
                :disabled="!selectedPreviewFrames.length"
                @click="stepFrame(-1)"
              >
                <i class="ri-skip-back-mini-line" aria-hidden="true"></i>
              </button>
              <button
                class="btn btn-ghost btn-circle"
                type="button"
                :aria-label="isAnimationPlaying ? '暂停' : '播放'"
                :disabled="!selectedPreviewFrames.length"
                @click="toggleAnimation"
              >
                <i
                  :class="isAnimationPlaying ? 'ri-pause-line' : 'ri-play-line'"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                class="btn btn-ghost btn-sm btn-circle"
                type="button"
                aria-label="下一帧"
                :disabled="!selectedPreviewFrames.length"
                @click="stepFrame(1)"
              >
                <i class="ri-skip-forward-mini-line" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </section>

        <section
          class="min-w-0 transition-colors md:col-start-1 motion-reduce:transition-none"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent="onDragEnter"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <header class="flex flex-wrap items-center justify-between gap-3">
            <hgroup>
              <h2 class="card-title font-serif">文件队列</h2>
              <p class="text-sm text-base-content/55">
                {{
                  queue.length
                    ? queueSummary
                    : "支持 PNG、JPEG、WebP、AVIF、BMP 和 GIF，最多 100 个文件"
                }}
              </p>
            </hgroup>
            <div v-if="queue.length">
              <div
                class="tabs tabs-box tabs-sm"
                role="tablist"
                aria-label="文件队列显示模式"
              >
                <button
                  class="tab"
                  :class="queueViewMode === 'detailed' ? 'tab-active' : ''"
                  type="button"
                  role="tab"
                  :aria-selected="queueViewMode === 'detailed'"
                  aria-label="详细模式"
                  title="详细模式"
                  @click="queueViewMode = 'detailed'"
                >
                  <i class="ri-list-check-3" aria-hidden="true"></i>
                </button>
                <button
                  class="tab"
                  :class="queueViewMode === 'compact' ? 'tab-active' : ''"
                  type="button"
                  role="tab"
                  :aria-selected="queueViewMode === 'compact'"
                  aria-label="紧凑模式"
                  title="紧凑模式"
                  @click="queueViewMode = 'compact'"
                >
                  <i class="ri-list-unordered" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </header>

          <template v-if="queue.length || isLoadingFiles">
            <div
              class="relative my-2"
              :class="isLoadingFiles ? 'min-h-24' : ''"
            >
              <ul
                class="list max-h-[min(32rem,60dvh)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100 scrollbar-thin"
                :class="
                  dragging
                    ? 'border-dashed border-base-content bg-base-200/60'
                    : ''
                "
                :aria-busy="isLoadingFiles"
                aria-label="待转换图片"
              >
                <li
                  v-for="item in queue"
                  :key="item.id"
                  class="list-row relative items-center gap-3 rounded-none border-b border-base-300 transition-colors last:border-b-0 motion-reduce:transition-none"
                  :class="[
                    selectedId === item.id
                      ? 'bg-base-200'
                      : 'hover:bg-base-200/60',
                    queueViewMode === 'compact' ? 'gap-1.5 p-1.5' : '',
                  ]"
                  @click="selectedId = item.id"
                >
                  <img
                    :src="item.previewUrl"
                    alt=""
                    class="shrink-0 rounded-field object-cover image-checker"
                    :class="queueViewMode === 'compact' ? 'size-8' : 'size-14'"
                  />
                  <button
                    class="min-w-0 text-left focus-visible:rounded-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-base-content"
                    type="button"
                    :aria-label="`预览 ${item.file.name}`"
                    :aria-current="selectedId === item.id ? 'true' : undefined"
                    @click="selectedId = item.id"
                  >
                    <span
                      class="block truncate font-medium"
                      :class="
                        queueViewMode === 'compact'
                          ? 'text-sm leading-tight'
                          : ''
                      "
                      >{{ item.file.name }}</span
                    >
                    <p
                      v-if="queueViewMode === 'detailed'"
                      class="mt-1 truncate text-xs text-base-content/55"
                    >
                      {{
                        item.width
                          ? `${item.width} × ${item.height}`
                          : "读取尺寸中"
                      }}
                      <template v-if="item.frameCount > 1">
                        · {{ item.frameCount }} 帧</template
                      >
                      · {{ formatBytes(item.file.size) }}
                      <template v-if="item.resultSize">
                        → {{ formatBytes(item.resultSize) }} ·
                        {{ savingsLabel(item) }}</template
                      >
                    </p>
                    <div
                      v-if="
                        queueViewMode === 'detailed' &&
                        item.status === 'processing'
                      "
                      class="mt-2 flex items-center gap-2"
                    >
                      <progress
                        class="progress progress-primary w-full"
                        :value="item.progress"
                        max="100"
                      ></progress>
                      <span class="w-9 text-right text-xs tabular-nums"
                        >{{ item.progress }}%</span
                      >
                    </div>
                    <p
                      v-else-if="queueViewMode === 'detailed' && item.message"
                      class="mt-1 text-xs"
                      :class="
                        item.status === 'error'
                          ? 'text-error'
                          : 'text-base-content/55'
                      "
                    >
                      {{ item.message }}
                    </p>
                  </button>
                  <span
                    class="flex shrink-0 items-center self-center"
                    :class="queueViewMode === 'compact' ? 'gap-0.5' : 'gap-1'"
                    :aria-label="`${formatLabel(item.format)} 转换为 ${formatLabel(queueTargetFormat(item))}`"
                  >
                    <span class="badge badge-outline badge-xs">{{
                      formatLabel(item.format)
                    }}</span>
                    <i
                      class="ri-arrow-right-line text-base-content/40"
                      aria-hidden="true"
                    ></i>
                    <span
                      class="badge badge-xs"
                      :class="targetFormatBadgeClass(item)"
                    >
                      {{ formatLabel(queueTargetFormat(item)) }}
                    </span>
                  </span>
                  <div
                    class="flex shrink-0 items-center"
                    :class="queueViewMode === 'compact' ? 'gap-0' : 'gap-1'"
                  >
                    <span
                      class="tooltip tooltip-left"
                      :class="
                        queueViewMode === 'compact'
                          ? 'inline-flex size-6 items-center justify-center'
                          : 'm-2'
                      "
                      :data-tip="statusLabel(item.status)"
                      :aria-label="statusLabel(item.status)"
                      role="img"
                    >
                      <i
                        :class="statusIcon(item.status)"
                        aria-hidden="true"
                      ></i>
                    </span>
                    <button
                      v-if="item.status === 'done'"
                      class="btn btn-square btn-ghost"
                      :class="queueViewMode === 'compact' ? 'btn-xs' : 'btn-sm'"
                      type="button"
                      aria-label="下载转换结果"
                      @click.stop="downloadItem(item)"
                    >
                      <i class="ri-download-2-line" aria-hidden="true"></i>
                    </button>
                    <button
                      v-if="
                        item.status === 'error' || item.status === 'cancelled'
                      "
                      class="btn btn-square btn-ghost"
                      :class="queueViewMode === 'compact' ? 'btn-xs' : 'btn-sm'"
                      type="button"
                      aria-label="重新转换"
                      @click.stop="retryItem(item)"
                    >
                      <i class="ri-restart-line" aria-hidden="true"></i>
                    </button>
                    <button
                      class="btn btn-square btn-ghost"
                      :class="queueViewMode === 'compact' ? 'btn-xs' : 'btn-sm'"
                      type="button"
                      :disabled="item.status === 'processing'"
                      aria-label="移除文件"
                      @click.stop="removeItem(item.id)"
                    >
                      <i class="ri-close-line" aria-hidden="true"></i>
                    </button>
                  </div>
                  <progress
                    v-if="
                      queueViewMode === 'compact' &&
                      item.status === 'processing'
                    "
                    class="progress progress-primary absolute inset-x-0 bottom-0 h-1 w-full rounded-none"
                    :value="item.progress"
                    max="100"
                  ></progress>
                </li>
              </ul>
              <div
                v-if="isLoadingFiles"
                class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-box bg-black/50 text-sm text-white text-shadow-xs"
                role="status"
                aria-live="polite"
              >
                <span
                  class="loading loading-spinner loading-md"
                  aria-hidden="true"
                ></span>
                <span>
                  已加载
                  <span class="tabular-nums"
                    >{{ loadedFileCount }}/{{ loadingFileTotal }}</span
                  >
                </span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="btn btn-sm min-w-52 flex-1"
                :class="
                  !canAddFiles
                    ? 'btn-disabled'
                    : dragging
                      ? 'btn-dash'
                      : 'btn-outline'
                "
                :aria-disabled="!canAddFiles"
              >
                <i
                  :class="
                    isQueueFull
                      ? 'ri-inbox-archive-line'
                      : dragging
                        ? 'ri-multi-image-line'
                        : 'ri-image-add-line'
                  "
                  aria-hidden="true"
                ></i>
                {{
                  isQueueFull
                    ? "队列已满，无法继续添加"
                    : dragging
                      ? "松开完成拖放"
                      : "拖放或继续选择图片"
                }}
                <input
                  class="sr-only"
                  type="file"
                  multiple
                  :disabled="!canAddFiles"
                  accept=".png,.jpg,.jpeg,.webp,.avif,.bmp,.gif,image/png,image/jpeg,image/webp,image/avif,image/bmp,image/gif"
                  @change="onFileInput"
                />
              </label>
              <div class="ms-auto flex shrink-0 gap-2">
                <button
                  v-if="isRunning || canDownloadAll"
                  class="btn btn-primary btn-sm"
                  type="button"
                  :disabled="isRunning"
                  @click="downloadAll"
                >
                  <template v-if="isRunning">
                    <span
                      class="loading loading-spinner loading-xs"
                      aria-hidden="true"
                    ></span>
                    转换中
                    <span class="inline-block w-[4ch] text-right tabular-nums">
                      {{ conversionProgress }}%
                    </span>
                  </template>
                  <template v-else>
                    <i class="ri-file-zip-line" aria-hidden="true"></i>下载全部
                  </template>
                </button>
                <button
                  class="btn btn-sm"
                  type="button"
                  :disabled="
                    isRunning || isLoadingFiles || !successfulItems.length
                  "
                  @click="resetQueue"
                >
                  <i class="ri-refresh-line" aria-hidden="true"></i>重置状态
                </button>
                <button
                  class="btn btn-sm"
                  type="button"
                  :disabled="isRunning || isLoadingFiles"
                  @click="clearQueue"
                >
                  <i class="ri-delete-bin-line" aria-hidden="true"></i>清空
                </button>
              </div>
            </div>
          </template>
          <div
            v-else
            class="card card-dash border-base-content bg-base-100 my-2"
            :class="dragging ? 'border-base-content/50 bg-base-200/60' : ''"
          >
            <div class="card-body items-center text-center">
              <span
                class="flex size-12 items-center justify-center rounded-box bg-base-200 text-2xl"
                aria-hidden="true"
              >
                <i
                  :class="
                    dragging ? `ri-multi-image-line` : `ri-image-add-line`
                  "
                  aria-hidden="true"
                ></i>
              </span>
              <div>
                <h3 class="font-serif text-lg font-bold">
                  {{ dragging ? `松开完成拖放` : `拖放图片到这里` }}
                </h3>
                <p class="mt-1 text-sm text-base-content/60">
                  添加后可在上方查看预览，在这里管理转换队列
                </p>
              </div>
              <label
                class="btn btn-sm"
                :class="
                  isRunning
                    ? 'btn-disabled'
                    : dragging
                      ? 'btn-dash'
                      : 'btn-outline'
                "
              >
                <i
                  :class="
                    dragging ? 'ri-image-add-line' : 'ri-folder-open-line'
                  "
                  aria-hidden="true"
                ></i>
                {{ dragging ? `添加图片` : `选择图片` }}
                <input
                  class="sr-only"
                  type="file"
                  multiple
                  :disabled="isRunning"
                  accept=".png,.jpg,.jpeg,.webp,.avif,.bmp,.gif,image/png,image/jpeg,image/webp,image/avif,image/bmp,image/gif"
                  @change="onFileInput"
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      <fieldset
        class="fieldset rounded-box border border-base-300 bg-base-100 p-4 md:sticky md:top-4 md:col-start-2 md:row-span-2 md:row-start-1"
      >
        <legend class="fieldset-legend p-0">转换设置</legend>

        <div class="flex min-h-0 flex-col gap-1.5 md:max-h-[calc(100dvh-5rem)]">
          <div class="grid shrink-0 grid-cols-4 gap-x-4 gap-y-3">
            <div
              class="grid min-w-0 content-start"
              :class="
                hasQualityControl ||
                settings.format === 'png' ||
                !IMAGE_FORMATS[settings.format].alpha ||
                settings.format === 'gif'
                  ? 'col-span-2'
                  : staticOutput && hasAnimatedInput
                    ? 'col-span-2'
                    : 'col-span-4'
              "
            >
              <label class="label" for="format">输出格式</label>
              <select
                id="format"
                v-model="settings.format"
                class="select max-sm:select-sm w-full"
                :disabled="isRunning"
              >
                <option
                  v-for="(meta, value) in IMAGE_FORMATS"
                  :key="value"
                  :value="value"
                >
                  {{ meta.label }}
                </option>
              </select>
            </div>

            <div
              v-if="hasQualityControl"
              class="grid min-w-0 content-start col-span-2"
            >
              <label class="label" for="quality">
                <span>质量</span>
                <span class="tabular-nums">
                  {{
                    settings.format !== "jpeg" && settings.lossless
                      ? "无损"
                      : settings.quality
                  }}
                </span>
              </label>
              <input
                id="quality"
                v-model.number="settings.quality"
                class="range sm:range-xl mt-1 w-full"
                type="range"
                min="1"
                max="100"
                :disabled="
                  isRunning || (settings.format !== 'jpeg' && settings.lossless)
                "
              />
            </div>
            <div
              v-if="settings.format === 'png'"
              class="grid min-w-0 content-start col-span-2"
            >
              <label class="label" for="png-level">
                <span v-if="!settings.pngOptimize">优化被禁用</span>
                <span v-else>
                  优化等级
                  <span class="tabular-nums">{{ settings.pngLevel }}</span>
                </span>
              </label>
              <input
                id="png-level"
                v-model.number="settings.pngLevel"
                class="range sm:range-xl mt-1 w-full"
                type="range"
                min="0"
                max="6"
                :disabled="isRunning || !settings.pngOptimize"
              />
            </div>
            <div
              v-if="settings.format === 'gif'"
              class="grid min-w-0 content-start col-span-2"
            >
              <label class="label" for="gif-colors">
                <span>调色板颜色</span>
                <span class="tabular-nums">{{ settings.gifColors }}</span>
              </label>
              <input
                id="gif-colors"
                v-model.number="settings.gifColors"
                class="range sm:range-xl mt-1 w-full"
                type="range"
                min="16"
                max="256"
                step="16"
                :disabled="isRunning"
              />
            </div>
            <div
              v-if="staticOutput && hasAnimatedInput"
              class="grid min-w-0 content-start"
              :class="
                ['avif', 'png'].includes(settings.format) ||
                (!IMAGE_FORMATS[settings.format].alpha &&
                  settings.format !== 'jpeg')
                  ? 'col-span-4'
                  : 'col-span-2'
              "
            >
              <label class="label" for="animation-mode">动画来源</label>
              <select
                id="animation-mode"
                v-model="settings.animationMode"
                class="select max-sm:select-sm w-full"
                :disabled="isRunning"
              >
                <option value="frames">逐帧输出 ZIP</option>
                <option value="first">仅输出第一帧</option>
              </select>
            </div>
            <div
              v-if="!IMAGE_FORMATS[settings.format].alpha"
              class="grid min-w-0 content-start"
              :class="
                settings.format === 'bmp'
                  ? 'col-span-2 col-start-3 row-start-1'
                  : staticOutput && hasAnimatedInput
                    ? 'col-span-2 col-start-3 row-start-2'
                    : 'col-span-2'
              "
            >
              <label class="label" for="background-color">
                透明区域填充
                <span class="font-mono text-xs">
                  {{ settings.backgroundColor }}
                </span>
              </label>
              <input
                v-model="settings.backgroundColor"
                class="input max-sm:input-sm p-0"
                type="color"
                :disabled="isRunning"
              />
            </div>
          </div>

          <div class="grid shrink-0 gap-2 [&>*+.label]:mt-2">
            <div class="divider mt-2 mb-0">更多设置</div>

            <div class="grid gap-3 sm:gap-6 grid-flow-col auto-cols-fr">
              <label
                v-if="['webp', 'avif'].includes(settings.format)"
                class="label"
                for="lossless"
              >
                <input
                  id="lossless"
                  v-model="settings.lossless"
                  class="toggle toggle-sm"
                  type="checkbox"
                  :disabled="isRunning"
                />
                无损压缩
              </label>

              <label
                v-if="settings.format === 'png'"
                class="label"
                for="png-optimize"
              >
                <input
                  id="png-optimize"
                  v-model="settings.pngOptimize"
                  class="toggle toggle-sm"
                  type="checkbox"
                  :disabled="isRunning"
                />
                无损优化
              </label>

              <label class="label" for="resize">
                <input
                  id="resize"
                  v-model="settings.resize.enabled"
                  class="toggle toggle-sm"
                  type="checkbox"
                  :disabled="isRunning"
                />
                调整尺寸
              </label>

              <label class="label" for="watermark">
                <input
                  id="watermark"
                  v-model="watermark.enabled"
                  class="toggle toggle-sm"
                  type="checkbox"
                  :disabled="isRunning"
                />
                添加水印
              </label>
            </div>
          </div>

          <div
            class="-m-1 grid min-h-0 flex-1 content-start gap-2 p-1 md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain md:scrollbar-thin [&>*+.label]:mt-2"
          >
            <section
              v-if="settings.resize.enabled"
              class="grid gap-1"
              aria-labelledby="resize-settings"
            >
              <div class="divider mt-2 mb-0">尺寸设置</div>
              <div
                class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2"
              >
                <div class="min-w-0">
                  <label class="label" for="resize-width">宽度</label>
                  <label class="input max-sm:input-sm w-full">
                    <input
                      id="resize-width"
                      class="min-w-0 grow"
                      type="number"
                      min="1"
                      max="32768"
                      :value="settings.resize.width"
                      :disabled="isRunning"
                      @input="
                        updateResizeDimension('width', $event.target.value)
                      "
                    />
                    <span class="text-xs text-base-content/50">px</span>
                  </label>
                </div>
                <label
                  class="tooltip tooltip-top"
                  for="resize-lock-aspect-ratio"
                  :data-tip="
                    settings.resize.lockAspectRatio
                      ? '宽高比已锁定'
                      : '宽高比未锁定'
                  "
                >
                  <button
                    class="btn btn-square btn-xs sm:btn-sm mb-1 sm:mb-1.25"
                    :class="
                      settings.resize.lockAspectRatio
                        ? 'btn-active'
                        : 'btn-ghost'
                    "
                    type="button"
                    :aria-label="
                      settings.resize.lockAspectRatio
                        ? '解除宽高比锁定'
                        : '锁定原图宽高比'
                    "
                    :aria-pressed="settings.resize.lockAspectRatio"
                    :title="
                      settings.resize.lockAspectRatio
                        ? '宽高比已锁定'
                        : '宽高比未锁定'
                    "
                    :disabled="isRunning"
                    @click="toggleResizeAspectRatio"
                  >
                    <i
                      :class="
                        settings.resize.lockAspectRatio
                          ? 'ri-link-m'
                          : 'ri-link-unlink-m'
                      "
                      aria-hidden="true"
                    ></i>
                  </button>
                </label>
                <div class="min-w-0">
                  <label class="label" for="resize-height">高度</label>
                  <label class="input max-sm:input-sm w-full">
                    <input
                      id="resize-height"
                      class="min-w-0 grow"
                      type="number"
                      min="1"
                      max="32768"
                      :value="settings.resize.height"
                      :disabled="isRunning"
                      @input="
                        updateResizeDimension('height', $event.target.value)
                      "
                    />
                    <span class="text-xs text-base-content/50">px</span>
                  </label>
                </div>
              </div>
              <label class="label">
                <input
                  v-model="settings.resize.preventUpscale"
                  class="toggle toggle-sm"
                  type="checkbox"
                  :disabled="isRunning"
                />
                输出尺寸不超过原图
              </label>
            </section>

            <div v-show="watermark.enabled" class="grid gap-1">
              <div class="divider mt-2 mb-0">水印设置</div>
              <section class="grid gap-y-2">
                <div
                  class="grid grid-cols-[minmax(0,1fr)_auto] justify-between gap-x-3 gap-y-2"
                >
                  <div
                    class="min-w-0"
                    :class="watermark.mode === 'single' ? '' : 'col-span-2'"
                  >
                    <label for="watermark-content" class="label"
                      >水印内容</label
                    >
                    <div
                      id="watermark-content"
                      class="flex mt-1 mb-3 sm:mt-1.5 sm:mb-3.5"
                      :class="
                        watermark.mode === 'single'
                          ? 'justify-between'
                          : 'gap-4'
                      "
                      role="group"
                    >
                      <label class="label" for="watermark-text-toggle">
                        <input
                          id="watermark-text-toggle"
                          class="checkbox max-sm:checkbox-sm"
                          type="checkbox"
                          :checked="watermarkContainsText()"
                          :disabled="isRunning"
                          @change="setWatermarkTextEnabled($event)"
                        />
                        文字
                      </label>
                      <label class="label" for="watermark-image-toggle">
                        <input
                          id="watermark-image-toggle"
                          class="checkbox max-sm:checkbox-sm"
                          type="checkbox"
                          :checked="watermarkUsesGraphicKind('image')"
                          :disabled="isRunning"
                          @change="setWatermarkGraphicEnabled('image', $event)"
                        />
                        图片
                      </label>
                      <label class="label" for="watermark-icon-toggle">
                        <input
                          id="watermark-icon-toggle"
                          class="checkbox max-sm:checkbox-sm"
                          type="checkbox"
                          :checked="watermarkUsesGraphicKind('icon')"
                          :disabled="isRunning"
                          @change="setWatermarkGraphicEnabled('icon', $event)"
                        />
                        图标
                      </label>
                    </div>
                  </div>

                  <div
                    v-if="watermark.mode === 'single'"
                    class="row-span-2 min-w-0 border-l border-base-300 pl-3"
                  >
                    <span class="label">位置</span>
                    <div
                      class="grid w-fit grid-cols-3 gap-1"
                      role="radiogroup"
                      aria-label="水印位置"
                    >
                      <input
                        v-for="position in watermarkPositions"
                        :key="position"
                        class="radio radio-lg sm:radio-xl"
                        :class="
                          watermark.position === position ? 'radio-primary' : ''
                        "
                        type="radio"
                        role="radio"
                        name="watermark-position"
                        :checked="watermark.position === position"
                        :aria-checked="watermark.position === position"
                        :aria-label="positionLabel(position)"
                        :disabled="isRunning"
                        @click="watermark.position = position"
                      />
                    </div>
                  </div>

                  <div
                    class="min-w-0"
                    :class="
                      watermark.mode === 'single' ? 'col-start-1' : 'col-span-2'
                    "
                  >
                    <label class="label" for="watermark-mode">排列方式</label>
                    <select
                      id="watermark-mode"
                      v-model="watermark.mode"
                      class="select max-sm:select-sm w-full"
                      :disabled="isRunning"
                    >
                      <option value="single">单点</option>
                      <option value="tile">平铺</option>
                    </select>
                  </div>
                </div>

                <div
                  v-if="watermarkContainsText()"
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
                >
                  <div class="min-w-0">
                    <label class="label" for="watermark-text">文本</label>
                    <input
                      id="watermark-text"
                      v-model="watermark.text"
                      class="input max-sm:input-sm w-full"
                      type="text"
                      maxlength="80"
                      placeholder="输入水印文本"
                      :disabled="isRunning"
                    />
                  </div>
                  <div>
                    <label class="label" for="watermark-text-color">颜色</label>
                    <input
                      id="watermark-text-color"
                      v-model="watermark.color"
                      class="block input size-10 max-sm:size-8 p-0"
                      type="color"
                      :disabled="isRunning"
                    />
                  </div>
                </div>

                <div v-if="watermarkContainsText()" class="min-w-0">
                  <span class="label">字体</span>
                  <FontSelect
                    ref="watermarkFontSelect"
                    v-model="watermark.fontId"
                    v-model:fallback-font-id="watermark.fallbackFontId"
                    :website-fonts="websiteWatermarkFonts"
                    :disabled="isRunning"
                    aria-label="水印字体"
                  />
                </div>

                <div v-if="watermarkNeedsGraphic()" class="min-w-0">
                  <div v-if="usesWatermarkImageFile()">
                    <label class="label" for="watermark-graphic-image">
                      图片（默认为本站 Icon）
                    </label>
                    <input
                      id="watermark-graphic-image"
                      class="file-input max-sm:file-input-sm w-full"
                      type="file"
                      accept="image/*,.svg,image/svg+xml"
                      :aria-describedby="
                        usesDefaultWatermark
                          ? 'watermark-source-hint'
                          : undefined
                      "
                      :disabled="isRunning"
                      @change="onWatermarkFile"
                    />
                  </div>

                  <div v-else>
                    <div
                      class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
                    >
                      <div class="min-w-0">
                        <span class="label">图标选择器</span>
                        <button
                          class="select max-sm:select-sm w-full justify-start font-normal"
                          popovertarget="watermark-icon-picker"
                          style="anchor-name: --watermark-icon-picker"
                          type="button"
                          :disabled="isRunning"
                        >
                          <i
                            :class="watermark.icon"
                            class="text-lg"
                            aria-hidden="true"
                          ></i>
                          <span class="truncate">{{ watermark.icon }}</span>
                        </button>
                      </div>
                      <div v-if="!watermarkContainsText()">
                        <label class="label" for="watermark-graphic-color">
                          颜色
                        </label>
                        <input
                          id="watermark-graphic-color"
                          v-model="watermark.color"
                          class="block input size-10 max-sm:size-8 p-0"
                          type="color"
                          :disabled="isRunning"
                        />
                      </div>
                    </div>

                    <div
                      id="watermark-icon-picker"
                      ref="iconPicker"
                      popover
                      class="dropdown dropdown-end z-40 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
                      style="position-anchor: --watermark-icon-picker"
                      @keydown.esc="closeIconPicker"
                      @toggle="
                        !$event.currentTarget.matches(':popover-open') &&
                        hideIconTooltip(true)
                      "
                      @pointerleave="hideIconTooltip()"
                    >
                      <div
                        class="mb-2 grid grid-cols-[minmax(0,1fr)_6rem] gap-2"
                      >
                        <input
                          v-model.trim="iconSearch"
                          class="input input-sm w-full"
                          type="search"
                          placeholder="搜索名称或关键词"
                          aria-label="搜索 Remix Icon 名称或关键词"
                        />
                        <select
                          v-model="remixIconCategory"
                          class="select select-sm w-full"
                          aria-label="Remix Icon 分类"
                        >
                          <option value="all">全部分类</option>
                          <option
                            v-for="category in remixIconCategories"
                            :key="category.value"
                            :value="category.value"
                          >
                            {{ category.label }}
                          </option>
                        </select>
                      </div>
                      <div
                        v-if="filteredRemixIcons.length"
                        class="grid max-h-52 grid-cols-6 gap-1 overflow-x-hidden overflow-y-auto overscroll-contain"
                        role="listbox"
                        aria-label="Remix Icon 图标"
                        @scroll.passive="hideIconTooltip(true)"
                      >
                        <button
                          v-for="icon in filteredRemixIcons"
                          :key="icon"
                          class="btn btn-ghost btn-square btn-sm"
                          :class="watermark.icon === icon ? 'btn-active' : ''"
                          type="button"
                          role="option"
                          :aria-selected="watermark.icon === icon"
                          :aria-label="icon"
                          @focus="showIconTooltip(icon, $event)"
                          @blur="hideIconTooltip()"
                          @pointerenter="showIconTooltip(icon, $event)"
                          @click="selectRemixIcon(icon)"
                        >
                          <i
                            :class="icon"
                            class="text-lg"
                            aria-hidden="true"
                          ></i>
                        </button>
                      </div>
                      <p
                        v-else
                        class="py-4 text-center text-sm text-base-content/55"
                      >
                        没有匹配的图标
                      </p>
                    </div>
                    <div
                      ref="iconTooltip"
                      popover="manual"
                      class="watermark-icon-tooltip tooltip tooltip-top pointer-events-none z-50 size-0"
                      style="
                        position: fixed;
                        inset: auto;
                        margin: 0;
                        overflow: visible;
                        border: 0;
                        padding: 0;
                        background: transparent;
                      "
                      data-tip=""
                      role="tooltip"
                      aria-hidden="true"
                    ></div>
                  </div>
                </div>
              </section>
              <section aria-labelledby="watermark-appearance" class="mt-2">
                <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-1">
                  <div class="min-w-0">
                    <label class="label" for="watermark-opacity">
                      <span>透明度</span>
                      <span class="tabular-nums">
                        {{ Math.round(watermark.opacity * 100) }}%
                      </span>
                    </label>
                    <input
                      id="watermark-opacity"
                      v-model.number="watermark.opacity"
                      class="range max-sm:range-sm"
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      :disabled="isRunning"
                    />
                  </div>
                  <div class="min-w-0">
                    <label class="label" for="watermark-scale">
                      <span>缩放</span>
                      <span class="tabular-nums">
                        {{ Math.round(watermark.scale * 100) }}%
                      </span>
                    </label>
                    <input
                      id="watermark-scale"
                      v-model.number="watermark.scale"
                      class="range max-sm:range-sm"
                      type="range"
                      min="0.02"
                      max="0.5"
                      step="0.01"
                      :disabled="isRunning"
                    />
                  </div>
                  <div v-if="watermark.mode === 'single'" class="min-w-0">
                    <label class="label" for="watermark-margin">
                      <span>边距</span>
                      <span class="tabular-nums"
                        >{{ watermark.margin }} px</span
                      >
                    </label>
                    <input
                      id="watermark-margin"
                      v-model.number="watermark.margin"
                      class="range max-sm:range-sm"
                      type="range"
                      min="0"
                      max="160"
                      :disabled="isRunning"
                    />
                  </div>
                  <div class="min-w-0">
                    <label class="label" for="watermark-offset-x">
                      <span>X 偏移</span>
                      <span class="tabular-nums"
                        >{{ watermark.offsetX }} px</span
                      >
                    </label>
                    <input
                      id="watermark-offset-x"
                      v-model.number="watermark.offsetX"
                      class="range max-sm:range-sm"
                      type="range"
                      min="-1000"
                      max="1000"
                      :disabled="isRunning"
                    />
                  </div>
                  <div class="min-w-0">
                    <label class="label" for="watermark-offset-y">
                      <span>Y 偏移</span>
                      <span class="tabular-nums"
                        >{{ watermark.offsetY }} px</span
                      >
                    </label>
                    <input
                      id="watermark-offset-y"
                      v-model.number="watermark.offsetY"
                      class="range max-sm:range-sm"
                      type="range"
                      min="-1000"
                      max="1000"
                      :disabled="isRunning"
                    />
                  </div>
                  <div v-if="watermark.mode === 'tile'" class="min-w-0">
                    <label class="label" for="watermark-gap">
                      <span>间距</span>
                      <span class="tabular-nums">{{ watermark.gap }} px</span>
                    </label>
                    <input
                      id="watermark-gap"
                      v-model.number="watermark.gap"
                      class="range max-sm:range-sm"
                      type="range"
                      min="8"
                      max="320"
                      :disabled="isRunning"
                    />
                  </div>
                  <div class="min-w-0">
                    <label class="label" for="watermark-rotation">
                      <span>旋转</span>
                      <span class="tabular-nums"
                        >{{ watermark.rotation }}°</span
                      >
                    </label>
                    <input
                      id="watermark-rotation"
                      v-model.number="watermark.rotation"
                      class="range max-sm:range-sm"
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      :disabled="isRunning"
                    />
                  </div>
                  <label class="label" for="watermark-other">其他设置</label>
                  <div class="min-w-0" id="watermark-other">
                    <label class="label" for="watermark-shadow">
                      <input
                        id="watermark-shadow"
                        v-model="watermark.shadow"
                        class="toggle toggle-sm"
                        type="checkbox"
                        :disabled="isRunning"
                      />
                      水印阴影
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div class="mt-2 grid shrink-0 grid-cols-1 gap-2">
            <button
              v-if="isRunning"
              class="btn"
              type="button"
              @click="cancelConversion"
            >
              <i class="ri-stop-circle-line" aria-hidden="true"></i>取消转换
            </button>
            <button
              v-else
              class="btn btn-primary"
              type="button"
              :disabled="!queue.length || !readyItems.length || isLoadingFiles"
              @click="startConversion"
            >
              <i class="ri-magic-line" aria-hidden="true"></i>开始转换
            </button>
          </div>
        </div>
      </fieldset>
    </div>
  </ContentPage>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import "@/assets/font/reader-fonts.css";
import ContentPage from "@/components/layout/ContentPage.vue";
import FontSelect from "@/components/ui/FontSelect.vue";
import ImagePreview from "@/components/ui/ImagePreview.vue";
import { useToast } from "@/composables/useToast";
import { FONTS } from "@/constants/reader";
import remixIconTags from "@/data/remixicon-tags.json";
import {
  calculateWatermarkBaseSize,
  calculateWatermarkGraphicSize,
  drawImageWatermark,
} from "@/utils/image-watermark";
import {
  IMAGE_FORMATS,
  calculateOutputDimensions,
  detectImageFormat,
  estimateDecodedBytes,
  formatBytes,
  getDefaultMemoryLimit,
  isAnimatedWebP,
  makeUniqueName,
  readImageDimensions,
} from "@/utils/image-converter";

const MAX_FILES = 100;
const SMALL_SCREEN_QUERY = "(max-width: 639px)";
const DEFAULT_WATERMARK_URL = `${import.meta.env.BASE_URL}favicon.webp`;
const MAX_WATERMARK_STAMP_PIXELS = 16_000_000;
const MAX_WATERMARK_STAMP_SIDE = 8192;
const websiteWatermarkFonts = FONTS.map(({ name, style }) => ({
  id: `site:${style}`,
  label: name,
  style,
  cssVariable: `--${style}`,
  supportsFontWeight: ["font-sans", "font-serif", "font-kai"].includes(style),
}));
const FEATURED_REMIX_ICONS = [
  "ri-image-line",
  "ri-copyright-line",
  "ri-leaf-line",
  "ri-sparkling-2-line",
  "ri-star-line",
  "ri-heart-line",
  "ri-camera-line",
  "ri-brush-line",
  "ri-pencil-line",
  "ri-at-line",
  "ri-global-line",
  "ri-shield-check-line",
];
const REMIX_ICON_CATEGORY_LABELS = {
  Arrows: "箭头",
  Buildings: "建筑",
  Business: "商务",
  Communication: "沟通",
  Design: "设计",
  Development: "开发",
  Device: "设备",
  Document: "文档",
  Editor: "编辑",
  Finance: "金融",
  Food: "餐饮",
  "Game & Sports": "游戏与运动",
  "Health & Medical": "健康与医疗",
  Logos: "品牌标志",
  Map: "地图",
  Media: "媒体",
  System: "系统",
  "User & Faces": "用户与表情",
  Weather: "天气",
  Others: "其他",
};
const REMIX_ICON_TAG_INDEX = new Map();
for (const [category, icons] of Object.entries(remixIconTags)) {
  for (const [name, keywords] of Object.entries(icons))
    REMIX_ICON_TAG_INDEX.set(name, {
      category,
      keywords: keywords.toLocaleLowerCase(),
    });
}
const remixIconCategories = Object.keys(remixIconTags).map((value) => ({
  value,
  label: REMIX_ICON_CATEGORY_LABELS[value] || value,
}));
const toast = useToast();
const queue = ref([]);
const queueViewMode = ref("detailed");
const selectedId = ref(null);
const dragging = ref(false);
const isRunning = ref(false);
const isLoadingFiles = ref(false);
const loadedFileCount = ref(0);
const loadingFileTotal = ref(0);
const currentJobId = ref(null);
const worker = ref(null);
const watermarkPreviewCanvas = ref(null);
const defaultWatermarkFile = ref(null);
const watermarkFontSelect = ref(null);
const iconPicker = ref(null);
const iconTooltip = ref(null);
const iconSearch = ref("");
const remixIconCategory = ref("all");
const remixIcons = ref([...FEATURED_REMIX_ICONS]);
const pendingJobs = new Map();
const watermarkTextStampPromises = new Map();
let previewRenderVersion = 0;
let watermarkBitmap = null;
let watermarkBitmapKey = null;
let watermarkIconBlob = null;
let watermarkIconBlobKey = "";
const svgWatermarkImagePromises = new WeakMap();
const svgWatermarkRasterPromises = new WeakMap();
let iconTooltipOpenFrame = 0;
let iconTooltipHideFrame = 0;
let iconTooltipCloseTimer = 0;
let nextId = 1;
let animationPreviewTimer = null;
let resizeAspectAnchor = "width";
let resizeDimensionsModified = false;

const settings = reactive({
  format: "webp",
  quality: 82,
  lossless: false,
  pngOptimize: true,
  pngLevel: 2,
  avifSpeed: 6,
  gifColors: 256,
  gifAlphaThreshold: 128,
  animationMode: "frames",
  backgroundColor: "#ffffff",
  resize: {
    enabled: false,
    mode: "width",
    width: 1920,
    height: 1080,
    lockAspectRatio: true,
    preventUpscale: true,
  },
});

const watermark = reactive({
  enabled: false,
  kind: "image-text",
  text: "",
  fontId: "site:font-serif",
  fallbackFontId: "site:font-sans",
  file: null,
  graphicKind: "image",
  icon: "ri-image-line",
  mode: "single",
  position: "bottom-right",
  opacity: 0.75,
  scale: 0.05,
  shadow: true,
  margin: 24,
  offsetX: 0,
  offsetY: 0,
  gap: 160,
  rotation: 0,
  color: "#ffffff",
});

const watermarkPositions = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];
const usesDefaultWatermark = computed(
  () =>
    Boolean(defaultWatermarkFile.value) &&
    watermark.file === defaultWatermarkFile.value,
);
const remixIconCatalog = computed(() =>
  remixIcons.value.map((icon) => {
    const name = icon.slice(3);
    const baseName = name.replace(/-(?:line|fill)$/, "");
    const metadata = REMIX_ICON_TAG_INDEX.get(baseName);
    return {
      icon,
      category: metadata?.category || "Others",
      searchText: `${name},${baseName},${metadata?.keywords || ""}`,
    };
  }),
);
const filteredRemixIcons = computed(() => {
  const query = iconSearch.value.toLocaleLowerCase().replace(/^ri-/, "").trim();
  if (!query && remixIconCategory.value === "all") return FEATURED_REMIX_ICONS;
  const terms = query.split(/\s+/).filter(Boolean);
  return remixIconCatalog.value
    .filter(
      ({ category, searchText }) =>
        (remixIconCategory.value === "all" ||
          category === remixIconCategory.value) &&
        terms.every((term) => searchText.includes(term)),
    )
    .map(({ icon }) => icon)
    .slice(0, 72);
});
const isQueueFull = computed(() => queue.value.length >= MAX_FILES);
const canAddFiles = computed(
  () => !isRunning.value && !isLoadingFiles.value && !isQueueFull.value,
);
const selectedItem = computed(
  () => queue.value.find((item) => item.id === selectedId.value) || null,
);
const selectedItemIndex = computed(() =>
  queue.value.findIndex((item) => item.id === selectedId.value),
);
const getPreviewFrames = (item) => {
  if (!item) return [];
  if (
    !watermark.enabled &&
    item.status === "done" &&
    item.resultPreviewFrames.length
  ) {
    return item.resultPreviewFrames;
  }
  return item.previewFrames;
};
const selectedPreviewFrames = computed(() =>
  getPreviewFrames(selectedItem.value),
);
const isAnimationPlaying = computed(
  () =>
    Boolean(selectedItem.value?.previewPlaying) &&
    selectedPreviewFrames.value.length > 1,
);
const previewFramePosition = computed({
  get: () => Math.max(0, selectedItem.value?.previewFrameIndex || 0),
  set: (index) => {
    if (!selectedItem.value || !selectedPreviewFrames.value.length) return;
    selectedItem.value.previewPlaying = false;
    selectedItem.value.previewFrameIndex = Math.min(
      selectedPreviewFrames.value.length - 1,
      Math.max(0, Math.round(index)),
    );
  },
});
const getPreviewSource = (item) => {
  if (!item) return "";
  const previewFrames = getPreviewFrames(item);
  const resultIsAnimated =
    item.frameCount > 1 &&
    ["image/gif", "image/webp"].includes(item.outputs[0]?.type);
  if (item.previewPlaying && previewFrames.length) {
    if (!watermark.enabled && resultIsAnimated && item.resultPreviewUrl)
      return item.resultPreviewUrl;
    return item.previewUrl || "";
  }
  if (previewFrames.length) {
    const frameIndex = Math.min(
      previewFrames.length - 1,
      Math.max(0, item.previewFrameIndex),
    );
    return previewFrames[frameIndex].url;
  }
  if (watermark.enabled) return item.previewUrl || "";
  if (!item.resultPreviewUrl) return item.previewUrl || "";
  if (item.frameCount > 1 && !resultIsAnimated)
    return item.previewUrl || item.resultPreviewUrl;
  return item.resultPreviewUrl;
};
const isShowingResultPreview = (item, src) =>
  Boolean(
    src &&
    (src === item.resultPreviewUrl ||
      item.resultPreviewFrames.some((frame) => frame.url === src)),
  );
const getPreviewDimensions = (item, showingResult) => {
  if (showingResult) {
    return {
      width: item.outputWidth || item.width,
      height: item.outputHeight || item.height,
    };
  }
  return calculateOutputDimensions(item.width, item.height, settings.resize);
};
const previewSlides = computed(() =>
  queue.value.map((item) => {
    const src = getPreviewSource(item);
    const showingResult = isShowingResultPreview(item, src);
    const dimensions = getPreviewDimensions(item, showingResult);
    return {
      id: item.id,
      src,
      width: dimensions.width,
      height: dimensions.height,
      alt: item.file.name,
      preserveDeclaredDimensions:
        item.frameCount > 1 || (settings.resize.enabled && !showingResult),
      revision: `${item.previewNonce}:${item.previewPlaying ? "playing" : item.previewFrameIndex}:${src}`,
    };
  }),
);
const selectedPreviewDimensions = computed(
  () => previewSlides.value[selectedItemIndex.value] || null,
);
const previewIndex = computed({
  get: () => Math.max(0, selectedItemIndex.value),
  set: (index) => {
    const item = queue.value[index];
    if (item) selectedId.value = item.id;
  },
});
const readyItems = computed(() =>
  queue.value.filter((item) =>
    ["ready", "error", "cancelled"].includes(item.status),
  ),
);
const successfulItems = computed(() =>
  queue.value.filter((item) => item.status === "done"),
);
const canDownloadAll = computed(
  () =>
    !isLoadingFiles.value &&
    successfulItems.value.length > 0 &&
    queue.value.every((item) => ["done", "error"].includes(item.status)),
);
const conversionProgress = computed(() => {
  if (!queue.value.length) return 0;
  const totalProgress = queue.value.reduce((total, item) => {
    if (["done", "error"].includes(item.status)) return total + 100;
    return total + (item.status === "processing" ? item.progress : 0);
  }, 0);
  return Math.round(totalProgress / queue.value.length);
});
const hasAnimatedInput = computed(() =>
  queue.value.some((item) => item.frameCount > 1 || item.animated),
);
const hasQualityControl = computed(() =>
  ["jpeg", "webp", "avif"].includes(settings.format),
);
const staticOutput = computed(() => !["gif", "webp"].includes(settings.format));
const queueSummary = computed(
  () =>
    `${queue.value.length} 个文件 · ${successfulItems.value.length} 个已完成${queue.value.some((item) => item.status === "error") ? " · 含失败项目" : ""}`,
);

watch(
  [
    () => selectedItem.value?.id,
    () => selectedItem.value?.width,
    () => selectedItem.value?.height,
  ],
  syncResizeDimensionsFromPreview,
);

watch(
  [
    () => selectedItem.value?.id,
    () => selectedItem.value?.width,
    () => selectedItem.value?.height,
    () => settings.resize.enabled,
    () => settings.resize.mode,
    () => settings.resize.width,
    () => settings.resize.height,
    () => settings.resize.lockAspectRatio,
    () => settings.resize.preventUpscale,
    () => watermark.enabled,
    () => watermark.kind,
    () => watermark.text,
    () => watermark.fontId,
    () => watermark.fallbackFontId,
    () => watermark.file,
    () => watermark.graphicKind,
    () => watermark.icon,
    () => watermark.mode,
    () => watermark.position,
    () => watermark.opacity,
    () => watermark.scale,
    () => watermark.shadow,
    () => watermark.margin,
    () => watermark.offsetX,
    () => watermark.offsetY,
    () => watermark.gap,
    () => watermark.rotation,
    () => watermark.color,
  ],
  () => void renderWatermarkPreview(),
  { flush: "post" },
);

watch(
  [
    () => selectedItem.value?.id,
    () => selectedItem.value?.previewPlaying,
    () => selectedItem.value?.previewFrameIndex,
    () => selectedPreviewFrames.value,
  ],
  syncAnimationPreviewTimer,
  { flush: "post" },
);

function updateResizeDimension(dimension, value) {
  resizeDimensionsModified = true;
  settings.resize[dimension] = value === "" ? "" : Number(value);
  resizeAspectAnchor = dimension;
  if (settings.resize.lockAspectRatio) {
    settings.resize.mode = dimension;
    syncResizeAspectRatio(dimension);
  } else {
    settings.resize.mode = "exact";
  }
}

function syncResizeDimensionsFromPreview() {
  const item = selectedItem.value;
  if (resizeDimensionsModified || !item?.width || !item.height) return;
  settings.resize.width = item.width;
  settings.resize.height = item.height;
}

function toggleResizeAspectRatio() {
  settings.resize.lockAspectRatio = !settings.resize.lockAspectRatio;
  if (!settings.resize.lockAspectRatio) {
    settings.resize.mode = "exact";
    return;
  }
  settings.resize.mode = resizeAspectAnchor;
  syncResizeAspectRatio(resizeAspectAnchor);
}

function syncResizeAspectRatio(dimension) {
  const item = selectedItem.value;
  if (
    !settings.resize.enabled ||
    !settings.resize.lockAspectRatio ||
    !item?.width ||
    !item.height
  ) {
    return;
  }
  const value = Number(settings.resize[dimension]);
  if (!Number.isFinite(value) || value <= 0) return;
  const ratio = item.width / item.height;
  if (dimension === "height") {
    settings.resize.width = Math.max(1, Math.round(value * ratio));
  } else {
    settings.resize.height = Math.max(1, Math.round(value / ratio));
  }
}

onMounted(() => {
  void loadDefaultWatermark();
  collectRemixIcons();
  queueViewMode.value = window.matchMedia(SMALL_SCREEN_QUERY).matches
    ? "compact"
    : "detailed";
  worker.value = new Worker(
    new URL("../../workers/image-converter.worker.js", import.meta.url),
    { type: "module" },
  );
  worker.value.addEventListener("message", onWorkerMessage);
  worker.value.addEventListener("error", onWorkerError);
});

async function loadDefaultWatermark() {
  try {
    const response = await fetch(DEFAULT_WATERMARK_URL);
    if (!response.ok) return;
    const blob = await response.blob();
    const file = new File([blob], "favicon.webp", {
      type: blob.type || "image/webp",
    });
    defaultWatermarkFile.value = file;
    if (!watermark.file) watermark.file = file;
  } catch {
    // The picker remains available if the bundled favicon cannot be loaded.
  }
}

function collectRemixIcons() {
  const names = new Set(FEATURED_REMIX_ICONS);
  const visitRules = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) visitRules(rule.cssRules);
      for (const match of (rule.selectorText || "").matchAll(
        /\.ri-([\w-]+):{1,2}before/g,
      ))
        names.add(`ri-${match[1]}`);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visitRules(sheet.cssRules);
    } catch {
      // Cross-origin stylesheets are irrelevant to the bundled icon font.
    }
  }
  remixIcons.value = [...names].sort((a, b) => a.localeCompare(b));
}

async function resolveWatermarkFont(
  fontId = watermark.fontId,
  text = watermark.text,
  fallbackFontId = watermark.fallbackFontId,
) {
  const selector = watermarkFontSelect.value;
  if (!selector) throw new Error("字体选择器尚未就绪");
  return selector.resolveFont(fontId, text, 600, fallbackFontId);
}

function setWatermarkTextEnabled(event) {
  const enabled = event.target.checked;
  if (enabled && watermark.kind === "image") watermark.kind = "image-text";
  else if (!enabled) watermark.kind = "image";
}

function setWatermarkGraphicEnabled(graphicKind, event) {
  const enabled = event.target.checked;
  if (enabled) {
    watermark.graphicKind = graphicKind;
    if (watermark.kind === "text") watermark.kind = "image-text";
  } else if (watermark.graphicKind === graphicKind) {
    watermark.kind = "text";
  }
}

function watermarkNeedsGraphic(config = watermark) {
  return ["image", "image-text"].includes(config.kind);
}

function watermarkContainsText(config = watermark) {
  return ["text", "image-text"].includes(config.kind);
}

function watermarkUsesGraphicKind(graphicKind, config = watermark) {
  return watermarkNeedsGraphic(config) && config.graphicKind === graphicKind;
}

function usesWatermarkImageFile(config = watermark) {
  return watermarkUsesGraphicKind("image", config);
}

function currentWatermarkGraphicKey(config = watermark) {
  if (usesWatermarkImageFile(config)) return config.file;
  if (watermarkNeedsGraphic(config) && config.graphicKind === "icon")
    return `icon:${config.icon}:${config.color}`;
  return null;
}

async function getWatermarkGraphicSource(config = watermark) {
  const key = currentWatermarkGraphicKey(config);
  if (!key) return null;
  if (usesWatermarkImageFile(config)) return { key, blob: config.file };
  if (watermarkIconBlob && watermarkIconBlobKey === key)
    return { key, blob: watermarkIconBlob };
  const blob = await renderRemixIconBlob(config.icon, config.color);
  if (key !== currentWatermarkGraphicKey(config)) return null;
  watermarkIconBlob = blob;
  watermarkIconBlobKey = key;
  return { key, blob };
}

function isSvgWatermark(blob) {
  return (
    blob?.type?.split(";", 1)[0].toLowerCase() === "image/svg+xml" ||
    /\.svg$/i.test(blob?.name || "")
  );
}

function readSvgAspectRatio(svgText) {
  try {
    const root = new DOMParser().parseFromString(
      svgText,
      "image/svg+xml",
    ).documentElement;
    if (root.localName !== "svg") return null;
    const viewBox = root
      .getAttribute("viewBox")
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      viewBox?.length === 4 &&
      Number.isFinite(viewBox[2]) &&
      Number.isFinite(viewBox[3]) &&
      viewBox[2] > 0 &&
      viewBox[3] > 0
    )
      return viewBox[2] / viewBox[3];
    const width = Number.parseFloat(root.getAttribute("width"));
    const height = Number.parseFloat(root.getAttribute("height"));
    return width > 0 && height > 0 ? width / height : null;
  } catch {
    return null;
  }
}

function loadSvgWatermarkImage(blob) {
  const cached = svgWatermarkImagePromises.get(blob);
  if (cached) return cached;
  const promise = (async () => {
    const aspectRatio = readSvgAspectRatio(await blob.text());
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("无法读取 SVG 水印"));
        image.src = url;
      });
      if (aspectRatio) {
        image.width = Math.max(1, Math.round(aspectRatio * 1000));
        image.height = 1000;
      }
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
  svgWatermarkImagePromises.set(blob, promise);
  promise.catch(() => svgWatermarkImagePromises.delete(blob));
  return promise;
}

function createWatermarkDrawable(blob) {
  return isSvgWatermark(blob)
    ? loadSvgWatermarkImage(blob)
    : createImageBitmap(blob);
}

function rasterizeSvgWatermark(blob, size, scale) {
  let cache = svgWatermarkRasterPromises.get(blob);
  if (!cache) {
    cache = new Map();
    svgWatermarkRasterPromises.set(blob, cache);
  }
  const key = `${size.width}x${size.height}:${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const image = await loadSvgWatermarkImage(blob);
    const { width: stampWidth, height: stampHeight } =
      calculateWatermarkGraphicSize(size, scale, image.width, image.height);
    const density = Math.min(
      2,
      MAX_WATERMARK_STAMP_SIDE / stampWidth,
      MAX_WATERMARK_STAMP_SIDE / stampHeight,
      Math.sqrt(MAX_WATERMARK_STAMP_PIXELS / (stampWidth * stampHeight)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(stampWidth * density));
    canvas.height = Math.max(1, Math.ceil(stampHeight * density));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建 SVG 水印");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas, "无法生成 SVG 水印");
  })();
  cache.set(key, promise);
  while (cache.size > 3) cache.delete(cache.keys().next().value);
  promise.catch(() => cache.delete(key));
  return promise;
}

async function renderRemixIconBlob(icon, color) {
  await document.fonts?.load("200px remixicon");
  const element = document.createElement("i");
  element.className = icon;
  element.style.cssText =
    "position:fixed;inset:auto auto 0 0;opacity:0;pointer-events:none";
  document.body.append(element);
  let content;
  let fontFamily;
  try {
    const style = getComputedStyle(element, "::before");
    content = style.content;
    fontFamily = style.fontFamily || "remixicon";
  } finally {
    element.remove();
  }
  if (!content || ["none", "normal"].includes(content))
    throw new Error("无法读取 Remix Icon");
  const glyph = content
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
  const canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  context.font = `200px ${fontFamily}`;
  const metrics = context.measureText(glyph);
  const padding = 8;
  const glyphLeft = Math.max(0, metrics.actualBoundingBoxLeft);
  const glyphRight = Math.max(1, metrics.actualBoundingBoxRight);
  const glyphAscent = Math.max(1, metrics.actualBoundingBoxAscent);
  const glyphDescent = Math.max(0, metrics.actualBoundingBoxDescent);
  canvas.width = Math.ceil(glyphLeft + glyphRight) + padding * 2;
  canvas.height = Math.ceil(glyphAscent + glyphDescent) + padding * 2;
  context = canvas.getContext("2d");
  context.fillStyle = color || "#ffffff";
  context.font = `200px ${fontFamily}`;
  context.textBaseline = "alphabetic";
  context.fillText(glyph, padding + glyphLeft, padding + glyphAscent);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("无法生成 Remix Icon")),
      "image/png",
    ),
  );
}

onBeforeUnmount(() => {
  clearAnimationPreviewTimer();
  worker.value?.terminate();
  watermarkBitmap?.close?.();
  for (const item of queue.value) releaseItemUrls(item);
});

function setWatermarkPreviewCanvas(canvas) {
  if (canvas === watermarkPreviewCanvas.value) return;
  watermarkPreviewCanvas.value = canvas;
  if (canvas) void renderWatermarkPreview();
}

async function renderWatermarkPreview() {
  const version = ++previewRenderVersion;
  const item = selectedItem.value;
  const canvas = watermarkPreviewCanvas.value;
  if (!watermark.enabled || !item?.width || !item.height || !canvas) return;

  const targetSize = calculateOutputDimensions(
    item.width,
    item.height,
    settings.resize,
  );
  const previewScale = Math.min(
    1,
    1600 / Math.max(targetSize.width, targetSize.height),
  );
  const size = {
    width: Math.max(1, Math.round(targetSize.width * previewScale)),
    height: Math.max(1, Math.round(targetSize.height * previewScale)),
  };
  const previewWatermark = {
    ...watermark,
    margin: watermark.margin * previewScale,
    offsetX: watermark.offsetX * previewScale,
    offsetY: watermark.offsetY * previewScale,
    gap: watermark.gap * previewScale,
  };
  let bitmap = null;
  let transientBitmap = false;
  try {
    if (watermarkContainsText()) {
      const stamp = await renderTextWatermarkStamp(size);
      if (stamp) {
        bitmap = await createImageBitmap(stamp.blob);
        transientBitmap = true;
        Object.assign(previewWatermark, {
          preRenderedText: true,
          stampWidth: stamp.width,
          stampHeight: stamp.height,
        });
      }
    } else if (watermarkNeedsGraphic()) bitmap = await getWatermarkBitmap();
  } catch {
    bitmap = null;
  }
  if (version !== previewRenderVersion) {
    if (transientBitmap) bitmap?.close?.();
    return;
  }
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    if (transientBitmap) bitmap?.close?.();
    return;
  }
  context.clearRect(0, 0, size.width, size.height);
  drawImageWatermark(context, size, previewWatermark, bitmap);
  if (transientBitmap) bitmap?.close?.();
}

function renderTextWatermarkStamp(size) {
  const config = {
    kind: watermark.kind,
    text: watermark.text,
    fontId: watermark.fontId,
    fallbackFontId: watermark.fallbackFontId,
    color: watermark.color,
    scale: watermark.scale,
    file: watermark.file,
    graphicKind: watermark.graphicKind,
    icon: watermark.icon,
  };
  const graphicKey = currentWatermarkGraphicKey(config);
  const serializedGraphicKey =
    typeof graphicKey === "string"
      ? graphicKey
      : graphicKey
        ? `${graphicKey.name}:${graphicKey.size}:${graphicKey.lastModified}`
        : "";
  const key = JSON.stringify([
    size.width,
    size.height,
    config.kind,
    config.text,
    config.fontId,
    config.fallbackFontId,
    config.color,
    config.scale,
    serializedGraphicKey,
  ]);
  const cached = watermarkTextStampPromises.get(key);
  if (cached) return cached;
  const promise = createTextWatermarkStamp(size, config);
  watermarkTextStampPromises.set(key, promise);
  while (watermarkTextStampPromises.size > 3)
    watermarkTextStampPromises.delete(
      watermarkTextStampPromises.keys().next().value,
    );
  promise.catch(() => watermarkTextStampPromises.delete(key));
  return promise;
}

async function createTextWatermarkStamp(size, config) {
  const isCombined = config.kind === "image-text";
  const graphicSource = isCombined
    ? await getWatermarkGraphicSource(config)
    : null;
  const graphic = graphicSource
    ? await createWatermarkDrawable(graphicSource.blob)
    : null;
  if (isCombined && !graphic) return null;
  try {
    const { family, weight } = await resolveWatermarkFont(
      config.fontId,
      config.text,
      config.fallbackFontId,
    );
    const text = config.text || "远方之森";
    const fontSize = Math.round(calculateWatermarkBaseSize(size, config.scale));
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    if (!measureContext) throw new Error("浏览器无法创建文字水印");
    measureContext.font = `${weight} ${fontSize}px ${family}`;
    const metrics = measureContext.measureText(text);
    const textLeft = Math.max(0, metrics.actualBoundingBoxLeft || 0);
    const textRight = Math.max(
      1,
      metrics.actualBoundingBoxRight || metrics.width,
    );
    const textWidth = Math.max(1, textLeft + textRight);
    const textAscent = Math.max(
      1,
      metrics.actualBoundingBoxAscent || fontSize * 0.8,
    );
    const textDescent = Math.max(
      0,
      metrics.actualBoundingBoxDescent || fontSize * 0.2,
    );
    const textHeight = textAscent + textDescent;
    let graphicWidth = 0;
    let graphicHeight = 0;
    let contentGap = 0;
    if (isCombined) {
      const graphicSize = calculateWatermarkGraphicSize(
        size,
        config.scale,
        graphic.width,
        graphic.height,
      );
      graphicWidth = graphicSize.width;
      graphicHeight = graphicSize.height;
      contentGap = Math.max(4, fontSize * 0.35);
    }
    const contentWidth = graphicWidth + contentGap + textWidth;
    const contentHeight = Math.max(textHeight, graphicHeight);
    const padding = Math.max(2, Math.ceil(fontSize * 0.12));
    const stampWidth = Math.max(1, Math.ceil(contentWidth + padding * 2));
    const stampHeight = Math.max(1, Math.ceil(contentHeight + padding * 2));
    const renderScale = Math.min(
      1,
      MAX_WATERMARK_STAMP_SIDE / stampWidth,
      MAX_WATERMARK_STAMP_SIDE / stampHeight,
      Math.sqrt(MAX_WATERMARK_STAMP_PIXELS / (stampWidth * stampHeight)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(stampWidth * renderScale));
    canvas.height = Math.max(1, Math.ceil(stampHeight * renderScale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法创建文字水印");
    context.font = `${weight} ${fontSize * renderScale}px ${family}`;
    context.textBaseline = "alphabetic";
    context.fillStyle = config.color || "#ffffff";
    if (isCombined) {
      context.drawImage(
        graphic,
        padding * renderScale,
        (padding + (contentHeight - graphicHeight) / 2) * renderScale,
        graphicWidth * renderScale,
        graphicHeight * renderScale,
      );
    }
    context.fillText(
      text,
      (padding + graphicWidth + contentGap + textLeft) * renderScale,
      (padding + (contentHeight - textHeight) / 2 + textAscent) * renderScale,
    );
    const blob = await canvasToBlob(canvas, "无法生成文字水印");
    return { blob, width: stampWidth, height: stampHeight };
  } finally {
    graphic?.close?.();
  }
}

function canvasToBlob(canvas, errorMessage) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(errorMessage))),
      "image/png",
    ),
  );
}

async function getWatermarkBitmap() {
  const source = await getWatermarkGraphicSource();
  if (!source) return null;
  if (watermarkBitmap && watermarkBitmapKey === source.key)
    return watermarkBitmap;
  const bitmap = await createWatermarkDrawable(source.blob);
  if (source.key !== currentWatermarkGraphicKey()) {
    bitmap.close?.();
    return null;
  }
  watermarkBitmap?.close?.();
  watermarkBitmap = bitmap;
  watermarkBitmapKey = source.key;
  return bitmap;
}

async function addFiles(fileList) {
  const available = MAX_FILES - queue.value.length;
  const files = [...fileList].slice(0, Math.max(0, available));
  if (fileList.length > available)
    toast.warning(`单批最多 ${MAX_FILES} 个文件，超出的文件未添加`);
  if (!files.length) return;
  isLoadingFiles.value = true;
  loadedFileCount.value = 0;
  loadingFileTotal.value = files.length;
  try {
    for (const file of files) {
      try {
        await addFile(file);
      } catch (error) {
        toast.error(
          `${file.name}：${error instanceof Error ? error.message : "无法读取文件"}`,
        );
      } finally {
        loadedFileCount.value += 1;
      }
    }
  } finally {
    isLoadingFiles.value = false;
  }
}

async function addFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectImageFormat(bytes);
  if (!format) {
    toast.error(`${file.name} 不是受支持的图片格式`);
    return;
  }
  const item = {
    id: nextId++,
    file,
    format,
    previewUrl: URL.createObjectURL(file),
    resultPreviewUrl: null,
    width: 0,
    height: 0,
    frameCount: 1,
    animated: false,
    status: "reading",
    progress: 0,
    message: "正在读取图片信息",
    outputs: [],
    previewFrames: [],
    resultPreviewFrames: [],
    previewFrameIndex: -1,
    previewPlaying: true,
    resultSize: 0,
    outputWidth: 0,
    outputHeight: 0,
    outputFormat: null,
    previewNonce: 0,
  };
  queue.value.push(item);
  const queueItem = queue.value.at(-1);
  if (!selectedId.value) selectedId.value = queueItem.id;
  try {
    const metadata = await readMetadata(file, format, bytes);
    Object.assign(queueItem, metadata);
    const estimated = estimateDecodedBytes(
      queueItem.width,
      queueItem.height,
      queueItem.frameCount,
    );
    const limit = getDefaultMemoryLimit(navigator.userAgent);
    if (estimated > limit)
      Object.assign(queueItem, {
        status: "error",
        message: `预计解码占用 ${formatBytes(estimated)}，超过设备安全上限 ${formatBytes(limit)}`,
      });
    else {
      if (queueItem.frameCount > 1) {
        queueItem.message = "正在生成动画预览";
        await loadAnimationPreview(queueItem, bytes);
      }
      if (queue.value.includes(queueItem))
        Object.assign(queueItem, { status: "ready", message: "" });
    }
  } catch (error) {
    Object.assign(queueItem, {
      status: "error",
      message: error instanceof Error ? error.message : "无法读取图片",
    });
  }
}

async function loadAnimationPreview(item, bytes) {
  const jobId = `preview-${Date.now()}-${item.id}`;
  try {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    const result = await requestWorker(
      {
        type: "preview",
        jobId,
        buffer,
        sourceFormat: item.format,
        memoryLimit: getDefaultMemoryLimit(navigator.userAgent),
      },
      [buffer],
    );
    if (!queue.value.includes(item)) return;
    releasePreviewFrameUrls(item.previewFrames);
    item.previewFrames = createPreviewFrameUrls(result.previewFrames);
    item.previewFrameIndex = 0;
    item.previewNonce += 1;
  } catch {
    // 原图仍可由浏览器播放；仅在逐帧预览不可用时保留原生动画。
  }
}

async function readMetadata(file, format, bytes) {
  let dimensions = readImageDimensions(bytes, format);
  if (!dimensions && format === "avif") {
    const { default: decode } = await import("@jsquash/avif/decode");
    const image = await decode(bytes.buffer);
    if (image) dimensions = { width: image.width, height: image.height };
  }
  if (!dimensions?.width || !dimensions?.height)
    throw new Error("无法读取图片尺寸");
  const { width, height } = dimensions;
  let frameCount = 1;
  let animated = false;
  if (format === "gif") {
    const { parseGIF, decompressFrames } = await import("gifuct-js");
    frameCount = decompressFrames(parseGIF(bytes.buffer), false).length || 1;
    animated = frameCount > 1;
  } else if (format === "webp") {
    animated = isAnimatedWebP(bytes);
    frameCount = animated ? Math.max(1, countWebPFrames(bytes)) : 1;
  } else if (format === "avif") {
    const brand = new TextDecoder("ascii").decode(bytes.subarray(0, 64));
    animated = brand.includes("avis");
  }
  return { width, height, frameCount, animated };
}

async function startConversion() {
  if (!worker.value || isRunning.value) return;
  if (watermark.enabled && usesWatermarkImageFile() && !watermark.file) {
    toast.warning("请先选择水印图片");
    return;
  }
  isRunning.value = true;
  const batch = readyItems.value.slice();
  for (const item of batch) {
    if (!isRunning.value) break;
    await convertItem(item);
  }
  const failed = batch.filter((item) => item.status === "error").length;
  const cancelled = batch.filter((item) => item.status === "cancelled").length;
  isRunning.value = false;
  currentJobId.value = null;
  if (cancelled) toast.info("转换已取消");
  else if (failed === batch.length) toast.error("本批次转换全部失败");
  else if (failed) toast.warning(`转换完成，${failed} 个文件失败`);
  else if (batch.length) toast.success("图片转换完成");
}

async function convertItem(item) {
  releaseResultUrls(item);
  const jobSettings = structuredClone({
    ...settings,
    resize: { ...settings.resize },
    sourceWidth: item.width,
    sourceHeight: item.height,
  });
  Object.assign(item, {
    status: "processing",
    progress: 1,
    message: "准备处理",
    outputs: [],
    resultSize: 0,
    outputFormat: jobSettings.format,
  });
  const jobId = `${Date.now()}-${item.id}`;
  currentJobId.value = jobId;
  try {
    const watermarkPayload = await makeWatermarkPayload(item, jobSettings);
    const buffer = await item.file.arrayBuffer();
    const result = await requestWorker(
      {
        type: "convert",
        jobId,
        buffer,
        name: item.file.name,
        sourceFormat: item.format,
        sourceAnimatedHint: item.animated,
        settings: jobSettings,
        watermark: watermarkPayload,
        memoryLimit: getDefaultMemoryLimit(navigator.userAgent),
      },
      [buffer],
    );
    item.outputs = result.outputs.map((output) => ({
      ...output,
      blob: new Blob([output.buffer], { type: output.type }),
    }));
    releasePreviewFrameUrls(item.resultPreviewFrames);
    item.resultPreviewFrames = createPreviewFrameUrls(result.previewFrames);
    item.previewFrameIndex = 0;
    item.previewPlaying = true;
    item.resultSize = item.outputs.reduce(
      (sum, output) => sum + output.blob.size,
      0,
    );
    item.outputWidth = result.width;
    item.outputHeight = result.height;
    item.outputFormat = jobSettings.format;
    item.resultPreviewUrl = item.outputs.find((output) =>
      output.type.startsWith("image/"),
    )
      ? URL.createObjectURL(
          item.outputs.find((output) => output.type.startsWith("image/")).blob,
        )
      : null;
    item.status = "done";
    item.progress = 100;
    item.message = result.warnings?.join("；") || "转换完成";
  } catch (error) {
    if (error?.name === "AbortError")
      Object.assign(item, { status: "cancelled", message: "已取消" });
    else
      Object.assign(item, {
        status: "error",
        message: error instanceof Error ? error.message : "转换失败",
      });
  }
}

function requestWorker(message, transfer) {
  return new Promise((resolve, reject) => {
    pendingJobs.set(message.jobId, {
      resolve,
      reject,
      itemId: Number(message.jobId.split("-").at(-1)),
    });
    worker.value.postMessage(message, transfer);
  });
}

function onWorkerMessage({ data }) {
  const pending = pendingJobs.get(data.jobId);
  if (!pending) return;
  const item = queue.value.find((entry) => entry.id === pending.itemId);
  if (data.type === "progress") {
    if (item) {
      item.progress = data.value;
      item.message = data.stage;
    }
    return;
  }
  if (data.type === "metadata") {
    if (item) {
      item.width = data.width;
      item.height = data.height;
      item.frameCount = Math.max(item.frameCount, data.frames);
      item.animated = item.animated || data.animated;
    }
    return;
  }
  pendingJobs.delete(data.jobId);
  if (["result", "previewResult"].includes(data.type)) pending.resolve(data);
  else if (data.type === "cancelled")
    pending.reject(new DOMException("已取消", "AbortError"));
  else pending.reject(new Error(data.message || "转换失败"));
}

function onWorkerError(event) {
  const pending = currentJobId.value
    ? pendingJobs.get(currentJobId.value)
    : null;
  if (pending) {
    pendingJobs.delete(currentJobId.value);
    pending.reject(new Error(event.message || "图片处理线程异常"));
  }
}

function cancelConversion() {
  isRunning.value = false;
  if (currentJobId.value)
    worker.value?.postMessage({ type: "cancel", jobId: currentJobId.value });
}

async function makeWatermarkPayload(item, jobSettings) {
  const payload = { ...watermark, file: undefined };
  if (!watermark.enabled) return payload;
  if (watermarkContainsText()) {
    const outputSize = calculateOutputDimensions(
      item.width,
      item.height,
      jobSettings.resize,
    );
    const stamp = await renderTextWatermarkStamp(outputSize);
    if (stamp) {
      payload.buffer = await stamp.blob.arrayBuffer();
      payload.mime = stamp.blob.type || "image/png";
      payload.preRenderedText = true;
      payload.stampWidth = stamp.width;
      payload.stampHeight = stamp.height;
    }
  } else if (watermarkNeedsGraphic()) {
    const source = await getWatermarkGraphicSource();
    if (source) {
      const outputSize = calculateOutputDimensions(
        item.width,
        item.height,
        jobSettings.resize,
      );
      const blob = isSvgWatermark(source.blob)
        ? await rasterizeSvgWatermark(source.blob, outputSize, payload.scale)
        : source.blob;
      payload.buffer = await blob.arrayBuffer();
      payload.mime = blob.type || "image/png";
    }
  }
  return payload;
}

async function downloadItem(item) {
  if (item.outputs.length === 1)
    downloadBlob(item.outputs[0].blob, item.outputs[0].name);
  else
    downloadBlob(
      await createZip(item.outputs),
      `${baseName(item.file.name)}-${item.outputFormat}-frames.zip`,
    );
}

async function downloadAll() {
  const outputs = [];
  const usedNames = new Set();
  for (const item of successfulItems.value) {
    for (const output of item.outputs)
      outputs.push({ ...output, name: makeUniqueName(output.name, usedNames) });
  }
  if (outputs.length === 1) downloadBlob(outputs[0].blob, outputs[0].name);
  else
    downloadBlob(
      await createZip(outputs),
      `image-converter-${timestamp()}.zip`,
    );
}

async function createZip(outputs) {
  const { BlobReader, BlobWriter, ZipWriter } = await import("@zip.js/zip.js");
  const writer = new ZipWriter(new BlobWriter("application/zip"));
  for (const output of outputs)
    await writer.add(output.name, new BlobReader(output.blob), { level: 0 });
  return writer.close();
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function removeItem(id) {
  const index = queue.value.findIndex((item) => item.id === id);
  if (index < 0) return;
  releaseItemUrls(queue.value[index]);
  queue.value.splice(index, 1);
  if (!queue.value.length) resizeDimensionsModified = false;
  if (selectedId.value === id) selectedId.value = queue.value[0]?.id || null;
}

function clearQueue() {
  for (const item of queue.value) releaseItemUrls(item);
  resizeDimensionsModified = false;
  queue.value = [];
  selectedId.value = null;
}
function resetQueue() {
  for (const item of queue.value) {
    releaseResultUrls(item);
    Object.assign(item, {
      status: "ready",
      progress: 0,
      message: "",
      resultSize: 0,
      outputWidth: 0,
      outputHeight: 0,
      outputFormat: null,
      previewNonce: item.previewNonce + 1,
    });
  }
}
function retryItem(item) {
  item.status = "ready";
  item.message = "";
  startConversion();
}
function releaseItemUrls(item) {
  URL.revokeObjectURL(item.previewUrl);
  releasePreviewFrameUrls(item.previewFrames);
  item.previewFrames = [];
  releaseResultUrls(item);
}
function releaseResultUrls(item) {
  if (item.resultPreviewUrl) URL.revokeObjectURL(item.resultPreviewUrl);
  releasePreviewFrameUrls(item.resultPreviewFrames);
  item.resultPreviewUrl = null;
  item.outputs = [];
  item.resultPreviewFrames = [];
}
function releasePreviewFrameUrls(frames) {
  for (const frame of frames || []) URL.revokeObjectURL(frame.url);
}
function createPreviewFrameUrls(frames = []) {
  return frames.map((frame) => {
    const blob = new Blob([frame.buffer], { type: frame.type });
    return { ...frame, blob, url: URL.createObjectURL(blob) };
  });
}
function onFileInput(event) {
  addFiles(event.target.files);
  event.target.value = "";
}
function onDragEnter() {
  if (canAddFiles.value) dragging.value = true;
}
function onDrop(event) {
  dragging.value = false;
  if (canAddFiles.value) addFiles(event.dataTransfer.files);
}
function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget))
    dragging.value = false;
}
function onWatermarkFile(event) {
  watermark.file = event.target.files?.[0] || null;
}
function selectRemixIcon(icon) {
  watermark.icon = icon;
  iconSearch.value = "";
  closeIconPicker();
}
function closeIconPicker() {
  hideIconTooltip(true);
  if (iconPicker.value?.matches(":popover-open"))
    iconPicker.value.hidePopover();
}
function showIconTooltip(icon, event) {
  const tooltip = iconTooltip.value;
  if (!tooltip) return;
  if (iconTooltipOpenFrame) {
    cancelAnimationFrame(iconTooltipOpenFrame);
    iconTooltipOpenFrame = 0;
  }
  if (iconTooltipHideFrame) {
    cancelAnimationFrame(iconTooltipHideFrame);
    iconTooltipHideFrame = 0;
  }
  if (iconTooltipCloseTimer) {
    clearTimeout(iconTooltipCloseTimer);
    iconTooltipCloseTimer = 0;
  }
  const rect = event.currentTarget.getBoundingClientRect();
  tooltip.dataset.tip = icon;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 6}px`;
  if (!tooltip.matches(":popover-open")) {
    tooltip.classList.remove("tooltip-open");
    tooltip.showPopover();
    tooltip.setAttribute("aria-hidden", "false");
    iconTooltipOpenFrame = requestAnimationFrame(() => {
      iconTooltipOpenFrame = requestAnimationFrame(() => {
        iconTooltipOpenFrame = 0;
        if (tooltip.matches(":popover-open"))
          tooltip.classList.add("tooltip-open");
      });
    });
  } else tooltip.classList.add("tooltip-open");
  const tooltipWidth =
    Number.parseFloat(getComputedStyle(tooltip, "::before").width) || 0;
  const left = Math.min(
    window.innerWidth - tooltipWidth / 2 - 8,
    Math.max(tooltipWidth / 2 + 8, rect.left + rect.width / 2),
  );
  tooltip.style.left = `${left}px`;
}
function hideIconTooltip(immediate = false) {
  if (iconTooltipOpenFrame) {
    cancelAnimationFrame(iconTooltipOpenFrame);
    iconTooltipOpenFrame = 0;
  }
  if (iconTooltipHideFrame) {
    cancelAnimationFrame(iconTooltipHideFrame);
    iconTooltipHideFrame = 0;
  }
  if (iconTooltipCloseTimer) {
    clearTimeout(iconTooltipCloseTimer);
    iconTooltipCloseTimer = 0;
  }
  const hide = () => {
    iconTooltipHideFrame = 0;
    const tooltip = iconTooltip.value;
    if (!tooltip?.matches(":popover-open")) return;
    tooltip.classList.remove("tooltip-open");
    const close = () => {
      iconTooltipCloseTimer = 0;
      if (tooltip.matches(":popover-open")) tooltip.hidePopover();
      tooltip.setAttribute("aria-hidden", "true");
    };
    if (immediate) close();
    else iconTooltipCloseTimer = window.setTimeout(close, 300);
  };
  if (immediate) hide();
  else iconTooltipHideFrame = requestAnimationFrame(hide);
}
function toggleAnimation() {
  const item = selectedItem.value;
  if (!item || !selectedPreviewFrames.value.length) return;
  if (item.previewPlaying) item.previewPlaying = false;
  else {
    item.previewFrameIndex = 0;
    item.previewPlaying = true;
  }
}
function stepFrame(direction) {
  const item = selectedItem.value;
  const previewFrames = selectedPreviewFrames.value;
  if (!item || !previewFrames.length) return;
  item.previewPlaying = false;
  const current = Math.max(0, item.previewFrameIndex);
  item.previewFrameIndex =
    (current + direction + previewFrames.length) % previewFrames.length;
}

function clearAnimationPreviewTimer() {
  if (animationPreviewTimer === null) return;
  window.clearTimeout(animationPreviewTimer);
  animationPreviewTimer = null;
}

function syncAnimationPreviewTimer() {
  clearAnimationPreviewTimer();
  const item = selectedItem.value;
  const previewFrames = selectedPreviewFrames.value;
  if (!item?.previewPlaying || previewFrames.length < 2) return;

  const frameIndex = Math.min(
    previewFrames.length - 1,
    Math.max(0, item.previewFrameIndex),
  );
  animationPreviewTimer = window.setTimeout(
    () => {
      if (selectedItem.value?.id !== item.id || !item.previewPlaying) return;
      const currentFrames = getPreviewFrames(item);
      if (currentFrames.length < 2) return;
      item.previewFrameIndex = (frameIndex + 1) % currentFrames.length;
    },
    Math.max(10, Number(previewFrames[frameIndex]?.duration) || 100),
  );
}
function formatLabel(format) {
  return IMAGE_FORMATS[format]?.label || format.toUpperCase();
}
function queueTargetFormat(item) {
  return item.outputFormat || settings.format;
}
function targetFormatBadgeClass(item) {
  if (item.status === "done") return "badge-success";
  if (item.status === "error" && item.outputFormat) return "badge-error";
  return "badge-neutral";
}
function savingsLabel(item) {
  const rate = (1 - item.resultSize / item.file.size) * 100;
  return rate >= 0
    ? `节省 ${rate.toFixed(1)}%`
    : `增加 ${Math.abs(rate).toFixed(1)}%`;
}
function statusLabel(status) {
  return (
    {
      reading: "读取中",
      ready: "等待转换",
      processing: "处理中",
      done: "已完成",
      error: "失败",
      cancelled: "已取消",
    }[status] || status
  );
}
function statusIcon(status) {
  return {
    reading: "loading loading-spinner loading-sm",
    ready: "ri-time-line text-base-content/45",
    processing: "loading loading-spinner loading-sm",
    done: "ri-checkbox-circle-line text-success",
    error: "ri-error-warning-line text-error",
    cancelled: "ri-stop-circle-line text-base-content/50",
  }[status];
}
function positionLabel(position) {
  return {
    "top-left": "左上",
    "top-center": "中上",
    "top-right": "右上",
    "center-left": "左中",
    "center-center": "居中",
    "center-right": "右中",
    "bottom-left": "左下",
    "bottom-center": "中下",
    "bottom-right": "右下",
  }[position];
}
function baseName(name) {
  return name.replace(/\.[^.]*$/, "") || "image";
}
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
function countWebPFrames(bytes) {
  let count = 0;
  for (let index = 12; index + 8 <= bytes.length; ) {
    const type = String.fromCharCode(...bytes.subarray(index, index + 4));
    const size =
      (bytes[index + 4] |
        (bytes[index + 5] << 8) |
        (bytes[index + 6] << 16) |
        (bytes[index + 7] << 24)) >>>
      0;
    if (type === "ANMF") count += 1;
    index += 8 + size + (size & 1);
  }
  return count;
}
</script>

<style scoped>
.watermark-icon-tooltip:not(:popover-open) {
  display: none;
}

.image-checker {
  background-color: var(--color-base-100);
  background-image:
    linear-gradient(
      45deg,
      color-mix(in oklab, var(--color-base-content) 8%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      color-mix(in oklab, var(--color-base-content) 8%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      color-mix(in oklab, var(--color-base-content) 8%, transparent) 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      color-mix(in oklab, var(--color-base-content) 8%, transparent) 75%
    );
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}
</style>
