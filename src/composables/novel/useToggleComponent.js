import { useStorage } from "@vueuse/core";

export function useToggleComponent(storageKey, defaultComponent, components) {
  const currentComponent = useStorage(storageKey, defaultComponent);

  const toggleComponent = () => {
    const keys = Object.keys(components);
    const currentIndex = keys.indexOf(currentComponent.value);
    currentComponent.value = keys[(currentIndex + 1) % keys.length];
  };

  return {
    currentComponent,
    toggleComponent,
  };
}
