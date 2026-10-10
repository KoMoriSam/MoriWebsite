import { computed, onScopeDispose, shallowRef } from "vue";
import { useRouter } from "vue-router";

const pendingRoutes = new WeakMap();

function getPendingRoute(router) {
  if (!pendingRoutes.has(router)) pendingRoutes.set(router, shallowRef(null));
  return pendingRoutes.get(router);
}

export function useNavigationTarget(router = useRouter()) {
  const pendingRoute = getPendingRoute(router);
  return computed(() => pendingRoute.value || router.currentRoute.value);
}

export function useNavigationFeedback(router = useRouter()) {
  const pendingRoute = getPendingRoute(router);
  const failedRoute = shallowRef(null);
  const navigationRoot = (route) => route?.redirectedFrom || route;
  const isPending = (route) => pendingRoute.value &&
    navigationRoot(route) === navigationRoot(pendingRoute.value);

  const removeStart = router.beforeEach((to) => {
    pendingRoute.value = to;
    failedRoute.value = null;
  });
  const removeFinish = router.afterEach((to) => {
    if (isPending(to)) pendingRoute.value = null;
  });
  const removeError = router.onError((_error, to) => {
    if (!isPending(to)) return;
    pendingRoute.value = null;
    failedRoute.value = to;
  });

  onScopeDispose(() => {
    removeStart();
    removeFinish();
    removeError();
    pendingRoute.value = null;
  });

  function retry() {
    if (!failedRoute.value) return;
    // onError keeps failed navigation visible; callers need no unhandled rejection.
    return router.push(failedRoute.value.fullPath).catch(() => {});
  }

  return {
    isLoading: computed(() => pendingRoute.value !== null),
    failedRoute,
    reloadHref: computed(() => failedRoute.value ? router.resolve(failedRoute.value.fullPath).href : null),
    retry,
    dismissError: () => { failedRoute.value = null; },
  };
}
