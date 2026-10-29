import { onMounted } from "vue";
import { useLayoutMotion } from "./useLayoutMotion";

export function useAccordionTransition(group, panel, body, surface, viewport) {
  const motion = useLayoutMotion();
  const options = { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
  const sections = () => [...(group.value?.querySelectorAll(":scope > details") || [])];
  const desiredStates = new WeakMap();
  let switching = false;
  const isOpen = (section) => desiredStates.get(section) ?? section.open;

  function sync() {
    for (const section of sections()) {
      const content = section.querySelector(":scope > .collapse-content");
      const open = isOpen(section);
      section.dataset.accordionOpen = String(open);
      content.inert = !open;
      content.setAttribute("aria-hidden", String(!open));
      const summary = section.querySelector(":scope > summary");
      summary.setAttribute("aria-expanded", String(open));
      summary.style.setProperty("--accordion-arrow-transform", open
        ? "translateY(-50%) rotate(225deg)" : "translateY(-100%) rotate(45deg)");
    }
  }

  function capture() {
    const panelBounds = panel.value.getBoundingClientRect();
    const surfaceBounds = getComputedStyle(surface.value).visibility === "visible"
      ? surface.value.getBoundingClientRect() : panelBounds;
    const bodyBounds = body.value.getBoundingClientRect();
    const viewportBounds = viewport.value.getBoundingClientRect();
    return {
      panel: { top: surfaceBounds.top, left: surfaceBounds.left, width: surfaceBounds.width, height: surfaceBounds.height },
      body: bodyBounds,
      viewportHeight: Math.max(0, viewportBounds.height + viewportBounds.top - bodyBounds.top),
      sections: sections().map((element) => {
        const content = element.querySelector(":scope > .collapse-content");
        const window = content.querySelector(":scope > [data-accordion-window]");
        const mask = window.firstElementChild;
        const style = getComputedStyle(content);
        return {
          element, content, window, mask, open: isOpen(element), nativeOpen: element.open,
          rect: element.getBoundingClientRect(),
          windowAnimated: window.style.position === "absolute",
          visibleHeight: Math.max(0, Math.min(window.offsetHeight,
            window.offsetHeight + window.getBoundingClientRect().top - content.getBoundingClientRect().top - parseFloat(style.paddingTop))),
          windowWidth: window.offsetWidth,
          maskHeight: mask.offsetHeight,
          top: content.offsetTop,
          left: content.offsetLeft,
          width: content.offsetWidth,
          height: content.offsetHeight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          paddingTop: style.paddingTop,
        };
      }),
    };
  }

  function toggle(event) {
    const summary = event.target.closest("summary");
    if (event.defaultPrevented || !summary || !group.value.contains(summary)) return;
    const selected = summary.parentElement;
    if (selected.parentElement !== group.value) return;
    event.preventDefault();
    const opening = !isOpen(selected);
    const select = (immediate) => {
      for (const section of sections()) {
        const open = section === selected ? opening : opening ? false : isOpen(section);
        desiredStates.set(section, open);
        if (open || immediate) section.open = open;
      }
      sync();
    };
    if (!panel.value.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      motion.cancel();
      select(true);
      return;
    }

    const before = capture();
    switching = true;
    motion.cancel();
    motion.start();
    const pending = [];
    const animate = (element, frames, cleanup) => {
      const animation = new Animation(
        new KeyframeEffect(element, frames, { ...options, fill: "both" }),
        document.timeline,
      );
      pending.push({ animation, cleanup });
    };
    // Retain the actual closing content out of flow until its clip finishes.
    // No snapshots, cloned controls or per-frame height/grid calculations.
    const closing = before.sections.filter((item) => item.nativeOpen && (item.element !== selected || !opening));
    const restore = new Map();
    for (const item of closing) {
      restore.set(item.content, item.content.style.cssText);
      // An absolute grid item otherwise uses row 2 as its containing block,
      // adding the summary height a second time to offsetTop.
      Object.assign(item.content.style, {
        position: "absolute", gridArea: "auto", top: `${item.top}px`, left: `${item.left}px`,
        width: `${item.width}px`, height: `${item.height}px`,
        paddingBottom: item.paddingBottom, visibility: "visible",
      });
    }
    select(false);
    switching = false;
    const after = capture();
    const windowRestores = new Map();
    for (let index = 0; index < after.sections.length; index++) {
      const target = after.sections[index];
      const source = before.sections[index];
      if (!target.open && !closing.some((item) => item.element === target.element)) continue;
      windowRestores.set(target.element, {
        content: target.content.style.cssText,
        window: target.window.style.cssText,
        mask: target.mask.style.cssText,
      });
      if (target.open) Object.assign(target.content.style, {
        position: "relative", height: `${target.height}px`,
      });
      const full = target.open ? target : source;
      Object.assign(target.window.style, {
        position: "absolute", top: full.paddingTop, left: full.paddingLeft,
        width: `${full.windowWidth}px`, height: `${full.maskHeight + parseFloat(full.paddingBottom)}px`,
        contain: "strict", overflow: "hidden",
      });
      target.mask.style.height = `${full.maskHeight}px`;
    }

    if (before.panel.height && after.panel.height) {
      const panelStyle = panel.value.style.cssText;
      const windowHeight = Math.max(before.panel.height, after.panel.height);
      const viewportHeight = Math.max(before.viewportHeight, after.viewportHeight);
      const beforeHidden = viewportHeight - before.viewportHeight;
      const afterHidden = viewportHeight - after.viewportHeight;
      // Anchor positioning would otherwise relayout this top-layer popover
      // on every transform frame. Hold its resolved viewport placement.
      Object.assign(panel.value.style, {
        position: "fixed", positionAnchor: "auto", positionArea: "none",
        inset: "auto", margin: "0", top: `${after.panel.top}px`,
        left: `${after.panel.left}px`, width: `${after.panel.width}px`,
        height: `${windowHeight}px`,
        backgroundColor: "transparent", borderColor: "transparent",
        boxShadow: "none", overflow: "visible",
      });
      const background = surface.value;
      const backgroundStyle = background.style.cssText;
      const viewportStyle = viewport.value.style.cssText;
      viewport.value.style.height = `${viewportHeight}px`;
      background.style.visibility = "visible";
      animate(panel.value, [
        {
          transform: `translate(${before.panel.left - after.panel.left}px, ${before.panel.top - after.panel.top}px)`,
        },
        { transform: "translate(0, 0)" },
      ], () => { panel.value.style.cssText = panelStyle; });
      animate(background, [
        { transform: `scaleY(${before.panel.height / windowHeight})` },
        { transform: `scaleY(${after.panel.height / windowHeight})` },
      ], () => { background.style.cssText = backgroundStyle; });
      animate(viewport.value, [
        { transform: `translateY(${-beforeHidden}px)` },
        { transform: `translateY(${-afterHidden}px)` },
      ], () => { viewport.value.style.cssText = viewportStyle; });
      animate(body.value, [
        { transform: `translateY(${beforeHidden}px)` },
        { transform: `translateY(${afterHidden}px)` },
      ]);
    }
    for (let index = 0; index < after.sections.length; index++) {
      const source = before.sections[index];
      const target = after.sections[index];
      const shift = (source.rect.top - before.body.top) - (target.rect.top - after.body.top);
      if (Math.abs(shift) > 0.5) animate(target.element, [
        { transform: `translateY(${shift}px)` }, { transform: "translateY(0)" },
      ]);
      if (windowRestores.has(target.element)) {
        const start = source.windowAnimated ? source.visibleHeight
          : source.open ? source.maskHeight + parseFloat(source.paddingBottom) : 0;
        const fullHeight = target.window.offsetHeight;
        const end = target.open ? fullHeight : 0;
        const saved = windowRestores.get(target.element);
        animate(target.window, [
          { transform: `translateY(${Math.min(start, fullHeight) - fullHeight}px)` },
          { transform: `translateY(${end - fullHeight}px)` },
        ], () => {
          target.window.style.cssText = saved.window;
          target.mask.style.cssText = saved.mask;
          target.content.style.cssText = saved.content;
        });
        animate(target.mask, [
          { transform: `translateY(${fullHeight - Math.min(start, fullHeight)}px)` },
          { transform: `translateY(${fullHeight - end}px)` },
        ]);
      }
    }

    // All effects start together and hold their final frames until the whole
    // batch completes. Restore closing content before the anchored surface,
    // then remove every effect in one commit rather than one callback per layer.
    void panel.value.offsetHeight;
    const startTime = document.timeline.currentTime;
    const finished = Promise.all(pending.map(({ animation }) => animation.finished));
    for (const { animation } of pending) {
      animation.play();
      animation.startTime = startTime;
    }
    motion.track({
      finished,
      cancel: () => pending.forEach(({ animation }) => animation.cancel()),
    }, () => {
      for (const item of closing) {
        if (!switching && !isOpen(item.element)) item.element.open = false;
      }
      for (let index = pending.length - 1; index >= 0; index--) pending[index].cleanup?.();
      for (const item of closing) item.content.style.cssText = restore.get(item.content);
      // Resolve the restored anchor/layout while the final clips still apply.
      if (panel.value?.isConnected) void panel.value.offsetHeight;
      pending.forEach(({ animation }) => animation.cancel());
    });
  }

  onMounted(sync);
  return { toggle, sync, cancel: motion.cancel };
}
