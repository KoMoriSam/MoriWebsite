import { nextTick, onMounted, onScopeDispose, watch } from "vue";
import { useThemeStore } from "@/stores/themeStore";

export function useThemeTransition() {
  const themes = useThemeStore();
  let transition;
  let revision = 0;

  // Storage restores before this hook. Keep the head script's first-paint theme
  // until the real preference is ready, without animating initialization.
  onMounted(() => watch(() => themes.resolvedTheme, (theme, previous) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const currentRevision = ++revision;
    transition?.skipTransition();
    transition = undefined;
    delete root.dataset.themeTransition;

    const applyTheme = () => {
      if (currentRevision !== revision) return;
      root.dataset.theme = theme;
      themes.applyTheme(theme);
    };
    if (!previous || document.hidden || !document.startViewTransition
      || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme();
      return;
    }

    root.dataset.themeTransition = "true";
    const current = document.startViewTransition(async () => {
      applyTheme();
      // Commit scroll fades before the new snapshot while rendering is paused.
      await nextTick();
      if (currentRevision === revision) document.dispatchEvent(new Event("mori:theme-change"));
      await nextTick();
    });
    transition = current;
    current.ready.catch(() => {});
    current.finished.catch(applyTheme).finally(() => {
      if (transition !== current) return;
      transition = undefined;
      delete root.dataset.themeTransition;
    });
  }, { immediate: true, flush: "post" }));

  onScopeDispose(() => {
    revision++;
    transition?.skipTransition();
    if (typeof document !== "undefined") delete document.documentElement.dataset.themeTransition;
  });
}
