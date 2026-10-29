import { ref } from "vue";
import { useViewportSection } from "@/composables/layout/useViewportSection";

export function useOpeningHeight() {
  const entrance = ref(null);
  const openingDivider = ref(null);
  const about = ref(null);
  const combineOpening = ref(false);
  const pixels = (value) => Number.parseFloat(value) || 0;
  const outerHeight = (element) => {
    const style = getComputedStyle(element);
    return element.getBoundingClientRect().height
      + pixels(style.marginTop) + pixels(style.marginBottom);
  };
  const opening = useViewportSection({
    observe: () => [entrance.value.firstElementChild, openingDivider.value, about.value],
    onResize: ({ availableHeight }) => {
      const content = entrance.value.firstElementChild;
      const style = getComputedStyle(entrance.value);
      const naturalHeight = outerHeight(content)
        + pixels(style.paddingTop) + pixels(style.paddingBottom)
        + outerHeight(openingDivider.value) + outerHeight(about.value);
      combineOpening.value = naturalHeight <= availableHeight;
    },
  });

  return { opening, entrance, openingDivider, about, combineOpening };
}
