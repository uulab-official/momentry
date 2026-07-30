type RouterLike = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
};

/** Keeps notification and deep-link screens from issuing an unhandled back action. */
export function goBackOrHome(router: RouterLike) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}
