import { getCurrentInstance, onMounted, ref } from "vue";
import { useStorage } from "@vueuse/core";

export function useHydratedStorage(key, defaults) {
  const instance = getCurrentInstance();
  const ready = ref(
    !import.meta.env.SSR && (!instance || instance.isMounted),
  );
  if (instance && !instance.isMounted) {
    onMounted(() => { ready.value = true; });
  }
  const storage = useStorage(key, defaults, undefined, {
    initOnMounted: !ready.value,
    // Setup-time defaults must not overwrite saved preferences before hydration.
    eventFilter: (invoke) => { if (ready.value) invoke(); },
  });
  return { storage, ready };
}
