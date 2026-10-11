const THEME_COLORS = [
  "primary",
  "secondary",
  "accent",
  "info",
  "success",
  "warning",
  "error",
];
const imageColors = new Map();
const SAMPLE_SIZE = 64;
const CACHE_LIMIT = 128;
let colorContext;
export const playerAvatarColorsKey = Symbol("player-avatar-colors");

function linearChannel(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  const linear = color.map(linearChannel);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

// Oklab 转换矩阵：https://bottosson.github.io/posts/oklab/
function rgbToOklch(color) {
  const [red, green, blue] = color.map(linearChannel);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const chroma = Math.hypot(a, b);
  const hue = chroma < 0.000004 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  return { lightness, chroma, hue };
}

function oklchToLinear(lightness, chroma, hue) {
  const angle = hue * Math.PI / 180;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function fitOklch(lightness, original) {
  const inGamut = (channels) => channels.every((value) => value >= -1e-7 && value <= 1 + 1e-7);
  let chroma = original.chroma;
  let linear = oklchToLinear(lightness, chroma, original.hue);
  if (!inGamut(linear)) {
    let low = 0;
    let high = chroma;
    for (let step = 0; step < 16; step++) {
      const middle = (low + high) / 2;
      if (inGamut(oklchToLinear(lightness, middle, original.hue))) low = middle;
      else high = middle;
    }
    chroma = low;
    linear = oklchToLinear(lightness, chroma, original.hue);
  }
  const luminance = Math.min(1, Math.max(0,
    linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722,
  ));
  return { lightness, chroma, hue: original.hue, luminance };
}

export function getContrastingAvatarColor(color, element, minimum = 4.5) {
  if (!color || !element || typeof document === "undefined") return color;
  if (!colorContext) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    colorContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!colorContext) return color;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  element.appendChild(probe);
  let foreground;
  let backgrounds;
  let themeLightness;
  try {
    const resolve = (value) => {
      probe.style.color = value;
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = getComputedStyle(probe).color;
      colorContext.fillRect(0, 0, 1, 1);
      return Array.from(colorContext.getImageData(0, 0, 1, 1).data);
    };
    foreground = color.match(/^rgb\((\d+) (\d+) (\d+)\)$/)?.slice(1).map(Number) ||
      resolve(color).slice(0, 3);
    themeLightness = rgbToOklch(resolve("var(--color-primary)").slice(0, 3)).lightness;
    const base = resolve("var(--color-base-100)").slice(0, 3);
    const surfaces = [];
    for (let node = element; node; node = node.parentElement) {
      const surface = resolve(getComputedStyle(node).backgroundColor);
      if (surface[3]) surfaces.push(surface);
      if (surface[3] === 255) break;
    }
    let backdrop = base;
    for (const surface of surfaces.reverse()) {
      const alpha = surface[3] / 255;
      backdrop = backdrop.map((channel, index) =>
        surface[index] * alpha + channel * (1 - alpha),
      );
    }
    backgrounds = [backdrop, base];
    backgrounds = backgrounds.map(luminance);
  } finally {
    probe.remove();
  }
  const contrast = (value) => Math.min(...backgrounds.map((background) =>
      (Math.max(value, background) + 0.05) / (Math.min(value, background) + 0.05),
  ));
  const original = rgbToOklch(foreground);
  let best = null;
  let smallestChange = Infinity;
  let fallback = null;
  let highestContrast = 0;
  // 明度跟随主题主色，色相保留头像原色；仅在超出 sRGB 色域时收缩彩度。
  const lightnesses = [themeLightness, ...Array.from({ length: 101 }, (_, step) => step / 100)];
  for (const lightness of lightnesses) {
    const candidate = fitOklch(lightness, original);
    const ratio = contrast(candidate.luminance);
    const change = Math.abs(lightness - themeLightness);
    if (ratio > highestContrast) {
      fallback = candidate;
      highestContrast = ratio;
    }
    if (ratio >= minimum && change < smallestChange) {
      best = candidate;
      smallestChange = change;
    }
  }
  const result = best || fallback;
  return result ? `oklch(${result.lightness} ${result.chroma} ${original.hue})` : color;
}

export function avatarThemeIndex(name) {
  let hash = 2166136261;
  for (const character of name.trim().normalize("NFC")) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  }
  return (hash >>> 0) % THEME_COLORS.length;
}

