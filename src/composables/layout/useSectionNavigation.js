import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, toValue, watch } from "vue";

export function useSectionNavigation(sections) {
  const readSections = () => toValue(sections) || [];
  const activeSection = ref(readSections()[0]?.id);
  const sectionPosition = ref(0);
  const sectionSpan = ref(0);
  let dispose = () => {};
  let activate = () => {};
  let deactivate = () => {};
  let refreshTargets = () => {};
  let navigationTarget;
  let scheduleNavigationUpdate = () => {};

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    navigationTarget = id;
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    scheduleNavigationUpdate();
  }

  function scrollToRandomSection() {
    const candidates = readSections().filter((section, index) =>
      index > 0 && section.id !== activeSection.value && document.getElementById(section.id),
    );
    if (candidates.length) {
      scrollToSection(candidates[Math.floor(Math.random() * candidates.length)].id);
    }
  }

  onMounted(() => {
    let targets = [];
    let frame = 0;
    let active = true;

    function updateActiveSection() {
      frame = 0;
      if (!active || !targets.length) return;
      const threshold = Math.min(window.innerHeight * 0.3, 240);
      const positions = targets.map(({ element }) => element.getBoundingClientRect().top);
      let currentIndex = 0;
      for (let index = 0; index < targets.length; index++) {
        if (positions[index] <= threshold) currentIndex = index;
      }
      const root = document.scrollingElement || document.documentElement;
      if (root.scrollHeight > root.clientHeight
        && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        currentIndex = targets.length - 1;
      }
      const alignedIndices = positions.flatMap((position, index) =>
        Math.abs(position - positions[currentIndex]) < 1 ? [index] : [],
      );
      if (alignedIndices.length > 1) {
        currentIndex = alignedIndices.find((index) => targets[index].id === navigationTarget)
          ?? alignedIndices.find((index) => targets[index].id === activeSection.value)
          ?? alignedIndices[0];
      }
      const firstIndex = alignedIndices[0];
      const lastIndex = alignedIndices[alignedIndices.length - 1];
      const nextIndex = lastIndex + 1;
      let nextLastIndex = nextIndex;
      while (nextLastIndex + 1 < positions.length
        && Math.abs(positions[nextLastIndex + 1] - positions[nextIndex]) < 1) {
        nextLastIndex++;
      }
      const start = positions[firstIndex];
      const end = positions[nextIndex];
      const progress = end > start ? Math.max(0, Math.min(1, (threshold - start) / (end - start))) : 0;
      activeSection.value = targets[currentIndex].id;
      sectionPosition.value = firstIndex + (nextIndex - firstIndex) * progress;
      sectionSpan.value = (lastIndex - firstIndex) * (1 - progress)
        + (nextLastIndex - nextIndex) * progress;
    }

    function scheduleUpdate() {
      if (active && !frame) frame = requestAnimationFrame(updateActiveSection);
    }
    scheduleNavigationUpdate = scheduleUpdate;

    const observer = new ResizeObserver(scheduleUpdate);
    refreshTargets = () => {
      observer.disconnect();
      targets = readSections().flatMap((section) => {
        const element = document.getElementById(section.id);
        return element ? [{ id: section.id, element }] : [];
      });
      targets.forEach(({ element }) => observer.observe(element));
      updateActiveSection();
    };
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    activate = () => {
      active = true;
      refreshTargets();
    };
    deactivate = () => {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    refreshTargets();

    dispose = () => {
      deactivate();
      refreshTargets = () => {};
      scheduleNavigationUpdate = () => {};
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  });

  watch(() => readSections().map(({ id }) => id).join("|"), () => refreshTargets(), { flush: "post" });
  onActivated(() => activate());
  onDeactivated(() => deactivate());
  onBeforeUnmount(() => dispose());
  return { activeSection, sectionPosition, sectionSpan, scrollToSection, scrollToRandomSection };
}
