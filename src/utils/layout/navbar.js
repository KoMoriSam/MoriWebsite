export function getNavbarScrollOffset() {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const rem = Number.parseFloat(style.fontSize) || 16;
  const navbar = document.querySelector("header.navbar");
  const height =
    navbar?.getBoundingClientRect().height ??
    Number.parseFloat(style.getPropertyValue("--navbar-height")) * rem;
  return height + 2 * rem;
}