export function avatarThemeColor(name, index = avatarThemeIndex(name)) {
  const color = `var(--color-${THEME_COLORS[index % THEME_COLORS.length]})`;
  const variation = Math.floor(index / THEME_COLORS.length);
  return variation
    ? `color-mix(in oklab, ${color} ${Math.max(30, 100 - variation * 25)}%, var(--color-base-content))`
    : color;
}

export function assignPlayerAvatarColors(players, previous = new Map()) {
  const assignments = new Map();
  const occupied = new Set();
  for (const player of players) {
    if (!previous.has(player.id)) continue;
    const index = previous.get(player.id);
    assignments.set(player.id, index);
    occupied.add(index);
  }
  for (const player of players) {
    if (assignments.has(player.id)) continue;
    const preferred = avatarThemeIndex(player.nickname);
    let index;
    for (let offset = 0; offset < THEME_COLORS.length; offset++) {
      const candidate = (preferred + offset) % THEME_COLORS.length;
      if (!occupied.has(candidate)) {
        index = candidate;
        break;
      }
    }
    if (index === undefined) {
      index = THEME_COLORS.length;
      while (occupied.has(index)) index++;
    }
    assignments.set(player.id, index);
    occupied.add(index);
  }
  return assignments;
}

function colorDistance(first, second) {
  return first.reduce((sum, channel, index) =>
    sum + (channel - second[index]) ** 2,
  0);
}

