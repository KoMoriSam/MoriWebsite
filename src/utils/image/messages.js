// Worker UI metadata; image processing and original diagnostics remain unchanged.
const messages = [
  {
    "key": "markdown.alert.error",
    "source": "错误"
  },
  {
    "key": "image.worker.decoding",
    "source": "正在解码"
  },
  {
    "key": "image.worker.encoding",
    "source": "正在编码"
  },
  {
    "key": "image.worker.processingFrame",
    "source": "正在处理 {p0}/{p1} 帧"
  },
  {
    "key": "image.worker.encodingFrame",
    "source": "正在编码 {p0}/{p1} 帧"
  },
  {
    "key": "image.worker.memoryLimit",
    "source": "预计解码占用 {p0}，超过当前设备 {p1} 的安全上限"
  },
  {
    "key": "image.worker.invalidSignature",
    "source": "文件签名与识别格式不一致"
  },
  {
    "key": "image.worker.decodeFailed",
    "source": "浏览器无法解码该 {p0} 文件：{p1}"
  },
  {
    "key": "common.errors.unknown",
    "source": "未知错误"
  },
  {
    "key": "image.worker.webpDecodeFailed",
    "source": "无法解码动画 WebP"
  },
  {
    "key": "image.worker.emptyGif",
    "source": "GIF 中没有可用帧"
  },
  {
    "key": "image.worker.encoderSignature",
    "source": "{p0} 编码器返回了错误的文件签名"
  },
  {
    "key": "image.worker.unsupportedFormat",
    "source": "不支持的静态输出格式"
  },
  {
    "key": "image.worker.webpEncodeFailed",
    "source": "WebP 编码失败"
  },
  {
    "key": "image.worker.firstFrameOnly",
    "source": "动画来源仅输出第一帧"
  },
  {
    "key": "image.worker.avifFrames",
    "source": "AVIF 不支持动画，已逐帧输出"
  },
  {
    "key": "image.worker.avifFirstFrame",
    "source": "AVIF 不支持动画，已输出第一帧"
  },
  {
    "key": "image.worker.avifInputFrame",
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
