import { onBeforeUnmount } from "vue";

export const usePaginationScheduler = ({
  measure,
  isFrozen = () => false,
  onInvalidate = () => {},
  viewportDelay = 120,
}) => {
  let measureFrame = 0;
  let viewportTimer;
  let delayedTimer;
  let running = false;
  let queued = false;

  const runMeasure = async () => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      await measure();
    } finally {
      running = false;
      if (queued && !isFrozen()) {
        queued = false;
        scheduleMeasure();
      }
    }
  };

  const scheduleMeasure = () => {
    if (isFrozen() || running) {
      queued = true;
      return;
    }

    queued = false;
    if (measureFrame) window.cancelAnimationFrame(measureFrame);
    measureFrame = window.requestAnimationFrame(() => {
      measureFrame = 0;
      void runMeasure();
    });
  };

  const scheduleFreshMeasure = () => {
    onInvalidate();
    scheduleMeasure();
  };

  const scheduleViewportMeasure = () => {
    if (isFrozen()) return;
    window.clearTimeout(viewportTimer);
    viewportTimer = window.setTimeout(scheduleMeasure, viewportDelay);
  };

  const scheduleDelayedMeasure = (delay) => {
    window.clearTimeout(delayedTimer);
    delayedTimer = window.setTimeout(scheduleMeasure, delay);
  };

  const requestRerun = () => {
    queued = true;
  };

  const cancelPending = ({ invalidate = false } = {}) => {
    window.clearTimeout(viewportTimer);
    window.clearTimeout(delayedTimer);
    if (measureFrame) window.cancelAnimationFrame(measureFrame);
    measureFrame = 0;
    if (invalidate) onInvalidate();
  };

  onBeforeUnmount(() => cancelPending({ invalidate: true }));

  return {
    cancelPending,
    isRunning: () => running,
    requestRerun,
    scheduleDelayedMeasure,
    scheduleFreshMeasure,
    scheduleMeasure,
    scheduleViewportMeasure,
  };
};
