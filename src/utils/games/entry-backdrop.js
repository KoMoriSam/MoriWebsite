function createPalette({ info, gold, ink }, lightTheme) {
  const coolWeight = lightTheme ? 0.7 : 0.85;
  const goldWeight = lightTheme ? 0.55 : 0.7;
  return {
    cool: info.map((value, index) => Math.round(value * coolWeight + ink[index] * (1 - coolWeight))),
    gold: gold.map((value, index) => Math.round(value * goldWeight + ink[index] * (1 - goldWeight))),
    ink,
  };
}

function paintGlow(context, rgba, x, y, radiusX, radiusY, color, opacity) {
  context.save();
  context.translate(x, y);
  context.scale(radiusX, radiusY);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, rgba(color, opacity));
  gradient.addColorStop(0.5, rgba(color, opacity * 0.5));
  gradient.addColorStop(1, rgba(color, 0));
  context.fillStyle = gradient;
  context.fillRect(-1, -1, 2, 2);
  context.restore();
}

function prepareLayer(context, { width, height, layerScale }) {
  context.setTransform(layerScale, 0, 0, layerScale, 0, 0);
  context.clearRect(0, 0, width, height);
}

export function createMoonMist({ context, layer, layerContext, state, rgba }) {
  return {
    createPalette,
    paint() {
      const { width, height, time } = state;
      prepareLayer(layerContext, state);
      paintGlow(layerContext, rgba, width * 0.87, height * 0.04, width * 0.62, height * 0.58, "cool", 0.21);
      for (let index = 0; index < 7; index++) {
        const x = width * (0.2 + index * 0.15) + Math.sin(time * 0.1 + index) * width * 0.1;
        const y = height * (0.4 + (index % 3) * 0.17);
        paintGlow(layerContext, rgba, x, y, width * 0.38, height * 0.13, "cool", 0.045);
      }
      const beam = layerContext.createLinearGradient(width * 0.9, 0, width * 0.3, height);
      beam.addColorStop(0, rgba("cool", 0.12));
      beam.addColorStop(1, rgba("cool", 0));
      layerContext.fillStyle = beam;
      layerContext.beginPath();
      layerContext.moveTo(width * 0.8, 0);
      layerContext.lineTo(width * 0.98, 0);
      layerContext.lineTo(width * 0.55, height);
      layerContext.lineTo(width * 0.02, height);
      layerContext.closePath();
      layerContext.fill();
      context.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, width, height);
    },
  };
}

export function createFurnaceDust({ context, layer, layerContext, state, rgba }) {
  const particles = Array.from({ length: 44 }, (_, index) => ({
    x: ((index * 61) % 101) / 101,
    y: index * 0.163,
    phase: index,
    color: index % 6 === 0 ? "gold" : "ink",
    size: 0.6 + (index % 3) * 0.4,
  }));
  return {
    createPalette,
    paint() {
      const { width, height, time } = state;
      prepareLayer(layerContext, state);
      paintGlow(layerContext, rgba, width * 0.92, height * 0.82, width * 0.47, height * 0.48, "gold", 0.23);
      for (let index = 0; index < 6; index++) {
        const progress = (time * 0.017 + index * 0.18) % 1;
        const x = width * (0.65 + Math.sin(index + time * 0.08) * 0.19);
        paintGlow(layerContext, rgba, x, height * (1 - progress), width * (0.16 + progress * 0.14), height * 0.18, "ink", 0.05 * (1 - progress));
      }
      context.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, width, height);
      for (const particle of particles) {
        const x = width * particle.x + Math.sin(time * 0.25 + particle.phase) * 8;
        const y = (((particle.y - time * 0.009) % 1.2 + 1.2) % 1.2 - 0.1) * height;
        context.fillStyle = rgba(particle.color, 0.12);
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
    },
  };
}
