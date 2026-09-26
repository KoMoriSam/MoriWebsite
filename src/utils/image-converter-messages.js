// Worker UI metadata; image processing and original diagnostics remain unchanged.
const messages = [
  {
    "key": "common.additional.error",
    "source": "错误"
  },
  {
    "key": "common.additional.decoding",
    "source": "正在解码"
  },
  {
    "key": "common.additional.encoding",
    "source": "正在编码"
  },
  {
    "key": "common.additional.processingFrame",
    "source": "正在处理 {p0}/{p1} 帧"
  },
  {
    "key": "common.additional.encodingFrame",
    "source": "正在编码 {p0}/{p1} 帧"
  },
  {
    "key": "common.additional.estimatedDecodingMemoryExceedsThisDeviceSSafeLimit",
    "source": "预计解码占用 {p0}，超过当前设备 {p1} 的安全上限"
  },
  {
    "key": "common.additional.fileSignatureDoesNotMatchItsFormat",
    "source": "文件签名与识别格式不一致"
  },
  {
    "key": "common.additional.yourBrowserCannotDecodeThisFile",
    "source": "浏览器无法解码该 {p0} 文件：{p1}"
  },
  {
    "key": "common.additional.unknownError",
    "source": "未知错误"
  },
  {
    "key": "common.additional.cannotDecodeAnimatedWebp",
    "source": "无法解码动画 WebP"
  },
  {
    "key": "common.additional.theGifContainsNoUsableFrames",
    "source": "GIF 中没有可用帧"
  },
  {
    "key": "common.additional.theEncoderReturnedAnInvalidFileSignature",
    "source": "{p0} 编码器返回了错误的文件签名"
  },
  {
    "key": "common.additional.unsupportedStaticOutputFormat",
    "source": "不支持的静态输出格式"
  },
  {
    "key": "common.additional.webpEncodingFailed",
    "source": "WebP 编码失败"
  },
  {
    "key": "common.additional.onlyTheFirstAnimationFrameWasExported",
    "source": "动画来源仅输出第一帧"
  },
  {
    "key": "common.additional.avifAnimationIsUnsupportedFramesWereExportedSeparately",
    "source": "AVIF 不支持动画，已逐帧输出"
  },
  {
    "key": "common.additional.avifAnimationIsUnsupportedTheFirstFrameWasExported",
    "source": "AVIF 不支持动画，已输出第一帧"
  },
  {
    "key": "common.additional.onlyTheFirstFrameOfAnimatedAvifIsCurrentlyProcessed",
    "source": "动画 AVIF 当前仅处理第一帧"
  }
];

const patterns = messages.map(({ key, source }) => {
  const parameters = [...source.matchAll(/\{(p\d+)\}/g)].map(match => match[1]);
  const expression = source.split(/\{p\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)');
  return { key, parameters, pattern: new RegExp(`^${expression}$`, 's') };
});

export function describeImageMessage(message) {
  if (typeof message !== 'string') return null;
  for (const { key, parameters, pattern } of patterns) {
    const match = message.match(pattern);
    if (match) return { key, params: Object.fromEntries(parameters.map((name, index) => [name, match[index + 1]])) };
  }
  return null;
}