function avatarForeground(pixels, width, height) {
  const count = pixels.length / 4;
  const visible = new Uint8Array(count);
  const edge = [];
  const groups = [];
  const band = Math.max(1, Math.floor(Math.min(width, height) / 16));
  let visibleCount = 0;
  const colorAt = (pixel) => Array.from(pixels.subarray(pixel * 4, pixel * 4 + 3));
  for (let pixel = 0; pixel < count; pixel++) {
    if (pixels[pixel * 4 + 3] < 128) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    visible[pixel] = 1;
    visibleCount++;
    const horizontalEdge = x < band || x >= width - band;
    const verticalEdge = y < band || y >= height - band;
    if (!horizontalEdge && !verticalEdge) continue;
    edge.push(pixel);
    const color = colorAt(pixel);
    let closest = null;
    let distance = 48 ** 2;
    for (const group of groups) {
      const difference = colorDistance(color, group.color);
      if (difference < distance) {
        closest = group;
        distance = difference;
      }
    }
    if (!closest) {
      closest = { color, count: 1, corners: new Set() };
      groups.push(closest);
    } else {
      closest.color = closest.color.map((channel, index) =>
        (channel * closest.count + color[index]) / (closest.count + 1),
      );
      closest.count++;
    }
    if (horizontalEdge && verticalEdge)
      closest.corners.add((x < band ? 0 : 1) + (y < band ? 0 : 2));
  }
  // 以原图外边界和角落识别背景，圆形裁切边缘可能穿过主体。
  const background = groups.sort((a, b) =>
    b.count * (1 + b.corners.size * 0.5) - a.count * (1 + a.corners.size * 0.5),
  )[0];
  if (!background || background.count < edge.length * 0.35) return visible;
  const removed = new Uint8Array(count);
  const queue = [];
  for (const pixel of edge) {
    if (colorDistance(colorAt(pixel), background.color) <= 60 ** 2) {
      removed[pixel] = 1;
      queue.push(pixel);
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixel = queue[cursor];
    const color = colorAt(pixel);
    const neighbours = [pixel - width, pixel + width];
    if (pixel % width) neighbours.push(pixel - 1);
    if (pixel % width < width - 1) neighbours.push(pixel + 1);
    for (const next of neighbours) {
      if (next < 0 || next >= count || !visible[next] || removed[next]) continue;
      const nextColor = colorAt(next);
      if (colorDistance(nextColor, background.color) > 60 ** 2 ||
          colorDistance(nextColor, color) > 40 ** 2) continue;
      removed[next] = 1;
      queue.push(next);
    }
  }
  // 纯色或几乎无独立前景的图片保留原色，避免改用无关的主题色。
  if (visibleCount - queue.length < Math.max(1, visibleCount * 0.02)) return visible;
  return visible.map((value, pixel) => value && !removed[pixel] ? 1 : 0);
}

export function dominantPixelColor(pixels, width = SAMPLE_SIZE) {
  const buckets = new Map();
  const height = pixels.length / 4 / width;
  const foreground = avatarForeground(pixels, width, height);
  for (let index = 0; index < pixels.length; index += 4) {
    if (!foreground[index / 4]) continue;
    const alpha = pixels[index + 3] / 255;
    if (alpha < 0.5) continue;
    const pixel = index / 4;
    const x = ((pixel % width) + 0.5) / width * 2 - 1;
    const y = (Math.floor(pixel / width) + 0.5) / height * 2 - 1;
    const radiusSquared = x * x + y * y;
    if (radiusSquared > 1) continue;
    const weight = alpha * (1 - radiusSquared * 0.25);
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const key = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { weight: 0, color: [0, 0, 0], samples: [] };
      buckets.set(key, bucket);
    }
    bucket.weight += weight;
    bucket.color[0] += red * weight;
    bucket.color[1] += green * weight;
    bucket.color[2] += blue * weight;
    bucket.samples.push([red, green, blue]);
  }
  const clusters = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.weight - a.weight)) {
    const color = bucket.color.map((channel) => channel / bucket.weight);
    let closest = null;
    let distance = 48 ** 2;
    for (const cluster of clusters) {
      const difference = color.reduce(
        (sum, channel, index) => sum + (channel - cluster.color[index]) ** 2,
        0,
      );
      if (difference < distance) {
        closest = cluster;
        distance = difference;
      }
    }
    if (!closest) {
      clusters.push({ color, weight: bucket.weight, samples: bucket.samples });
      continue;
    }
    const combined = closest.weight + bucket.weight;
    closest.color = closest.color.map(
      (channel, index) =>
        (channel * closest.weight + bucket.color[index]) / combined,
    );
    closest.weight = combined;
    closest.samples.push(...bucket.samples);
  }
  for (const cluster of clusters) {
    // 前景面积为主，温和提升有彩度的主色，避免肤色/近白色压过头发等主体配色。
    const chroma = rgbToOklch(cluster.color).chroma;
    cluster.score = cluster.weight * (0.5 + 0.5 * Math.min(chroma / 0.08, 1));
  }
  clusters.sort((a, b) => b.score - a.score);
  const dominant = clusters[0];
  if (!dominant) return null;
  dominant.samples.sort((a, b) =>
    colorDistance(a, dominant.color) - colorDistance(b, dominant.color),
  );
  return `rgb(${dominant.samples[0].join(" ")})`;
}

export function getAvatarImageColor(src) {
  if (!src || typeof Image === "undefined" || typeof document === "undefined")
    return Promise.resolve(null);
  if (imageColors.has(src)) return imageColors.get(src);
  const color = new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    const finish = (value) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 5000);
    image.onerror = () => finish(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return finish(null);
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(
          image,
          (image.naturalWidth - size) / 2,
          (image.naturalHeight - size) / 2,
          size,
          size,
          0,
          0,
          SAMPLE_SIZE,
          SAMPLE_SIZE,
        );
        finish(
          dominantPixelColor(
            context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data,
          ),
        );
      } catch {
        finish(null);
      }
    };
    image.src = src;
  });
  if (imageColors.size >= CACHE_LIMIT)
    imageColors.delete(imageColors.keys().next().value);
  imageColors.set(src, color);
  return color;
}
