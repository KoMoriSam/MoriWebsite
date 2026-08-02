export const NAV_LINKS = [
  {
    name: "主页",
    icon: "ri-home-9",
    to: { name: "home" },
  },
  {
    name: "博客",
    icon: "ri-article",
    to: { name: "blog" },
  },
  {
    name: "小说",
    icon: "ri-book-3",
    to: { name: "novel" },
  },
  {
    name: "工具",
    icon: "ri-pencil-ruler-2",
    to: { name: "tools" },
  },
];

export const isNavigationLinkActive = (route, link) =>
  route.matched.some(
    (record) => (record.meta.navName || record.name) === link.to.name,
  );
