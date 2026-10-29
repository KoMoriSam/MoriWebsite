export function createPunctuationDrift({
  context,
  layer,
  layerContext,
  state,
  rgba,
}) {
  const marks = [
    "，",
    "。",
    "「",
    "」",
    "？",
    "！",
    "；",
    "：",
    "《",
    "》",
    "——",
    "、",
  ];
  const fontFamily =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-serif")
      .trim() || "serif";
  const particles = Array.from({ length: 25 }, (_, index) => ({
    mark: marks[index % marks.length],
    x: 0.32 + ((index * 43 + 17) % 71) / 100,
    y: index * 0.137,
    phase: index * 2.399,
    size: 18 + (index % 5) * 6,
    color: index % 4 === 0 ? "gold" : "green",
    opacity: 0.12 + (index % 3) * 0.035,
  }));
  const washes = [
    { x: 0.7, y: 0.25, radius: 0.44, phase: 0, color: "green", opacity: 0.1 },
    { x: 0.88, y: 0.6, radius: 0.36, phase: 2.2, color: "gold", opacity: 0.08 },
    {
      x: 0.53,
      y: 0.74,
      radius: 0.32,
      phase: 4.1,
      color: "green",
      opacity: 0.055,
    },
  ];

  function paintGradient() {
    const { width, height, layerScale, time, lightTheme } = state;
    layerContext.setTransform(layerScale, 0, 0, layerScale, 0, 0);
    layerContext.clearRect(0, 0, width, height);
    for (const wash of washes) {
      const x = width * (wash.x + Math.sin(time * 0.12 + wash.phase) * 0.07);
      const y = height * (wash.y + Math.cos(time * 0.1 + wash.phase) * 0.1);
      const radius =
        width * (wash.radius + Math.sin(time * 0.08 + wash.phase) * 0.025);
      const opacity = wash.opacity * (lightTheme ? 0.6 : 1);
      layerContext.save();
      layerContext.translate(x, y);
      layerContext.scale(radius, height * 0.55);
      const gradient = layerContext.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, rgba(wash.color, opacity));
      gradient.addColorStop(0.48, rgba(wash.color, opacity * 0.55));
      gradient.addColorStop(1, rgba(wash.color, 0));
      layerContext.fillStyle = gradient;
      layerContext.fillRect(-1, -1, 2, 2);
      layerContext.restore();
    }
    context.drawImage(
      layer,
      0,
      0,
      layer.width,
      layer.height,
      0,
      0,
      width,
      height,
    );
  }

  return {
    createPalette({ green, gold, ink }, lightTheme) {
      const goldWeight = lightTheme ? 0.55 : 0.7;
      return {
        green: lightTheme
          ? green.map((value, index) =>
              Math.round(value * 0.75 + ink[index] * 0.25),
            )
          : green,
        gold: gold.map((value, index) =>
          Math.round(value * goldWeight + ink[index] * (1 - goldWeight)),
        ),
      };
    },
    paint() {
      const { width, height, time } = state;
      paintGradient();
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const particle of particles) {
        const x =
          width * particle.x + Math.sin(time * 0.22 + particle.phase) * 18;
        const y =
          (((((particle.y - time * 0.008) % 1.2) + 1.2) % 1.2) - 0.1) * height;
        context.save();
        context.translate(x, y);
        context.rotate(Math.sin(time * 0.16 + particle.phase) * 0.18);
        context.font = `${particle.size}px ${fontFamily}`;
        context.fillStyle = rgba(particle.color, particle.opacity);
        context.fillText(particle.mark, 0, 0);
        context.restore();
      }
    },
  };
}
