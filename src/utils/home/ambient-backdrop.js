export function createAuroraGinkgo(
  { context, layer: aurora, layerContext: auroraContext, state, rgba },
  { desktopOffset = 0.15 } = {},
) {
  const LEAF_COUNT = 10;
  let width, height, auroraScale, time, desktopLayout, lightTheme;
  let seed = 317;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const leaves = Array.from({ length: LEAF_COUNT }, () => ({
    x: 0.47 + random() * 0.6,
    y: random(),
    size: 9 + random() * 12,
    phase: random() * Math.PI * 2,
    speed: 0.014 + random() * 0.016,
  }));
  function createPalette({ green, gold, ink }, lightTheme) {
    const goldWeight = lightTheme ? 0.55 : 0.7;
    return {
      green: lightTheme
        ? green.map((value, index) =>
            Math.round(value * 0.82 + ink[index] * 0.18),
          )
        : green,
      gold: gold.map((value, index) =>
        Math.round(value * goldWeight + ink[index] * (1 - goldWeight)),
      ),
      mist: ink.map((value, index) =>
        Math.round(
          lightTheme
            ? value * 0.2 + green[index] * 0.8
            : value * 0.8 + green[index] * 0.2,
        ),
      ),
    };
  }

  function paintAurora() {
    const ctx = auroraContext;
    const offset = desktopLayout ? desktopOffset : 0;
    ctx.setTransform(auroraScale, 0, 0, auroraScale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = lightTheme ? 0.85 : 0.55;
    const glow = ctx.createRadialGradient(
      width * (0.77 - offset),
      height * 0.18,
      0,
      width * (0.77 - offset),
      height * 0.18,
      width * 0.44,
    );
    glow.addColorStop(0, rgba("green", 0.09));
    glow.addColorStop(1, rgba("green", 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.filter = "blur(" + 15 * auroraScale + "px)";
    for (let layer = 0; layer < 5; layer++) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.9);
      gradient.addColorStop(0, rgba("green", 0));
      gradient.addColorStop(0.25, rgba("green", 0.16));
      gradient.addColorStop(0.5, rgba(layer % 2 ? "mist" : "green", 0.23));
      gradient.addColorStop(1, rgba("green", 0));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 16 + layer * 4;
      ctx.beginPath();
      for (let step = 0; step <= 80; step++) {
        const position = step / 80;
        const x = width * (0.26 - offset + position * 0.9);
        const y =
          height * (0.14 + layer * 0.065) +
          Math.sin(position * 6 + time * 0.22 + layer * 0.3) * height * 0.13 +
          Math.sin(position * 3 - time * 0.14) * height * 0.09;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    context.drawImage(
      aurora,
      0,
      0,
      aurora.width,
      aurora.height,
      0,
      0,
      width,
      height,
    );
  }

  function paintLeaves() {
    leaves.forEach((leaf, index) => {
      const y = (((leaf.y + time * leaf.speed) % 1.35) - 0.15) * height;
      const x =
        (leaf.x - (desktopLayout ? desktopOffset : 0)) * width +
        Math.sin(time * 0.5 + leaf.phase) * 22 -
        y * 0.09;
      const size = leaf.size;
      context.save();
      context.translate(x, y);
      context.rotate(Math.sin(time * 0.6 + leaf.phase) * 0.8 + leaf.phase);
      context.scale(
        0.55 + Math.abs(Math.sin(time * 0.35 + leaf.phase)) * 0.45,
        1,
      );
      context.fillStyle = rgba("gold", 0.27 + (index % 3) * 0.1);
      context.beginPath();
      context.moveTo(0, size * 0.55);
      context.quadraticCurveTo(-size * 0.32, -size * 0.15, -size, -size * 0.65);
      context.bezierCurveTo(
        -size * 0.58,
        -size * 1.06,
        -size * 0.18,
        -size * 0.93,
        0,
        -size * 0.78,
      );
      context.bezierCurveTo(
        size * 0.18,
        -size * 0.93,
        size * 0.58,
        -size * 1.06,
        size,
        -size * 0.65,
      );
      context.quadraticCurveTo(size * 0.32, -size * 0.15, 0, size * 0.55);
      context.fill();
      context.strokeStyle = rgba("gold", 0.4);
      context.lineWidth = 0.6;
      for (let vein = -2; vein <= 2; vein++) {
        context.beginPath();
        context.moveTo(0, size * 0.55);
        context.quadraticCurveTo(
          vein * size * 0.1,
          -size * 0.15,
          vein * size * 0.36,
          -size * 0.77,
        );
        context.stroke();
      }
      context.beginPath();
      context.moveTo(0, size * 0.48);
      context.lineTo(size * 0.08, size);
      context.stroke();
      context.restore();
    });
  }

  return {
    createPalette,
    paint() {
      ({
        width,
        height,
        layerScale: auroraScale,
        time,
        desktopLayout,
        lightTheme,
      } = state);
      paintAurora();
      paintLeaves();
    },
  };
}
